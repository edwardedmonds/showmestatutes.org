"""Isolated unit tests for scripts/check-seo.py."""
import importlib.util
import json
import os
import struct
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location('check_seo', ROOT / 'scripts/check-seo.py')
check_seo = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(check_seo)

ORIGIN = check_seo.ORIGIN
SM_NS = check_seo.SITEMAP_NS


def make_png(width: int, height: int) -> bytes:
    return b'\x89PNG\r\n\x1a\n' + b'\x00\x00\x00\rIHDR' + struct.pack('>II', width, height) + b'\x00' * 8


def make_html(path: str, title: str, description: str, *, is_home: bool = False, extra_body: str = '', html_attrs: str = 'lang="en"', viewport: bool = True, skip_link: bool = True, header: bool = True, nav_label: str | None = 'Main navigation', main_count: int = 1, footer: bool = True, breadcrumb_current: bool = True, live_status: bool = True) -> str:
    canonical = ORIGIN + path
    schema = json.dumps({'@context': 'https://schema.org', '@type': 'WebPage', 'url': canonical})
    vp = '<meta name="viewport" content="width=device-width, initial-scale=1">' if viewport else ''
    skip = '<a class="skip-link" href="#main">Skip</a>' if skip_link else ''
    nav_attr = f' aria-label="{nav_label}"' if nav_label is not None else ''
    hdr = f'<header><nav{nav_attr}><a href="/">Home</a></nav></header>' if header else f'<nav{nav_attr}><a href="/">Home</a></nav>'
    crumb_span = '<span aria-current="page">Current</span>' if breadcrumb_current else '<span>Current</span>'
    crumb = '' if is_home else f'<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> {crumb_span}</nav>'
    status = '<p id="status" role="status" aria-live="polite">Ready</p>' if (is_home and live_status) else ''
    mains = ''.join(f'<main id="main">{crumb}<h1>{title}</h1>{status}{extra_body}</main>' for _ in range(main_count))
    ftr = '<footer>Footer</footer>' if footer else ''
    return (
        f'<!doctype html><html {html_attrs}><head><meta charset="UTF-8">{vp}'
        f'<title>{title}</title><meta name="description" content="{description}">'
        f'<link rel="canonical" href="{canonical}">'
        f'<script type="application/ld+json">{schema}</script></head>'
        f'<body>{skip}{hdr}{mains}{ftr}</body></html>'
    )


