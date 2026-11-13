"""Audit the built public HTML, sitemap, metadata and internal links offline."""
import json
import struct
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
ORIGIN = 'https://showmestatutes.org'

class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.title = ''
        self.in_title = False
        self.in_schema = False
        self.schema_text = ''
        self.schemas = []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if tag == 'title': self.in_title = True
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.in_schema = True
            self.schema_text = ''
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'script' and self.in_schema:
            self.schemas.append(json.loads(self.schema_text))
            self.in_schema = False
    def handle_data(self, value):
        if self.in_title: self.title += value
        if self.in_schema: self.schema_text += value

files = sorted(DIST.rglob('*.html'))
manifest = json.loads((ROOT / 'public/data/statutes.json').read_text())['manifest']
assert len(files) == sum(bool(c['sectionCount']) for c in manifest['chapters']) + 2
urls = set()
titles = set()
links = 0
for path in files:
    relative = path.relative_to(DIST).as_posix()
    canonical = ORIGIN + '/' + relative.removesuffix('index.html')
    doc = Document(path.read_text())
    assert doc.title and doc.title not in titles, f'Duplicate/empty title: {relative}'
    titles.add(doc.title)
    assert len([t for t, _ in doc.tags if t == 'h1']) == 1, relative
    canonicals = [a.get('href') for t, a in doc.tags if t == 'link' and a.get('rel') == 'canonical']
    assert canonicals == [canonical], (relative, canonicals)
    descriptions = [a.get('content') for t, a in doc.tags if t == 'meta' and a.get('name') == 'description']
    assert len(descriptions) == 1 and descriptions[0], relative
    assert doc.schemas, f'Missing structured data: {relative}'
    assert not any(t == 'meta' and a.get('name') == 'robots' and 'noindex' in a.get('content', '') for t, a in doc.tags), relative
    for tag, attrs in doc.tags:
        href = attrs.get('href') or (attrs.get('src') if tag in ('script', 'img') else None)
        if not href or href.startswith('#'): continue
        url = urlsplit(href)
        if url.netloc and url.netloc != 'showmestatutes.org': continue
        if url.scheme and url.scheme not in ('http', 'https'): continue
        target = DIST / unquote(url.path).lstrip('/') if url.path.startswith('/') else path.parent / unquote(url.path)
        if target.is_dir(): target /= 'index.html'
        assert target.is_file(), f'Broken internal link {relative}: {href}'
        links += 1
    urls.add(canonical)
ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
listed = [el.text for el in ET.parse(DIST / 'sitemap.xml').findall('sm:url/sm:loc', ns)]
assert len(listed) == len(set(listed)), 'Duplicate sitemap URLs'
assert set(listed) == urls, 'Sitemap does not match built canonical pages'
assert 'Sitemap: ' + ORIGIN + '/sitemap.xml' in (DIST / 'robots.txt').read_text()
assert struct.unpack('>II', (DIST / 'social-card.png').read_bytes()[16:24]) == (1200, 630)
print(f'SEO audit passed: {len(files)} HTML pages, {len(listed)} sitemap URLs, {links} internal links, unique metadata, valid JSON-LD, and 1200×630 sharing image.')
