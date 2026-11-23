"""Audit the built public HTML, sitemap, metadata and internal links offline."""
import json
import os
import struct
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
ORIGIN = 'https://showmestatutes.org'
SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
SITEMAP_MAX_URLS = 10_000
SITEMAP_MAX_BYTES = 10 * 1024 * 1024


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.title = ''
        self.in_title = False
        self.in_schema = False
        self.schema_text = ''
        self.schemas = []
        self.breadcrumb_depth = 0
        self.breadcrumb_current_count = 0
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if tag == 'title':
            self.in_title = True
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.in_schema = True
            self.schema_text = ''
        if tag == 'nav' and ('breadcrumbs' in attrs.get('class', '').split() or self.breadcrumb_depth > 0):
            self.breadcrumb_depth += 1
        if self.breadcrumb_depth > 0 and attrs.get('aria-current') == 'page':
            self.breadcrumb_current_count += 1

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'script' and self.in_schema:
            self.schemas.append(json.loads(self.schema_text))
            self.in_schema = False
        if tag == 'nav' and self.breadcrumb_depth > 0:
            self.breadcrumb_depth -= 1

    def handle_data(self, value):
        if self.in_title:
            self.title += value
        if self.in_schema:
            self.schema_text += value


def resolve_dataset_path(dataset_path=None):
    if dataset_path is not None:
        path = Path(dataset_path)
    else:
        env_path = os.environ.get('STATUTES_DATASET')
        path = Path(env_path) if env_path else Path('public/data/statutes.json')
    return path if path.is_absolute() else ROOT / path


def validate_accessibility(doc, relative):
    assert any(t == 'html' and a.get('lang') == 'en' for t, a in doc.tags), f'Missing lang="en": {relative}'
    assert any(t == 'meta' and a.get('name') == 'viewport' and a.get('content') for t, a in doc.tags), f'Missing viewport meta: {relative}'
    assert any('skip-link' in a.get('class', '').split() for _, a in doc.tags), f'Missing .skip-link: {relative}'
    assert any(t == 'header' for t, _ in doc.tags), f'Missing <header>: {relative}'
    navs = [a for t, a in doc.tags if t == 'nav']
    assert navs and all(a.get('aria-label') for a in navs), f'Missing <nav aria-label=...>: {relative}'
    assert len([t for t, _ in doc.tags if t == 'main']) == 1, f'Expected exactly one <main>: {relative}'
    assert len([t for t, _ in doc.tags if t == 'h1']) == 1, f'Expected exactly one <h1>: {relative}'
    assert any(t == 'footer' for t, _ in doc.tags), f'Missing <footer>: {relative}'
    if relative == 'index.html':
        assert any(a.get('role') == 'status' and a.get('aria-live') == 'polite' for _, a in doc.tags), f'Missing live status region: {relative}'
    else:
        assert doc.breadcrumb_current_count >= 1, f'Missing breadcrumb aria-current="page": {relative}'


def validate_sitemaps(dist_dir, expected_urls):
    ns = {'sm': SITEMAP_NS}
    index_path = dist_dir / 'sitemap.xml'
    index_root = ET.parse(index_path).getroot()
    assert index_root.tag == f'{{{SITEMAP_NS}}}sitemapindex', f'Expected <sitemapindex> root in sitemap.xml, got {index_root.tag}'
    assert not any(el.tag.endswith('lastmod') for el in index_root.iter()), 'Unexpected <lastmod> in sitemap.xml'
    child_locs = [el.text for el in index_root.findall('sm:sitemap/sm:loc', ns)]
    assert child_locs, 'Sitemap index has no child sitemaps'
    assert all(loc and loc.startswith(ORIGIN + '/') for loc in child_locs), 'Invalid child sitemap <loc>'
    assert len(child_locs) == len(set(child_locs)), 'Duplicate child sitemap <loc>'
    child_names = []
    for loc in child_locs:
        rel = loc.removeprefix(ORIGIN + '/')
        assert '/' not in rel and rel.startswith('sitemap-') and rel.endswith('.xml'), f'Unexpected child sitemap path: {loc}'
        assert (dist_dir / rel).is_file(), f'Missing child sitemap: {rel}'
        child_names.append(rel)
    actual_children = {p.name for p in dist_dir.glob('sitemap-*.xml')}
    assert actual_children == set(child_names), f'Orphan sitemap files in dist: {sorted(actual_children - set(child_names))}'

    listed = []
    seen = set()
    for name in child_names:
        child_path = dist_dir / name
        size = child_path.stat().st_size
        assert size < SITEMAP_MAX_BYTES, f'Child sitemap exceeds 10 MB: {name} ({size} bytes)'
        child_root = ET.parse(child_path).getroot()
        assert child_root.tag == f'{{{SITEMAP_NS}}}urlset', f'Expected <urlset> root in {name}, got {child_root.tag}'
        assert not any(el.tag.endswith('lastmod') for el in child_root.iter()), f'Unexpected <lastmod> in {name}'
        child_urls = [el.text for el in child_root.findall('sm:url/sm:loc', ns)]
        assert all(url and url.startswith(ORIGIN + '/') for url in child_urls), f'Invalid URL in {name}'
        assert len(child_urls) <= SITEMAP_MAX_URLS, f'Child sitemap exceeds {SITEMAP_MAX_URLS} URLs: {name} ({len(child_urls)})'
        for url in child_urls:
            assert url not in seen, f'Duplicate sitemap URL: {url}'
            seen.add(url)
            listed.append(url)
    assert seen == expected_urls, 'Sitemap does not match built canonical pages'
    return child_names, listed


