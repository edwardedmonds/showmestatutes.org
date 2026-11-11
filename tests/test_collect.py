import copy
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('collect', Path('scripts/collect.py'))
collect = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collect)
ENTRY = {'id': '565.050:29279', 'section': '565.050', 'versionId': '29279',
         'effectiveFrom': '2017-01-01', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=565.050&bid=29279'}

class CollectionTests(unittest.TestCase):
    def test_parses_source_end_date_and_version_identity(self):
        source = Path('tests/fixtures/assault-current.html').read_text()
        record = collect.parse_section(source, ENTRY, '2026-11-11T20:00:00+00:00')
        self.assertEqual(record['title'], 'Assault, first degree, penalty.')
        self.assertEqual(record['effectiveTo'], '2027-07-01')
        self.assertEqual(record['versionId'], '29279')

    def test_rejects_a_real_inconsistent_source_response(self):
        entry = {**ENTRY, 'id': '565.030:33576', 'section': '565.030', 'versionId': '33576', 'effectiveFrom': '2016-08-28'}
        with self.assertRaisesRegex(ValueError, 'Unexpected heading'):
            collect.parse_section(Path('tests/fixtures/wrong-heading.html').read_text(), entry, '2026-11-11T20:00:00+00:00')

    def test_rejects_date_and_identity_mismatches(self):
        source = Path('tests/fixtures/assault-current.html').read_text()
        with self.assertRaises(ValueError):
            collect.parse_section(source, {**ENTRY, 'effectiveFrom': '2027-07-01'}, '2026-11-11T20:00:00+00:00')
        with self.assertRaises(ValueError):
            collect.parse_section(source, {**ENTRY, 'versionId': '60733'}, '2026-11-11T20:00:00+00:00')

    def test_rejects_partial_index(self):
        with self.assertRaisesRegex(ValueError, 'Incomplete'):
            collect.parse_index('<html><body>Unavailable</body></html>')

    def test_rejects_truncated_heading(self):
        source = Path('tests/fixtures/assault-current.html').read_text().replace('Assault, first degree, penalty.', 'Assault ...')
        with self.assertRaisesRegex(ValueError, 'truncated'):
            collect.parse_section(source, ENTRY, '2026-11-11T20:00:00+00:00')

if __name__ == '__main__':
    unittest.main()