def build_fixture(tmp: Path):
    dist = tmp / 'dist'
    dist.mkdir()
    dataset_path = tmp / 'statutes.json'
    aliases_path = tmp / 'aliases.json'

    dataset = {
        'manifest': {
            'sectionCount': 1,
            'chapters': [{'chapter': '1', 'sectionCount': 1}],
        }
    }
    aliases = {
        'topicPages': [{'slug': 'sample-topic', 'title': 'Sample Topic'}],
    }
    dataset_path.write_text(json.dumps(dataset), encoding='utf-8')
    aliases_path.write_text(json.dumps(aliases), encoding='utf-8')

    pages = {
        'index.html': ('/', 'Home Title', 'Home description', True),
        'about/index.html': ('/about/', 'About Title', 'About description', False),
        'coverage/index.html': ('/coverage/', 'Coverage Title', 'Coverage description', False),
        'chapters/index.html': ('/chapters/', 'Chapters Title', 'Chapters description', False),
        'topics/index.html': ('/topics/', 'Topics Title', 'Topics description', False),
        'topics/sample-topic/index.html': ('/topics/sample-topic/', 'Sample Topic', 'Sample topic description', False),
        'chapters/1/index.html': ('/chapters/1/', 'Chapter 1', 'Chapter 1 description', False),
        'statutes/1.010/index.html': ('/statutes/1.010/', 'Section 1.010', 'Section 1.010 description', False),
    }
    for rel, (url_path, title, desc, is_home) in pages.items():
        target = dist / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(make_html(url_path, title, desc, is_home=is_home), encoding='utf-8')

    def write_urlset(name: str, url_paths: list[str]):
        body = '\n'.join(f'<url><loc>{ORIGIN}{p}</loc></url>' for p in url_paths)
        (dist / name).write_text(
            f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="{SM_NS}">{body}</urlset>\n',
            encoding='utf-8',
        )

    write_urlset('sitemap-core.xml', ['/', '/about/', '/coverage/', '/chapters/', '/topics/', '/topics/sample-topic/'])
    write_urlset('sitemap-chapters.xml', ['/chapters/1/'])
    write_urlset('sitemap-statutes-1.xml', ['/statutes/1.010/'])

    children = ['sitemap-core.xml', 'sitemap-chapters.xml', 'sitemap-statutes-1.xml']
    index_body = '\n'.join(f'<sitemap><loc>{ORIGIN}/{name}</loc></sitemap>' for name in children)
    (dist / 'sitemap.xml').write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="{SM_NS}">{index_body}</sitemapindex>\n',
        encoding='utf-8',
    )
    (dist / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {ORIGIN}/sitemap.xml\n', encoding='utf-8')
    (dist / 'social-card.png').write_bytes(make_png(1200, 630))
    return dist, dataset_path, aliases_path


class CheckSeoTests(unittest.TestCase):
    def test_valid_fixture_passes_audit(self):
        with tempfile.TemporaryDirectory() as td:
            dist, dataset_path, aliases_path = build_fixture(Path(td))
            result = check_seo.audit(dist_dir=dist, dataset_path=dataset_path, aliases_path=aliases_path)
            self.assertEqual(result['pages'], 8)
            self.assertEqual(result['sitemaps'], 3)
            self.assertEqual(result['urls'], 8)

    def test_honors_statutes_dataset_env(self):
        with tempfile.TemporaryDirectory() as td:
            dist, dataset_path, aliases_path = build_fixture(Path(td))
            with mock.patch.dict(os.environ, {'STATUTES_DATASET': str(dataset_path)}):
                result = check_seo.audit(dist_dir=dist, aliases_path=aliases_path)
                self.assertEqual(result['pages'], 8)

            # Relative paths resolve against ROOT.
            with mock.patch.dict(os.environ, {'STATUTES_DATASET': 'public/data/statutes.json'}):
                self.assertEqual(check_seo.resolve_dataset_path(), ROOT / 'public/data/statutes.json')

    def test_rejects_flat_urlset_in_sitemap_index(self):
        with tempfile.TemporaryDirectory() as td:
            dist, dataset_path, aliases_path = build_fixture(Path(td))
            (dist / 'sitemap.xml').write_text(
                f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="{SM_NS}"><url><loc>{ORIGIN}/</loc></url></urlset>\n',
                encoding='utf-8',
            )
            with self.assertRaisesRegex(AssertionError, 'sitemapindex'):
                check_seo.audit(dist_dir=dist, dataset_path=dataset_path, aliases_path=aliases_path)

    def test_rejects_lastmod_in_index_or_child_sitemap(self):
        with tempfile.TemporaryDirectory() as td:
            dist, dataset_path, aliases_path = build_fixture(Path(td))
            xml = (dist / 'sitemap-core.xml').read_text(encoding='utf-8')
            (dist / 'sitemap-core.xml').write_text(
                xml.replace('</loc></url>', '</loc><lastmod>2026-11-23</lastmod></url>', 1),
                encoding='utf-8',
            )
            with self.assertRaisesRegex(AssertionError, 'lastmod'):
                check_seo.audit(dist_dir=dist, dataset_path=dataset_path, aliases_path=aliases_path)

    def test_rejects_orphan_sitemap_file(self):
        with tempfile.TemporaryDirectory() as td:
            dist, dataset_path, aliases_path = build_fixture(Path(td))
            (dist / 'sitemap-orphan.xml').write_text(
                f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="{SM_NS}"></urlset>\n',
                encoding='utf-8',
            )
            with self.assertRaisesRegex(AssertionError, 'Orphan sitemap'):
                check_seo.audit(dist_dir=dist, dataset_path=dataset_path, aliases_path=aliases_path)

    def test_rejects_duplicate_url_across_child_sitemaps(self):
        with tempfile.TemporaryDirectory() as td:
            dist, dataset_path, aliases_path = build_fixture(Path(td))
            (dist / 'sitemap-chapters.xml').write_text(
                f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="{SM_NS}">'
                f'<url><loc>{ORIGIN}/chapters/1/</loc></url>'
                f'<url><loc>{ORIGIN}/</loc></url></urlset>\n',
                encoding='utf-8',
            )
            with self.assertRaisesRegex(AssertionError, 'Duplicate sitemap URL'):
                check_seo.audit(dist_dir=dist, dataset_path=dataset_path, aliases_path=aliases_path)

    def test_rejects_child_sitemap_over_url_cap(self):
        with tempfile.TemporaryDirectory() as td:
            dist, dataset_path, aliases_path = build_fixture(Path(td))
            with mock.patch.object(check_seo, 'SITEMAP_MAX_URLS', 2):
                with self.assertRaisesRegex(AssertionError, 'exceeds 2 URLs'):
                    check_seo.audit(dist_dir=dist, dataset_path=dataset_path, aliases_path=aliases_path)

    def test_accessibility_landmark_failures(self):
        cases = [
            ('index.html', {'is_home': True, 'html_attrs': ''}, 'lang="en"'),
            ('index.html', {'is_home': True, 'viewport': False}, 'viewport'),
            ('index.html', {'is_home': True, 'skip_link': False}, 'skip-link'),
            ('index.html', {'is_home': True, 'header': False}, '<header>'),
            ('index.html', {'is_home': True, 'nav_label': None}, 'aria-label'),
            ('index.html', {'is_home': True, 'main_count': 2}, '<main>'),
            ('index.html', {'is_home': True, 'footer': False}, '<footer>'),
            ('index.html', {'is_home': True, 'live_status': False}, 'live status'),
            ('about/index.html', {'is_home': False, 'breadcrumb_current': False}, 'aria-current'),
        ]
        for rel, kwargs, expected_msg in cases:
            with self.subTest(rel=rel, expected_msg=expected_msg):
                with tempfile.TemporaryDirectory() as td:
                    dist, dataset_path, aliases_path = build_fixture(Path(td))
                    url_path = '/' if rel == 'index.html' else '/' + rel.removesuffix('index.html')
                    (dist / rel).write_text(
                        make_html(url_path, f'Title for {rel}', f'Description for {rel}', **kwargs),
                        encoding='utf-8',
                    )
                    with self.assertRaisesRegex(AssertionError, expected_msg):
                        check_seo.audit(dist_dir=dist, dataset_path=dataset_path, aliases_path=aliases_path)

    def test_rejects_internal_link_escaping_dist(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            dist, dataset_path, aliases_path = build_fixture(root)
            (root / 'outside.txt').write_text('outside', encoding='utf-8')
            (dist / 'about/index.html').write_text(
                make_html('/about/', 'About Title', 'About description', extra_body='<a href="../../outside.txt">Escape</a>'),
                encoding='utf-8',
            )
            with self.assertRaisesRegex(AssertionError, 'escapes dist'):
                check_seo.audit(dist_dir=dist, dataset_path=dataset_path, aliases_path=aliases_path)

    def test_rejects_unexpected_url_schemes(self):
        cases = [
            '<a href="javascript:alert(1)">JS</a>',
            '<a href="javascript://example.com/%0aalert(1)">JS host</a>',
            '<a href="data:text/html,hi">Data link</a>',
            '<img src="data:image/svg+xml,<svg/>" alt="">',
            '<a href="vbscript:msgbox(1)">VBS</a>',
        ]
        for snippet in cases:
            with self.subTest(snippet=snippet):
                with tempfile.TemporaryDirectory() as td:
                    dist, dataset_path, aliases_path = build_fixture(Path(td))
                    (dist / 'about/index.html').write_text(
                        make_html('/about/', 'About Title', 'About description', extra_body=snippet),
                        encoding='utf-8',
                    )
                    with self.assertRaisesRegex(AssertionError, 'Unexpected URL scheme'):
                        check_seo.audit(dist_dir=dist, dataset_path=dataset_path, aliases_path=aliases_path)


if __name__ == '__main__':
    unittest.main()