def audit(dist_dir=DIST, dataset_path=None, aliases_path=None):
    dist_dir = Path(dist_dir)
    resolved_dataset = resolve_dataset_path(dataset_path)
    resolved_aliases = Path(aliases_path) if aliases_path is not None else ROOT / 'data/aliases.json'

    files = sorted(dist_dir.rglob('*.html'))
    manifest = json.loads(resolved_dataset.read_text(encoding='utf-8'))['manifest']
    aliases = json.loads(resolved_aliases.read_text(encoding='utf-8'))
    topic_pages = aliases.get('topicPages', [])
    expected_pages = sum(bool(c['sectionCount']) for c in manifest['chapters']) + 3 + manifest['sectionCount'] + 1 + len(topic_pages)
    assert len(files) == expected_pages, f'Expected {expected_pages} HTML pages, got {len(files)}'

    urls = set()
    titles = set()
    seen_descriptions = set()
    links = 0
    for path in files:
        relative = path.relative_to(dist_dir).as_posix()
        canonical = ORIGIN + '/' + relative.removesuffix('index.html')
        doc = Document(path.read_text(encoding='utf-8'))
        assert doc.title and doc.title not in titles, f'Duplicate/empty title: {relative}'
        titles.add(doc.title)
        validate_accessibility(doc, relative)
        canonicals = [a.get('href') for t, a in doc.tags if t == 'link' and a.get('rel') == 'canonical']
        assert canonicals == [canonical], (relative, canonicals)
        descriptions = [a.get('content') for t, a in doc.tags if t == 'meta' and a.get('name') == 'description']
        assert len(descriptions) == 1 and descriptions[0], relative
        assert descriptions[0] not in seen_descriptions, f'Duplicate description: {relative}'
        seen_descriptions.add(descriptions[0])
        assert doc.schemas, f'Missing structured data: {relative}'
        assert not any(t == 'meta' and a.get('name') == 'robots' and 'noindex' in a.get('content', '') for t, a in doc.tags), relative
        for tag, attrs in doc.tags:
            href = attrs.get('href') or (attrs.get('src') if tag in ('script', 'img') else None)
            if not href or href.startswith('#'):
                continue
            url = urlsplit(href)
            if url.netloc and url.netloc != 'showmestatutes.org':
                continue
            if url.scheme and url.scheme not in ('http', 'https'):
                continue
            target = dist_dir / unquote(url.path).lstrip('/') if url.path.startswith('/') else path.parent / unquote(url.path)
            if target.is_dir():
                target /= 'index.html'
            assert target.is_file(), f'Broken internal link {relative}: {href}'
            links += 1
        urls.add(canonical)

    child_names, listed = validate_sitemaps(dist_dir, urls)
    assert 'Sitemap: ' + ORIGIN + '/sitemap.xml' in (dist_dir / 'robots.txt').read_text(encoding='utf-8')
    assert struct.unpack('>II', (dist_dir / 'social-card.png').read_bytes()[16:24]) == (1200, 630)
    return {
        'pages': len(files),
        'sitemaps': len(child_names),
        'urls': len(listed),
        'links': links,
    }


if __name__ == '__main__':
    result = audit()
    print(
        f"SEO audit passed: {result['pages']} HTML pages, {result['sitemaps']} child sitemaps, "
        f"{result['urls']} sitemap URLs, {result['links']} internal links, accessibility landmarks, "
        f"unique metadata, valid JSON-LD, and 1200×630 sharing image."
    )
