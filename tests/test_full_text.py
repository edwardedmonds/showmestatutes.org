"""Source fidelity and fail-closed regression tests for archived reading text."""
import importlib.util
import json
from pathlib import Path
import unittest
from bs4 import BeautifulSoup

spec = importlib.util.spec_from_file_location('full_text', Path('scripts/full_text.py'))
ft = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ft)
FIXTURES = Path('tests/fixtures/full-text')
RECORDS = {r['id']: r for r in json.loads(Path('public/data/statutes.json').read_text())['records']}

def example(identity='535.300:35191'):
    return RECORDS[identity], json.loads((FIXTURES / (identity.replace(':', '-') + '.json')).read_text())

def synthetic(body):
    record, cached = example()
    cached['html'] = '<div class="norm"><p class="norm"><span class="bold">535.300. Heading. — </span>' + body + '</p><div class="foot"><p>History</p></div></div>'
    record = dict(record, sourceSha256=ft.digest(cached['html']))
    return record, cached

class FullTextTests(unittest.TestCase):
    def test_all_representative_archives_preserve_every_character(self):
        for p in FIXTURES.glob('*.json'):
            if p.name.startswith('parsed-'): continue
            with self.subTest(source=p.name):
                cached = json.loads(p.read_text())
                record = next(r for r in RECORDS.values() if r['sourceUrl'] == cached['url'])
                result = ft.extract(record, cached)
                original = BeautifulSoup(cached['html'], 'html.parser').select_one('div.norm').get_text()
                emitted = result['headingText'] + ''.join(map(ft.node_text, result['blocks'] + result['notes']))
                self.assertEqual(ft.compact(original), ft.compact(emitted))
                self.assertEqual(record['sourceCheckedAt'], result['sourceCheckedAt'])

    def test_continuation_and_numbered_subdivisions_stay_in_subsection_three(self):
        result = ft.extract(*example())
        self.assertEqual(list(range(1,9)), [s['number'] for s in result['subsections']])
        start, stop = result['subsections'][2:4]
        third = ''.join(map(ft.node_text, result['blocks'][start['block']:stop['block']]))
        self.assertIn('(1)', third)
        self.assertIn('(2)', third)
        self.assertIn('The landlord shall have complied with this subsection', third)
        self.assertNotIn('4.', third)
        self.assertIn('(L. 1983', ''.join(map(ft.node_text, result['notes'])))

    def test_provenance_mismatch_stops_extraction(self):
        record, cached = example()
        for key, value in [('url', 'https://revisor.mo.gov/'), ('checkedAt','2027-01-01'), ('html',cached['html'][:-100])]:
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, 'provenance'):
                ft.extract(record, dict(cached, **{key:value}))

    def test_missing_duplicate_and_mismatched_roots_or_headings_fail(self):
        for html in ['<p>empty</p>', '<div class="norm">x</div><div class="norm">y</div>', '<div class="norm"><p>no heading</p></div>']:
            record, cached = example()
            cached['html'] = html
            record = dict(record, sourceSha256=ft.digest(html))
            with self.subTest(html=html), self.assertRaises(ValueError): ft.extract(record, cached)

    def test_unknown_elements_and_external_links_require_review(self):
        for body in ['<img src="formula.png">', '<script>alert(1)</script>', '<a href="https://example.com">outside</a>', '<a href="javascript:alert(1)">bad</a>', '<p title="source warning">Text</p>', '<p hidden>Text</p>']:
            with self.subTest(body=body), self.assertRaises(ValueError):
                ft.extract(*synthetic(body))

    def test_ambiguous_numbering_preserves_text_without_guessing_navigation(self):
        result = ft.extract(*synthetic('1. First.</p><p>3. Third.'))
        self.assertTrue(result['navigationReview'])
        self.assertEqual([], result['subsections'])
        self.assertIn('3. Third.', ''.join(map(ft.node_text,result['blocks'])))

    def test_real_starred_tail_and_reviewed_source_irregularities(self):
        result = ft.extract(*example('144.054:60128'))
        self.assertEqual(list(range(1,7)), [s['number'] for s in result['subsections']])
        last = result['subsections'][-1]
        self.assertTrue(ft.node_text(result['blocks'][last['block']]).strip().startswith('*6.'))
        for identity, literal in [('334.230:17782','l.  Upon application'),
                                  ('578.182:30113','Exemptions. — 1.'),
                                  ('408.683:23434','If you desire that such records'),
                                  ('334.1206:33773','A.')]:
            with self.subTest(identity=identity):
                result = ft.extract(*example(identity))
                self.assertEqual([], result['subsections'])
                self.assertTrue(result['navigationReview'])
                self.assertIn(ft.compact(literal), ft.compact(''.join(map(ft.node_text,result['blocks']))))

    def test_footnote_markers_do_not_hide_first_middle_or_final_subsection(self):
        for body in ['*1. First.</p><p>2. Second.</p><p>3. Third.',
                     '1. First.</p><p>**2. Second.</p><p>3. Third.',
                     '1. First.</p><p>2. Second.</p><p>*3. Third.']:
            with self.subTest(body=body):
                result = ft.extract(*synthetic(body))
                self.assertEqual([1,2,3], [s['number'] for s in result['subsections']])
                self.assertFalse(result['navigationReview'])
                self.assertIn('*', ''.join(map(ft.node_text, result['blocks'])))

    def test_numbered_list_inside_an_article_or_lettered_part_is_not_subsections(self):
        for body in ['ARTICLE I</p><p>1. One.</p><p>2. Two.</p><p>ARTICLE II',
                     'A. Part.</p><p>1. One.</p><p>2. Two.</p><p>B. Next part.',
                     'The following form:</p><p>1. First instruction.</p><p>2. Second.',
                     '1.1. Compound number.</p><p>1. Another number.',
                     '1. One.</p><p>2. Two.</p><p>1. Restarted.',
                     '1. Outer.<div><p>2. Nested.</p></div>']:
            with self.subTest(body=body):
                result = ft.extract(*synthetic(body))
                self.assertTrue(result['navigationReview'])
                self.assertEqual([], result['subsections'])

    def test_empty_body_needs_exact_reviewed_source_identity(self):
        with self.assertRaisesRegex(ValueError, 'empty statutory body'):
            ft.extract(*synthetic(''))
        result = ft.extract(*example('324.406:60569'))
        self.assertEqual('', ft.compact(''.join(map(ft.node_text, result['blocks']))))
        self.assertIn('Contingent effective date', ''.join(map(ft.node_text, result['notes'])))

    def test_semantic_source_styles_and_relative_links(self):
        result = ft.extract(*synthetic('<span class="italic">Emphasis</span><a href="OneSection.aspx?section=1.010">cross reference</a><span style="font-weight:bold;text-decoration:underline;">Important</span>'))
        encoded = json.dumps(result)
        self.assertIn('source-italic', encoded)
        self.assertIn('font-weight:bold;text-decoration:underline', encoded)
        self.assertIn('https://revisor.mo.gov/main/OneSection.aspx?section=1.010', encoded)
        for body in ['<span class="unknown">X</span>', '<span style="display:none;">Hidden</span>', '<span style="text-align:expression(evil);">X</span>']:
            with self.subTest(body=body), self.assertRaises(ValueError):
                ft.extract(*synthetic(body))

    def test_table_spans_emphasis_and_cross_references_survive(self):
        result = ft.extract(*example('115.019:5921'))
        encoded = json.dumps(result)
        self.assertIn('"colspan": "6"', encoded)
        self.assertIn('"tag": "table"', encoded)
        result = ft.extract(*synthetic('<span class="bold">Bold</span><sup>2</sup><sub>n</sub><a href="/main/OneSection.aspx?section=1.010">1.010</a>'))
        encoded = json.dumps(result)
        for target in ['"tag": "strong"', '"tag": "sup"', '"tag": "sub"', 'https://revisor.mo.gov/main/OneSection.aspx?section=1.010']:
            self.assertIn(target, encoded)

if __name__ == '__main__': unittest.main()
