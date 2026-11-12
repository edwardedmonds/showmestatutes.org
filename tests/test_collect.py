import copy
import importlib.util
import unittest
import tempfile
from unittest.mock import Mock
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

class ExpandedCollectionTests(unittest.TestCase):
    def test_collection_lock_blocks_concurrent_collection_and_cleans_up_on_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            lock = Path(directory) / '.collect.lock'
            with self.assertRaisesRegex(RuntimeError, 'source failed'):
                with collect.collection_lock(lock):
                    with self.assertRaisesRegex(ValueError, 'Collection lock'):
                        with collect.collection_lock(lock):
                            pass
                    raise RuntimeError('source failed')
            self.assertFalse(lock.exists())

    def test_rejects_cross_chapter_heading_even_with_matching_date_and_navigation(self):
        entry = {'id': '552.040:54313', 'section': '552.040', 'versionId': '54313',
                 'effectiveFrom': '2023-08-28', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=552.040&bid=54313'}
        with self.assertRaisesRegex(ValueError, 'Unexpected heading'):
            collect.parse_section(Path('tests/fixtures/wrong-heading-552.html').read_text(), entry, '2026-11-12T06:00:00+00:00')

    def test_rejects_navigation_for_another_version(self):
        entry = {'id': '570.150:29635', 'section': '570.150', 'versionId': '29635',
                 'effectiveFrom': '2017-01-01', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=570.150&bid=29635'}
        with self.assertRaisesRegex(ValueError, 'Wrong selected version'):
            collect.parse_section(Path('tests/fixtures/wrong-version-570.html').read_text(), entry, '2026-11-12T06:00:00+00:00')

    def test_invalid_source_retry_is_bounded_and_offline_never_fetches(self):
        good = {'html': Path('tests/fixtures/assault-current.html').read_text(), 'checkedAt': '2026-11-12T06:00:00+00:00'}
        bad = {**good, 'html': '<html>unavailable</html>'}
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory)
            fetch = Mock(return_value=good)
            record = collect.parse_with_retry(ENTRY, bad, fetch, cache, False)
            self.assertEqual(record['id'], ENTRY['id'])
            fetch.assert_called_once_with(ENTRY['sourceUrl'], fresh=True)
            self.assertEqual(len(list(cache.glob('*.rejected.json'))), 1)
            fetch = Mock(return_value=bad)
            with self.assertRaises(ValueError):
                collect.parse_with_retry(ENTRY, bad, fetch, cache, False)
            self.assertEqual(fetch.call_count, 2)
            fetch.reset_mock()
            with self.assertRaises(ValueError):
                collect.parse_with_retry(ENTRY, bad, fetch, cache, True)
            fetch.assert_not_called()

    def test_concurrent_enactment_requires_explicit_source_notice(self):
        entry = {'id': '590.1265:50096', 'section': '590.1265', 'versionId': '50096',
                 'effectiveFrom': '2021-08-28', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=590.1265&bid=50096'}
        source = Path('tests/fixtures/concurrent-590.html').read_text()
        self.assertTrue(collect.parse_section(source, entry, '2026-11-12T06:00:00+00:00')['multipleEnactments'])
        with self.assertRaisesRegex(ValueError, 'Unverified concurrent'):
            collect.parse_section(source.replace('Due to possible conflict, both versions are printed.', ''), entry, '2026-11-12T06:00:00+00:00')

    def test_chapter_index_identity_and_count(self):
        source = Path('tests/fixtures/chapter-540.html').read_text()
        entries = collect.parse_index(source, '540')
        self.assertEqual(len(entries), 33)
        self.assertTrue(all(e['section'].startswith('540.') for e in entries))
        with self.assertRaisesRegex(ValueError, 'wrong chapter'):
            collect.parse_index(source, '541')
        with self.assertRaisesRegex(ValueError, 'Incomplete'):
            collect.parse_index(source.replace('PageSelect.aspx', 'Missing.aspx', 1), '540')

    def test_all_duplicate_index_rows_fail_even_when_identical(self):
        source = Path('tests/fixtures/chapter-540.html').read_text()
        from bs4 import BeautifulSoup
        row = str(BeautifulSoup(source, 'html.parser').find('tr'))
        with self.assertRaisesRegex(ValueError, 'Duplicate index row'):
            collect.parse_index(source.replace('</table>', row + '</table>'), '540')
        with self.assertRaisesRegex(ValueError, 'Conflicting duplicate'):
            collect.parse_index(source.replace('</table>', row.replace('8/28/2003', '8/28/2004') + '</table>'), '540')

    def test_empty_index_requires_verified_identity_and_page_structure(self):
        source = Path('tests/fixtures/chapter-560.html').read_text()
        self.assertEqual(collect.parse_index(source, '560'), [])
        wrong_row = '<tr><td><a href="/main/PageSelect.aspx?section=540.021&amp;bid=28590">540.021</a></td><td>Wrong chapter (8/28/2003)</td></tr>'
        with self.assertRaisesRegex(ValueError, 'Wrong chapter'):
            collect.parse_index(source.replace('</table>', wrong_row + '</table>'), '560')
        with self.assertRaisesRegex(ValueError, 'empty chapter'):
            collect.parse_index(source.replace('Cross References', ''), '560')
        with self.assertRaises(ValueError):
            collect.parse_index('<html><title>RSMo Chapter 560</title>Unavailable</html>', '560')

if __name__ == '__main__':
    unittest.main()
