import copy
import json
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

class ContingentDateTests(unittest.TestCase):
    def test_source_placeholder_is_preserved_but_explicitly_marked(self):
        entry = {'id': '301.287:60471', 'section': '301.287', 'versionId': '60471',
                 'effectiveFrom': '2099-01-01', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=301.287&bid=60471'}
        source = Path('tests/fixtures/contingent-301-60471.html').read_text()
        record = collect.parse_section(source, entry, '2026-11-12T07:00:00+00:00')
        self.assertTrue(record['effectiveDateIsPlaceholder'])
        self.assertTrue(record['multipleEnactments'])
        self.assertEqual(record['effectiveFrom'], '2099-01-01')
        self.assertIsNone(record['effectiveTo'])
        with self.assertRaisesRegex(ValueError, 'placeholder'):
            collect.parse_section(source.replace('date is placeholder', 'scheduled date'), entry, '2026-11-12T07:00:00+00:00')
        with self.assertRaisesRegex(ValueError, 'contingent'):
            collect.parse_section(source.replace('a possible conflict in language', 'different text'), entry, '2026-11-12T07:00:00+00:00')
        unknown = {**entry, 'id': '301.288:60471', 'section': '301.288'}
        with self.assertRaisesRegex(ValueError, 'placeholder'):
            collect.parse_section(source.replace('301.287', '301.288'), unknown, '2026-11-12T07:00:00+00:00')

    def test_dated_partner_keeps_its_actual_date_and_conflict_notice(self):
        entry = {'id': '301.287:60726', 'section': '301.287', 'versionId': '60726',
                 'effectiveFrom': '2026-08-28', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=301.287&bid=60726'}
        source = Path('tests/fixtures/contingent-301-60726.html').read_text()
        record = collect.parse_section(source, entry, '2026-11-12T07:00:00+00:00')
        self.assertTrue(record['multipleEnactments'])
        self.assertNotIn('effectiveDateIsPlaceholder', record)
        self.assertIsNone(record['effectiveTo'])
        with self.assertRaisesRegex(ValueError, 'contingent'):
            collect.parse_section(source.replace('a possible conflict in language', 'different text'), entry, '2026-11-12T07:00:00+00:00')

if __name__ == '__main__':
    unittest.main()

class GovernmentCollectionTests(unittest.TestCase):
    def test_preserves_short_chapter_identity_and_complete_heading(self):
        entries = collect.parse_index(Path('tests/fixtures/chapter-1.html').read_text(), '1')
        self.assertEqual(len(entries), 54)
        entry = next(e for e in entries if e['section'] == '1.010')
        self.assertTrue(entry['sourceUrl'].startswith('https://revisor.mo.gov/main/OneSection.aspx?section=1.010&bid='))
        source = Path('tests/fixtures/short-chapter-1.html').read_text()
        record = collect.parse_section(source, entry, '2026-11-12T12:00:00+00:00')
        self.assertEqual(record['chapter'], '1')
        self.assertEqual(record['title'], 'Common law in force — effect on statutes — failure to render health care services, no common law cause of action.')
        with self.assertRaisesRegex(ValueError, 'Unexpected heading'):
            collect.parse_section(source.replace('1.010.', '10.010.'), entry, '2026-11-12T12:00:00+00:00')

    def test_rejects_short_chapter_index_with_wrong_identity(self):
        source = Path('tests/fixtures/chapter-1.html').read_text()
        with self.assertRaisesRegex(ValueError, 'Wrong chapter'):
            collect.parse_index(source.replace('section=1.010', 'section=10.010'), '1')

    def test_single_contingent_version_requires_placeholder_and_footnote_without_inventing_conflict(self):
        entry = {'id': '44.098:35640', 'section': '44.098', 'versionId': '35640',
                 'effectiveFrom': '2099-01-01', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=44.098&bid=35640'}
        source = Path('tests/fixtures/contingent-single-44.html').read_text()
        record = collect.parse_section(source, entry, '2026-11-12T12:00:00+00:00')
        self.assertTrue(record['effectiveDateIsPlaceholder'])
        self.assertNotIn('multipleEnactments', record)
        with self.assertRaisesRegex(ValueError, 'Unverified contingent'):
            collect.parse_section(source.replace('*Contingent effective date.', '*Scheduled effective date.'), entry, '2026-11-12T12:00:00+00:00')
        with self.assertRaisesRegex(ValueError, 'Unverified placeholder'):
            collect.parse_section(source.replace('date is placeholder', 'scheduled date'), entry, '2026-11-12T12:00:00+00:00')

    def test_delayed_enactment_pair_requires_each_sources_exact_notice(self):
        for version, effective in [('60466', '2026-08-28'), ('60727', '2027-07-01')]:
            entry = {'id': '27.117:' + version, 'section': '27.117', 'versionId': version,
                     'effectiveFrom': effective, 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=27.117&bid=' + version}
            source = Path('tests/fixtures/delayed-27-' + version + '.html').read_text()
            record = collect.parse_section(source, entry, '2026-11-12T12:00:00+00:00')
            self.assertTrue(record['multipleEnactments'])
            self.assertIsNone(record['effectiveTo'])
            notice = next(v['sourceNotice'] for v in collect.POLICY['delayedEnactments'][0]['versions'] if v['versionId'] == version)
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(source, 'html.parser')
            text = collect.clean(soup.get_text(' '))
            self.assertIn(notice, text)
            # Preserve the source layout; remove the distinguishing words in its notice.
            bad = source.replace('delayed effective date', 'different circumstances') if version == '60466' else source.replace('Effective 7-01-27', 'Effective 8-01-27')
            self.assertNotEqual(source, bad)
            with self.assertRaisesRegex(ValueError, 'Unverified delayed'):
                collect.parse_section(bad, entry, '2026-11-12T12:00:00+00:00')


class ConstitutionalWarningTests(unittest.TestCase):
    def test_preserves_a_reviewed_warning_from_the_official_effective_date_banner(self):
        entry = {'id': '1.410:49534', 'section': '1.410', 'versionId': '49534',
                 'effectiveFrom': '2021-06-12', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=1.410&bid=49534'}
        source = Path('tests/fixtures/constitutional-1-49534.html').read_text()
        record = collect.parse_section(source, entry, '2026-11-12T12:00:00+00:00')
        self.assertTrue(record['hasConstitutionalWarning'])
        self.assertIsNone(record['effectiveTo'])
        self.assertNotIn('multipleEnactments', record)
        for bad in [source.replace('all or part is unconstitutional', ''),
                    source.replace('Supremacy Clause', 'different clause')]:
            with self.assertRaisesRegex(ValueError, 'constitutional warning'):
                collect.parse_section(bad, entry, '2026-11-12T12:00:00+00:00')

    def test_unreviewed_constitutional_warning_blocks_collection(self):
        entry = {'id': '1.411:49534', 'section': '1.411', 'versionId': '49534',
                 'effectiveFrom': '2021-06-12', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=1.411&bid=49534'}
        source = Path('tests/fixtures/constitutional-1-49534.html').read_text().replace('1.410', '1.411')
        with self.assertRaisesRegex(ValueError, 'constitutional warning'):
            collect.parse_section(source, entry, '2026-11-12T12:00:00+00:00')


    def test_merged_language_warning_requires_the_source_qualification(self):
        entry = {'id': '67.320:2753', 'section': '67.320', 'versionId': '2753',
                 'effectiveFrom': '2014-08-28', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=67.320&bid=2753'}
        source = Path('tests/fixtures/constitutional-qualified-67.320.html').read_text()
        record = collect.parse_section(source, entry, '2026-11-12T18:00:00+00:00')
        self.assertTrue(record['hasConstitutionalWarning'])
        self.assertIsNone(record['effectiveTo'])
        bad = source.replace('is the current version', 'has an unknown status')
        self.assertNotEqual(source, bad)
        with self.assertRaisesRegex(ValueError, 'constitutional warning'):
            collect.parse_section(bad, entry, '2026-11-12T18:00:00+00:00')


    def test_explicit_revisor_warning_is_preserved_without_an_effective_date_banner(self):
        entry = {'id': '67.1431:51494', 'section': '67.1431', 'versionId': '51494',
                 'effectiveFrom': '2022-08-28', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=67.1431&bid=51494'}
        source = Path('tests/fixtures/constitutional-note-67.1431.html').read_text()
        self.assertNotIn('all or part is unconstitutional', source)
        record = collect.parse_section(source, entry, '2026-11-12T18:00:00+00:00')
        self.assertTrue(record['hasConstitutionalWarning'])
        self.assertTrue(record['multipleEnactments'])
        with self.assertRaisesRegex(ValueError, 'Unverified'):
            collect.parse_section(source.replace('This section was declared unconstitutional', 'A different section was discussed'), entry, '2026-11-12T18:00:00+00:00')


class ReprintedVersionTests(unittest.TestCase):
    def test_reprinted_pair_keeps_dates_and_warning_distinction(self):
        for bid, start, warned in [('2011', '2014-08-28', True), ('36193', '1999-05-06', False)]:
            entry = {'id': '56.067:' + bid, 'section': '56.067', 'versionId': bid,
                     'effectiveFrom': start, 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=56.067&bid=' + bid}
            source = Path('tests/fixtures/reprinted-56.067-' + bid + '.html').read_text()
            record = collect.parse_section(source, entry, '2026-11-12T18:00:00+00:00')
            self.assertEqual(bool(record.get('hasConstitutionalWarning')), warned)
            self.assertTrue(record['multipleEnactments'])
            self.assertEqual(record['effectiveFrom'], start)
            self.assertIsNone(record['effectiveTo'])
            bad = source.replace('all or part is unconstitutional', '') if warned else source.replace('reprinted in accordance', 'printed differently')
            with self.assertRaisesRegex(ValueError, 'Unverified'):
                collect.parse_section(bad, entry, '2026-11-12T18:00:00+00:00')

    def test_unreviewed_reprinted_version_and_missing_multiple_notice_fail(self):
        entry = {'id': '56.067:36193', 'section': '56.067', 'versionId': '36193',
                 'effectiveFrom': '1999-05-06', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=56.067&bid=36193'}
        source = Path('tests/fixtures/reprinted-56.067-36193.html').read_text()
        with self.assertRaisesRegex(ValueError, 'Unverified delayed/reprinted'):
            collect.parse_section(source.replace('There are multiple enactments', 'There are enactments'), entry, '2026-11-12T18:00:00+00:00')
        unknown = {**entry, 'id': '56.067:99999', 'versionId': '99999'}
        with self.assertRaisesRegex(ValueError, 'Unverified delayed/reprinted'):
            collect.parse_section(source.replace('36193', '99999'), unknown, '2026-11-12T18:00:00+00:00')


class MunicipalCollectionTests(unittest.TestCase):
    def test_reviewed_municipal_warning_banner_and_note_are_preserved(self):
        for section, bid, effective in [('79.130', '3732', '2014-08-28'), ('99.825', '51497', '2022-08-28')]:
            entry = {'id': section+':'+bid, 'section': section, 'versionId': bid, 'effectiveFrom': effective,
                     'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section='+section+'&bid='+bid}
            source = Path('tests/fixtures/municipal-'+section+'-'+bid+'.html').read_text()
            record = collect.parse_section(source, entry, '2026-11-12T20:00:00+00:00')
            self.assertTrue(record['hasConstitutionalWarning'])
            self.assertTrue(record['multipleEnactments'])
            self.assertIsNone(record['effectiveTo'])
            broken = source.replace('all or part is unconstitutional', '').replace('This section was declared unconstitutional', 'A court case is discussed')
            with self.assertRaises(ValueError):
                collect.parse_section(broken, entry, '2026-11-12T20:00:00+00:00')

    def test_municipal_reprint_requires_its_source_notice(self):
        entry = {'id': '99.825:33552', 'section': '99.825', 'versionId': '33552', 'effectiveFrom': '2016-08-28',
                 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=99.825&bid=33552'}
        source = Path('tests/fixtures/municipal-99.825-33552.html').read_text()
        record = collect.parse_section(source, entry, '2026-11-12T20:00:00+00:00')
        self.assertNotIn('hasConstitutionalWarning', record)
        self.assertTrue(record['multipleEnactments'])
        self.assertIsNone(record['effectiveTo'])
        with self.assertRaisesRegex(ValueError, 'Unverified delayed/reprinted'):
            collect.parse_section(source.replace('reprinted in accordance', 'printed differently'), entry, '2026-11-12T20:00:00+00:00')


class PublicOfficerCollectionTests(unittest.TestCase):
    def test_labor_warning_requires_banner_and_reviewed_case_notice(self):
        for section, bid in [('105.503', '34967'), ('105.525', '34969')]:
            with self.subTest(section=section):
                entry = {'id': section+':'+bid, 'section': section, 'versionId': bid, 'effectiveFrom': '2018-08-28',
                         'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section='+section+'&bid='+bid}
                source = Path('tests/fixtures/public-officers-'+section+'-'+bid+'.html').read_text()
                record = collect.parse_section(source, entry, '2026-11-12T22:00:00+00:00')
                self.assertTrue(record['hasConstitutionalWarning'])
                self.assertIsNone(record['effectiveTo'])
                self.assertNotIn('multipleEnactments', record)
                for broken in [source.replace('all or part is unconstitutional', ''),
                               source.replace('On June 1, 2021, this section was declared unconstitutional', 'A court case is discussed')]:
                    with self.assertRaisesRegex(ValueError, 'Unverified constitutional warning'):
                        collect.parse_section(broken, entry, '2026-11-12T22:00:00+00:00')

    def test_vaccination_section_warning_is_preserved_from_note_without_banner(self):
        entry = {'id': '105.1155:51508', 'section': '105.1155', 'versionId': '51508', 'effectiveFrom': '2022-08-28',
                 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=105.1155&bid=51508'}
        source = Path('tests/fixtures/public-officers-105.1155-51508.html').read_text()
        self.assertNotIn('all or part is unconstitutional', source)
        record = collect.parse_section(source, entry, '2026-11-12T22:00:00+00:00')
        self.assertTrue(record['hasConstitutionalWarning'])
        self.assertNotIn('multipleEnactments', record)
        with self.assertRaisesRegex(ValueError, 'Unverified constitutional warning'):
            collect.parse_section(source.replace('This section was declared unconstitutional', 'A court case is discussed'), entry, '2026-11-12T22:00:00+00:00')

class ElectionCollectionTests(unittest.TestCase):
    def parse_fixture(self, section, bid, effective):
        entry = {'id': section+':'+bid, 'section': section, 'versionId': bid, 'effectiveFrom': effective,
                 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section='+section+'&bid='+bid}
        source = Path('tests/fixtures/elections-'+section+'-'+bid+'.html').read_text()
        return entry, source, collect.parse_section(source, entry, '2026-11-12T23:00:00+00:00')

    def test_election_warning_and_reprint_require_their_distinct_source_notices(self):
        for bid, effective, warned in [('57131', '2025-08-28', True), ('6318', '1999-06-16', False)]:
            entry, source, record = self.parse_fixture('116.155', bid, effective)
            self.assertEqual(bool(record.get('hasConstitutionalWarning')), warned)
            self.assertTrue(record['multipleEnactments'])
            self.assertIsNone(record['effectiveTo'])
            marker = 'This section was declared unconstitutional' if warned else 'reprinted in accordance'
            with self.assertRaises(ValueError):
                collect.parse_section(source.replace(marker, 'different source notice'), entry, '2026-11-12T23:00:00+00:00')

    def test_referendum_pair_requires_version_specific_notices(self):
        for bid, effective, placeholder in [('58520', '2099-01-01', True), ('51003', '2022-05-18', False)]:
            entry, source, record = self.parse_fixture('128.345', bid, effective)
            self.assertEqual(bool(record.get('effectiveDateIsPlaceholder')), placeholder)
            self.assertTrue(record['multipleEnactments'])
            self.assertIsNone(record['effectiveTo'])
            marker = 'H.B. 1 will not go into effect unless and until approved by the voters.' if placeholder else 'being subject to a referendum on the November 2026 general election, both versions are printed.'
            with self.assertRaisesRegex(ValueError, 'Unverified contingent'):
                collect.parse_section(source.replace(marker, 'different conditions'), entry, '2026-11-12T23:00:00+00:00')
            with self.assertRaisesRegex(ValueError, 'Unverified contingent'):
                collect.parse_section(source.replace('There are multiple enactments of', 'Versions of'), entry, '2026-11-12T23:00:00+00:00')

    def test_single_congressional_placeholder_requires_label_and_conditions(self):
        entry, source, record = self.parse_fixture('128.471', '58523', '2099-01-01')
        self.assertTrue(record['effectiveDateIsPlaceholder'])
        self.assertNotIn('multipleEnactments', record)
        self.assertIsNone(record['effectiveTo'])
        for marker in ['date is placeholder', 'H.B. 1 will not go into effect unless and until approved by the voters.']:
            with self.assertRaises(ValueError):
                collect.parse_section(source.replace(marker, 'unverified'), entry, '2026-11-12T23:00:00+00:00')

class TaxationCollectionTests(unittest.TestCase):
    def test_delinquent_land_list_warning_and_reprint_require_exact_source_notices(self):
        for bid, effective, warned in [('51501', '2022-08-28', True), ('6932', '2015-08-28', False)]:
            entry = {'id': '140.170:'+bid, 'section': '140.170', 'versionId': bid, 'effectiveFrom': effective,
                     'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=140.170&bid='+bid}
            source = Path('tests/fixtures/taxation-140.170-'+bid+'.html').read_text()
            record = collect.parse_section(source, entry, '2026-11-12T23:00:00+00:00')
            self.assertEqual(bool(record.get('hasConstitutionalWarning')), warned)
            self.assertTrue(record['multipleEnactments'])
            self.assertIsNone(record['effectiveTo'])
            marker = 'This section was declared unconstitutional' if warned else 'reprinted in accordance'
            for broken in [source.replace(marker, 'different source notice'), source.replace('There are multiple enactments of', 'Versions of')]:
                with self.assertRaises(ValueError):
                    collect.parse_section(broken, entry, '2026-11-12T23:00:00+00:00')

class RemainingTaxationCollectionTests(unittest.TestCase):
    def test_empty_private_car_chapter_keeps_cross_references_out_of_section_index(self):
        source = Path('tests/fixtures/chapter-152-empty.html').read_text()
        self.assertIn('137.022', source)
        self.assertEqual(collect.parse_index(source, '152'), [])
        for bad in [source.replace('Cross References', 'Missing body'), source.replace('chapter=152&amp;idx=v', 'chapter=999&amp;idx=v')]:
            with self.assertRaisesRegex(ValueError, 'Unverified empty'):
                collect.parse_index(bad, '152')

class HealthCollectionTests(unittest.TestCase):
    def test_ambulance_district_warning_requires_the_reviewed_source_notice(self):
        entry = {'id': '190.088:9437', 'section': '190.088', 'versionId': '9437',
                 'effectiveFrom': '2014-08-28', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=190.088&bid=9437'}
        source = Path('tests/fixtures/health-190.088-warning.html').read_text()
        record = collect.parse_section(source, entry, '2026-11-13T07:49:59+00:00')
        self.assertTrue(record['hasConstitutionalWarning'])
        self.assertEqual(record['headingMarker'], '*')
        self.assertIsNone(record['effectiveTo'])
        self.assertNotIn('multipleEnactments', record)
        for bad in [source.replace('This section was declared unconstitutional in Calzone v. Koster, et al.', 'Different source notice'),
                    source.replace('all or part is unconstitutional', '').replace('This section was declared unconstitutional', 'A court case was discussed')]:
            with self.assertRaisesRegex(ValueError, 'Unverified constitutional warning'):
                collect.parse_section(bad, entry, '2026-11-13T07:49:59+00:00')

    def test_health_department_warning_and_reprint_require_exact_source_notices(self):
        for bid, effective, warned in [('9768', '2014-08-28', True), ('36197', '1919-08-07', False)]:
            entry = {'id': '192.310:'+bid, 'section': '192.310', 'versionId': bid, 'effectiveFrom': effective,
                     'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=192.310&bid='+bid}
            source = Path('tests/fixtures/health-192.310-'+bid+'.html').read_text()
            record = collect.parse_section(source, entry, '2026-11-13T08:13:44+00:00')
            self.assertEqual(bool(record.get('hasConstitutionalWarning')), warned)
            self.assertTrue(record['multipleEnactments'])
            self.assertIsNone(record['effectiveTo'])
            marker = 'This section was declared unconstitutional' if warned else 'reprinted in accordance'
            for broken in [source.replace(marker, 'different source notice'), source.replace('There are multiple enactments of', 'Versions of')]:
                with self.assertRaises(ValueError):
                    collect.parse_section(broken, entry, '2026-11-13T08:13:44+00:00')

    def test_transferred_air_conservation_index_requires_verified_empty_structure(self):
        source = Path('tests/fixtures/chapter-203-empty.html').read_text()
        self.assertEqual(collect.parse_index(source, '203'), [])
        for bad in [source.replace('Cross References', 'Missing body'), source.replace('chapter=203&amp;idx=v', 'chapter=643&amp;idx=v')]:
            with self.assertRaisesRegex(ValueError, 'Unverified empty'):
                collect.parse_index(bad, '203')

class CompactSourceTests(unittest.TestCase):
    def test_missing_heading_requires_exact_reviewed_index_row_and_source_identity(self):
        html = Path('tests/fixtures/compact-index-210.html').read_text()
        with unittest.mock.patch.dict(collect.CHAPTERS['210'], minimumVersions=1):
            entry = collect.parse_index(html, '210')[0]
            for bad in [html.replace('Compact enacted, text of compact.', 'Compact ...'), html.replace('8/28/2007', '8/28/2008')]:
                with self.assertRaisesRegex(ValueError, 'reviewed index heading'):
                    collect.parse_index(bad, '210')
        source = Path('tests/fixtures/compact-210.620-11394.html').read_text()
        record = collect.parse_section(source, entry, '2026-11-13T09:00:00+00:00')
        self.assertEqual(record['title'], 'Compact enacted, text of compact.')
        self.assertEqual(record['headingSource'], 'chapter-index')
        self.assertNotIn('indexHeading', record)
        for bad_entry in [{k:v for k,v in entry.items() if k != 'indexHeading'}, {**entry, 'indexHeading':'Invented heading'}]:
            with self.assertRaisesRegex(ValueError, 'index-heading exception'):
                collect.parse_section(source, bad_entry, '2026-11-13T09:00:00+00:00')
        for bad in [source.replace('RSMo Section 210.620', 'RSMo Section 210.625'), source.replace('hereby enacted', 'hereby changed'), source.replace('bid=11394', 'bid=99999'), source.replace('Contingent effective date', 'Different notice')]:
            with self.assertRaises(ValueError):
                collect.parse_section(bad, entry, '2026-11-13T09:00:00+00:00')

    def test_all_compact_pairs_require_exact_notices_and_preserve_nonplaceholder_dates(self):
        for policy in [p for p in collect.POLICY['contingentEnactments'] if p['section'] in ['210.620', '210.622', '210.625', '210.635', '210.640']]:
            for version in policy['versions']:
                sec = policy['section']; bid = version['versionId']
                entry = {'id':sec+':'+bid, 'section':sec,'versionId':bid,'effectiveFrom':version['effectiveFrom'], 'sourceUrl':f'https://revisor.mo.gov/main/OneSection.aspx?section={sec}&bid={bid}'}
                if entry['id']=='210.620:11394':entry['indexHeading']='Compact enacted, text of compact.'
                source = Path(f'tests/fixtures/compact-{sec}-{bid}.html').read_text()
                record = collect.parse_section(source, entry, '2026-11-13T09:00:00+00:00')
                self.assertEqual(bool(record.get('hasContingentEffectiveDate')),version['conditionPending'])
                self.assertNotIn('effectiveDateIsPlaceholder',record)
                self.assertIsNone(record['effectiveTo'])
                self.assertTrue(record['multipleEnactments'])
                self.assertEqual(record['effectiveFrom'],version['effectiveFrom'])
                for bad in [source.replace('Contingent effective date', 'Changed date').replace('contingent effective date', 'changed date'), source.replace('There are multiple enactments of', 'History of')]:
                    with self.assertRaisesRegex(ValueError, 'contingent'):
                        collect.parse_section(bad, entry, '2026-11-13T09:00:00+00:00')

class CorrectionsSourceTests(unittest.TestCase):
    def test_scheduled_corrections_pairs_preserve_explicit_source_intervals(self):
        for section, old_bid, old_date, new_bid in [('217.362','50061','2021-08-28','60694'), ('217.690','54802','2024-08-28','60695'), ('217.760','35661','2018-08-28','60696')]:
            for bid, start, end in [(old_bid,old_date,'2028-01-01'), (new_bid,'2028-01-01',None)]:
                entry={'id':section+':'+bid,'section':section,'versionId':bid,'effectiveFrom':start,'sourceUrl':f'https://revisor.mo.gov/main/OneSection.aspx?section={section}&bid={bid}'}
                source=Path(f'tests/fixtures/corrections-{section}-{bid}.html').read_text()
                record=collect.parse_section(source,entry,'2026-11-13T09:00:00+00:00')
                self.assertEqual(record['effectiveFrom'],start)
                self.assertEqual(record['effectiveTo'],end)
                self.assertEqual(record['headingMarker'],'*' if end else '')
                self.assertNotIn('multipleEnactments',record)
                self.assertNotIn('hasContingentEffectiveDate',record)
                with self.assertRaises(ValueError):
                    collect.parse_section(source,{**entry,'effectiveFrom':'2029-01-01'},'2026-11-13T09:00:00+00:00')

class RoadsSourceTests(unittest.TestCase):
    def test_road_reprints_require_the_exact_notices_and_preserve_warning_distinctions(self):
        for sec, warned in [('226.033','11971'),('238.212','51503'),('238.222','51504')]:
            policy=next(p for p in collect.POLICY['reprintedEnactments'] if p['section']==sec)
            for version in policy['versions']:
                bid=version['versionId'];entry={'id':sec+':'+bid,'section':sec,'versionId':bid,'effectiveFrom':version['effectiveFrom'],'sourceUrl':f'https://revisor.mo.gov/main/OneSection.aspx?section={sec}&bid={bid}'}
                source=Path(f'tests/fixtures/roads-{sec}-{bid}.html').read_text()
                record=collect.parse_section(source,entry,'2026-11-13T09:00:00+00:00')
                self.assertEqual(bool(record.get('hasConstitutionalWarning')),bid==warned)
                self.assertTrue(record['multipleEnactments'])
                self.assertIsNone(record['effectiveTo'])
                self.assertEqual(record['effectiveFrom'],entry['effectiveFrom'])
                for bad in [source.replace('declared unconstitutional','reconsidered'),source.replace('There are multiple enactments','There are histories')]:
                    with self.assertRaises(ValueError):collect.parse_section(bad,entry,'2026-11-13T09:00:00+00:00')

    def test_bill_warning_detection_requires_reference_to_the_other_printed_version(self):
        source=Path('tests/fixtures/roads-226.033-11971.html').read_text()
        entry={'id':'226.033:11971','section':'226.033','versionId':'11971','effectiveFrom':'2010-08-28','sourceUrl':'https://revisor.mo.gov/main/OneSection.aspx?section=226.033&bid=11971'}
        policies=collect.POLICY['reprintedEnactments'];without=[p for p in policies if p['section']!='226.033']
        with unittest.mock.patch.dict(collect.POLICY, constitutionalWarnings=[], reprintedEnactments=without):
            with unittest.mock.patch.object(collect,'REVIEWED_OVERLAPS',[p for p in collect.REVIEWED_OVERLAPS if p['section']!='226.033']):
                with self.assertRaisesRegex(ValueError,'Unverified constitutional warning'):
                    collect.parse_section(source,entry,'2026-11-13T09:00:00+00:00')
                current=source.replace('The other printed version of this section','This version of this section')
                self.assertNotIn('hasConstitutionalWarning',collect.parse_section(current,entry,'2026-11-13T09:00:00+00:00'))

class ConservationSourceTests(unittest.TestCase):
    def test_source_notes_do_not_invent_warnings_or_expiration_dates(self):
        cases = [{'id': '256.447:33559', 'section': '256.447', 'versionId': '33559', 'effectiveFrom': '2016-08-28', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=256.447&bid=33559'}, {'id': '260.295:51138', 'section': '260.295', 'versionId': '51138', 'effectiveFrom': '2022-08-28', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=260.295&bid=51138'}, {'id': '260.1092:14075', 'section': '260.1092', 'versionId': '14075', 'effectiveFrom': '2008-08-28', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=260.1092&bid=14075'}, {'id': '260.1101:14076', 'section': '260.1101', 'versionId': '14076', 'effectiveFrom': '2008-08-28', 'sourceUrl': 'https://revisor.mo.gov/main/OneSection.aspx?section=260.1101&bid=14076'}]
        for entry in cases:
            source=Path("tests/fixtures/conservation-"+entry["id"].replace(":","-")+".html").read_text()
            record=collect.parse_section(source,entry,"2026-11-13T10:00:00+00:00")
            self.assertEqual(record["headingMarker"], "" if entry["section"] == "260.1092" else "*")
            self.assertEqual(record["effectiveFrom"],entry["effectiveFrom"])
            self.assertIsNone(record["effectiveTo"])
            self.assertFalse(record.get("hasConstitutionalWarning"))
            self.assertFalse(record.get("hasContingentEffectiveDate"))
            with self.assertRaises(ValueError):
                collect.parse_section(source,{**entry,"versionId":"999999"},"2026-11-13T10:00:00+00:00")

class LaborSourceTests(unittest.TestCase):
    def test_five_labor_reprints_require_exact_notices_dates_and_warning_distinctions(self):
        for sec,warned in [('288.036','15216'),('288.060','15227'),('288.120','15236'),('288.122','15238'),('288.330','15271')]:
            policy=next(p for p in collect.POLICY['reprintedEnactments'] if p['section']==sec)
            for v in policy['versions']:
                bid=v['versionId'];entry={'id':sec+':'+bid,'section':sec,'versionId':bid,'effectiveFrom':v['effectiveFrom'],'sourceUrl':f'https://revisor.mo.gov/main/OneSection.aspx?section={sec}&bid={bid}'}
                source=Path(f'tests/fixtures/labor-{sec}-{bid}.html').read_text()
                record=collect.parse_section(source,entry,'2026-11-13T10:00:00+00:00')
                self.assertEqual(bool(record.get('hasConstitutionalWarning')),bid==warned)
                self.assertEqual(record['effectiveFrom'],v['effectiveFrom']);self.assertIsNone(record['effectiveTo'])
                self.assertTrue(record['multipleEnactments'])
                with self.assertRaises(ValueError):collect.parse_section(source.replace('declared unconstitutional','reconsidered'),entry,'2026-11-13T10:00:00+00:00')
    def test_certification_condition_preserves_ordinary_source_date_and_single_version(self):
        entry={'id':'288.501:15289','section':'288.501','versionId':'15289','effectiveFrom':'2009-06-12','sourceUrl':'https://revisor.mo.gov/main/OneSection.aspx?section=288.501&bid=15289'}
        source=Path('tests/fixtures/labor-288.501-15289.html').read_text()
        self.assertIn('shall not take effect',source)
        record=collect.parse_section(source,entry,'2026-11-13T10:00:00+00:00')
        self.assertTrue(record['hasContingentEffectiveDate']);self.assertIsNone(record['effectiveTo'])
        self.assertEqual(record['effectiveFrom'],'2009-06-12');self.assertFalse(record.get('effectiveDateIsPlaceholder'));self.assertFalse(record.get('multipleEnactments'))
        with self.assertRaises(ValueError):collect.parse_section(source.replace('contingent effective date','ordinary date'),entry,'2026-11-13T10:00:00+00:00')

class PublicSafetySourceTests(unittest.TestCase):
    def test_two_fire_district_reprints_require_exact_notices_dates_and_warning_distinctions(self):
        for sec,warned in [('321.320','34863'),('321.322','17170')]:
            policy=next(p for p in collect.POLICY['reprintedEnactments'] if p['section']==sec)
            for v in policy['versions']:
                bid=v['versionId'];entry={'id':sec+':'+bid,'section':sec,'versionId':bid,'effectiveFrom':v['effectiveFrom'],'sourceUrl':f'https://revisor.mo.gov/main/OneSection.aspx?section={sec}&bid={bid}'}
                source=Path(f'tests/fixtures/public-safety-{sec}-{bid}.html').read_text()
                record=collect.parse_section(source,entry,'2026-11-13T10:00:00+00:00')
                self.assertEqual(bool(record.get('hasConstitutionalWarning')),bid==warned)
                self.assertEqual(record['effectiveFrom'],v['effectiveFrom']);self.assertIsNone(record['effectiveTo'])
                self.assertTrue(record['multipleEnactments'])
                with self.assertRaises(ValueError):collect.parse_section(source.replace('declared unconstitutional','reconsidered'),entry,'2026-11-13T10:00:00+00:00')
    def test_bingo_source_records_voter_approval_and_resolved_date(self):
        for sec,bid,date in [('313.040','34988','2018-12-06'),('313.041','34989','2018-08-28')]:
            entry={'id':sec+':'+bid,'section':sec,'versionId':bid,'effectiveFrom':date,'sourceUrl':f'https://revisor.mo.gov/main/OneSection.aspx?section={sec}&bid={bid}'}
            source=Path(f'tests/fixtures/public-safety-{sec}-{bid}.html').read_text()
            if sec=='313.041':self.assertIn('voters approved',source);self.assertIn('December 6, 2018',source)
            record=collect.parse_section(source,entry,'2026-11-13T11:00:00+00:00')
            self.assertEqual(record['effectiveFrom'],date);self.assertIsNone(record['effectiveTo']);self.assertFalse(record.get('hasContingentEffectiveDate'));self.assertFalse(record.get('effectiveDateIsPlaceholder'))

class ProfessionsSourceTests(unittest.TestCase):
    def entry(self, sec, bid):
        v=next(v for p in collect.POLICY['contingentEnactments']+collect.POLICY['reprintedEnactments'] if p['section']==sec for v in p['versions'] if v['versionId']==bid)
        return {'id':sec+':'+bid,'section':sec,'versionId':bid,'effectiveFrom':v['effectiveFrom'],'sourceUrl':f'https://revisor.mo.gov/main/OneSection.aspx?section={sec}&bid={bid}'}
    def test_conditional_repeals_preserve_source_dates_and_require_exact_heading_notice_and_history(self):
        for sec,bid in [('324.406','60569'),('324.406','35854'),('324.424','60572'),('324.424','35859')]:
            e=self.entry(sec,bid);source=Path(f'tests/fixtures/professions-{sec}-{bid}.html').read_text();r=collect.parse_section(source,e,'2026-11-13T11:00:00+00:00')
            self.assertEqual(r['effectiveTo'],'2099-01-01');self.assertTrue(r['effectiveEndDateIsPlaceholder']);self.assertEqual(bool(r.get('effectiveDateIsPlaceholder')),bid in ['60569','60572'])
            mutations=[source.replace('1/1/2099','1/1/2098'),source.replace('S.B. 1233','S.B. 1234')]
            if bid in ['60569','60572']:mutations += [source.replace('date is placeholder','date is scheduled'),source.replace('324.440','324.441')]
            for bad in mutations:
                with self.assertRaises(ValueError):collect.parse_section(bad,e,'2026-11-13T11:00:00+00:00')
    def test_appraiser_reprint_and_warning_require_exact_source_notes(self):
        for sec,bid,date in [('339.507','18172','2014-08-28'),('339.507','36199','2008-08-28'),('339.531','18185','2015-08-28')]:
            e={'id':sec+':'+bid,'section':sec,'versionId':bid,'effectiveFrom':date,'sourceUrl':f'https://revisor.mo.gov/main/OneSection.aspx?section={sec}&bid={bid}'}
            source=Path(f'tests/fixtures/professions-{sec}-{bid}.html').read_text();r=collect.parse_section(source,e,'2026-11-13T11:00:00+00:00');self.assertEqual(bool(r.get('hasConstitutionalWarning')),bid!='36199');self.assertIsNone(r['effectiveTo'])
            with self.assertRaises(ValueError):collect.parse_section(source.replace('declared unconstitutional','reconsidered'),e,'2026-11-13T11:00:00+00:00')
    def test_empty_stationary_engineers_index_requires_the_official_shell(self):
        source=Path('tests/fixtures/professions-342-index.html').read_text();self.assertEqual(collect.parse_index(source,'342'),[])
        with self.assertRaises(ValueError):collect.parse_index(source.replace('Cross References','Missing references'),'342')
    def test_conditions_resolved_in_source_notes_keep_recorded_dates(self):
        for sec,bid,date,notice in [('324.016','17248','2008-08-28','appropriations specified in this section have been made'),('335.420','33831','2016-08-28','July 20, 2017'),('337.170','35922','2018-08-28','December 22, 2020'),('335.365', '33784', '2017-07-20', '20 Jul 2017'),('337.135', '35899', '2020-12-22', '22 Dec 2020')]:
            e={'id':sec+':'+bid,'section':sec,'versionId':bid,'effectiveFrom':date,'sourceUrl':f'https://revisor.mo.gov/main/OneSection.aspx?section={sec}&bid={bid}'}
            source=Path(f'tests/fixtures/professions-{sec}-{bid}.html').read_text();self.assertIn(notice,source);r=collect.parse_section(source,e,'2026-11-13T11:00:00+00:00');self.assertFalse(r.get('hasContingentEffectiveDate'));self.assertEqual(r['effectiveFrom'],date)
    def test_validator_rejects_unreviewed_placeholder_end_dates(self):
        import copy, os
        data=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text())
        collect.validate(data)
        for id in ['324.406:60569','324.406:35854','324.424:60572','324.424:35859']:
            for field,value in [('effectiveEndDateIsPlaceholder',False),('effectiveTo','2098-01-01')]:
                bad=copy.deepcopy(data);r=next(r for r in bad['records'] if r['id']==id);r[field]=value
                with self.assertRaises(ValueError):collect.validate(bad)
        bad=copy.deepcopy(data);r=next(r for r in bad['records'] if r['section']=='1.010');r['effectiveEndDateIsPlaceholder']=True
        with self.assertRaises(ValueError):collect.validate(bad)

class CorporationsSourceTests(unittest.TestCase):
    def entry(self, id):
        import os
        data=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text())
        record=next(r for r in data['records'] if r['id']==id)
        return {k:record[k] for k in ['id','section','versionId','effectiveFrom','sourceUrl']}
    def test_warned_reprinted_and_annotation_pages_require_their_exact_notices(self):
        for p in collect.POLICY['constitutionalWarnings']:
            if not p['id'].startswith('348.'):continue
            e=self.entry(p['id']);source=Path('tests/fixtures/corporations-'+p['id'].replace(':','-')+'.html').read_text()
            result=collect.parse_section(source,e,'2026-11-13T11:45:00+00:00');self.assertTrue(result['hasConstitutionalWarning']);self.assertIsNone(result['effectiveTo']);self.assertFalse(result.get('hasContingentEffectiveDate'))
            soup=collect.BeautifulSoup(source,'html.parser')
            for notice in [p['sourceNotice']]+p.get('requiredSourceNotices',[]):
                changed=collect.BeautifulSoup(str(soup),'html.parser');paragraph=next(t for t in changed.select('p') if collect.clean(t.get_text(' '))==notice);paragraph.decompose()
                with self.assertRaises(ValueError):collect.parse_section(str(changed),e,'2026-11-13T11:45:00+00:00')
        for p in collect.POLICY['reprintedEnactments']:
            if not p['section'].startswith('348.'):continue
            v=p['versions'][1];id=p['section']+':'+v['versionId'];e=self.entry(id);source=Path('tests/fixtures/corporations-'+id.replace(':','-')+'.html').read_text();result=collect.parse_section(source,e,'2026-11-13T11:45:00+00:00');self.assertTrue(result['multipleEnactments']);self.assertFalse(result.get('hasConstitutionalWarning'))
            with self.assertRaises(ValueError):collect.parse_section(source.replace('This section is reprinted','This section is omitted'),e,'2026-11-13T11:45:00+00:00')
    def test_standalone_reprint_requires_exact_notice_and_does_not_invent_another_version(self):
        e=self.entry('348.253:18575');source=Path('tests/fixtures/corporations-348.253-18575.html').read_text();result=collect.parse_section(source,e,'2026-11-13T11:45:00+00:00');self.assertFalse(result.get('multipleEnactments'));self.assertFalse(result.get('hasConstitutionalWarning'));self.assertIsNone(result['effectiveTo'])
        for bad in [source.replace('This section is reprinted','This section is omitted'),source.replace('</body>','<p>There are multiple enactments of 348.253</p></body>')]:
            with self.assertRaises(ValueError):collect.parse_section(bad,e,'2026-11-13T11:45:00+00:00')
    def test_hypothetical_rulemaking_boilerplate_is_not_a_constitutional_warning(self):
        for path in Path('tests/fixtures').glob('corporations-348.*.html'):
            if not any('-'+sec+'-' in path.name for sec in ['348.235','348.407']):continue
            section,bid=path.stem.removeprefix('corporations-').split('-');e=self.entry(section+':'+bid);source=path.read_text();self.assertIn('unconstitutional',source);r=collect.parse_section(source,e,'2026-11-13T11:45:00+00:00');self.assertFalse(r.get('hasConstitutionalWarning'))
    def test_dataset_validator_rejects_changed_standalone_reprint_and_missing_warning(self):
        import copy,os
        data=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text())
        for field,value in [('effectiveFrom','1996-08-28'),('effectiveTo','2012-02-03'),('multipleEnactments',True)]:
            bad=copy.deepcopy(data);next(r for r in bad['records'] if r['id']=='348.253:18575')[field]=value
            with self.assertRaises(ValueError):collect.validate(bad)
        bad=copy.deepcopy(data);del next(r for r in bad['records'] if r['id']=='348.280:18594')['hasConstitutionalWarning']
        with self.assertRaises(ValueError):collect.validate(bad)

class BankingSourceTests(unittest.TestCase):
    def entry(self,id):
        import os
        data=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text());record=next(r for r in data['records'] if r['id']==id)
        return {k:record[k] for k in ['id','section','versionId','effectiveFrom','sourceUrl']}
    def test_unrelated_source_responses_fail_and_exact_retry_pages_pass(self):
        for id in ['362.464:19746','369.079:47586','369.086:19922','370.030:48623','370.366:20079']:
            e=self.entry(id);name=id.replace(':','-');source=Path(f'tests/fixtures/banking-{name}.html').read_text();r=collect.parse_section(source,e,'2026-11-13T11:55:00+00:00');self.assertEqual(r['id'],id);self.assertEqual(r['sourceUrl'],e['sourceUrl']);self.assertEqual(r['effectiveFrom'],e['effectiveFrom'])
            rejected=Path(f'tests/fixtures/banking-rejected-{name}.html').read_text()
            with self.assertRaisesRegex(ValueError,'Unexpected heading'):collect.parse_section(rejected,e,'2026-11-13T11:55:00+00:00')
    def test_hypothetical_rulemaking_condition_does_not_become_a_constitutional_warning(self):
        e=self.entry('361.933:54889');source=Path('tests/fixtures/banking-361.933-54889.html').read_text();self.assertIn('subsequently held unconstitutional',source);r=collect.parse_section(source,e,'2026-11-13T11:55:00+00:00');self.assertFalse(r.get('hasConstitutionalWarning'));self.assertFalse(r.get('hasContingentEffectiveDate'));self.assertEqual(r['effectiveFrom'],'2024-08-28')

class InsuranceSourceTests(unittest.TestCase):
    def entry(self,id):
        import os
        data=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text());record=next(r for r in data['records'] if r['id']==id)
        return {k:record[k] for k in ['id','section','versionId','effectiveFrom','sourceUrl']}
    def test_conflicting_enactments_require_exact_dates_notices_and_banner(self):
        for id,date in [('376.1516:20990','2008-01-01'),('376.1516:20991','2007-08-28')]:
            e=self.entry(id);source=Path('tests/fixtures/insurance-'+id.replace(':','-')+'.html').read_text();r=collect.parse_section(source,e,'2026-11-13T12:10:00+00:00');self.assertEqual(r['effectiveFrom'],date);self.assertIsNone(r['effectiveTo']);self.assertTrue(r['multipleEnactments']);self.assertFalse(r.get('hasConstitutionalWarning'))
            for bad in [source.replace('Due to possible conflict','Conflict resolved'),source.replace('There are multiple enactments of','No multiple enactments of'),source.replace('H.B. 818','H.B. 819')]:
                with self.assertRaises(ValueError):collect.parse_section(bad,e,'2026-11-13T12:10:00+00:00')
    def test_other_section_repeal_and_partial_conditions_do_not_flag_whole_section(self):
        for id,notice in [('375.024:20251','subsequently held unconstitutional'),('376.426:20699','provisions of subdivisions (19) and (20)'),('376.1387:20976','scope of judicial review'),('381.025:21442','Section 381.141 was repealed')]:
            e=self.entry(id);source=Path('tests/fixtures/insurance-'+id.replace(':','-')+'.html').read_text();self.assertIn(notice,collect.clean(collect.BeautifulSoup(source,'html.parser').get_text(' ')));r=collect.parse_section(source,e,'2026-11-13T12:10:00+00:00');self.assertFalse(r.get('hasConstitutionalWarning'));self.assertFalse(r.get('hasContingentEffectiveDate'));self.assertIsNone(r['effectiveTo'])
    def test_validator_rejects_altered_or_incomplete_conflict_pair(self):
        import copy,os
        data=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text())
        for field,value in [('effectiveFrom','2007-08-28'),('effectiveTo','2009-01-01'),('multipleEnactments',False)]:
            bad=copy.deepcopy(data);next(r for r in bad['records'] if r['id']=='376.1516:20990')[field]=value
            with self.assertRaises(ValueError):collect.validate(bad)
        bad=copy.deepcopy(data);bad['records']=[r for r in bad['records'] if r['id']!='376.1516:20990']
        with self.assertRaises(ValueError):collect.validate(bad)

class UtilitiesSourceTests(unittest.TestCase):
    def entry(self,id):
        import os
        data=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text());record=next(r for r in data['records'] if r['id']==id)
        return {k:record[k] for k in ['id','section','versionId','effectiveFrom','sourceUrl']}
    def test_unrelated_source_responses_fail_and_exact_retry_pages_pass(self):
        for id in ['386.800:49595','388.310:21823','392.361:22033']:
            e=self.entry(id);name=id.replace(':','-');source=Path(f'tests/fixtures/utilities-{name}.html').read_text();r=collect.parse_section(source,e,'2026-11-13T12:30:00+00:00');self.assertEqual(r['id'],id);self.assertEqual(r['sourceUrl'],e['sourceUrl']);self.assertEqual(r['effectiveFrom'],e['effectiveFrom'])
            rejected=Path(f'tests/fixtures/utilities-rejected-{name}.html').read_text()
            with self.assertRaisesRegex(ValueError,'Unexpected heading'):collect.parse_section(rejected,e,'2026-11-13T12:30:00+00:00')
    def test_hypothetical_rulemaking_condition_does_not_become_a_constitutional_warning(self):
        from bs4 import BeautifulSoup
        for id in ['390.021:21925','393.1030:57330']:
            e=self.entry(id);source=Path(f'tests/fixtures/utilities-{id.replace(":","-")}.html').read_text();self.assertIn('subsequently held unconstitutional',' '.join(BeautifulSoup(source,'html.parser').stripped_strings));r=collect.parse_section(source,e,'2026-11-13T12:30:00+00:00');self.assertFalse(r.get('hasConstitutionalWarning'));self.assertFalse(r.get('hasContingentEffectiveDate'));self.assertEqual(r['effectiveFrom'],e['effectiveFrom'])

class CommerceSourceTests(unittest.TestCase):
    def entry(self,id):
        import os
        data=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text());record=next(r for r in data['records'] if r['id']==id)
        return {k:record[k] for k in ['id','section','versionId','effectiveFrom','sourceUrl']}
    def test_reviewed_citation_formats(self):
        formats=json.loads(Path('tests/citation-formats.json').read_text())
        for section in formats['valid']:self.assertTrue(collect.valid_section(section,section.split('.')[0]),section)
        for section in formats['invalid']:self.assertFalse(collect.valid_section(section,section.split('.')[0]),section)
    def test_full_article_indexes_preserve_source_identities(self):
        for chapter,count in [('400',623),('409',111)]:
            source=Path(f'tests/fixtures/commerce-index-{chapter}.html').read_text();entries=collect.parse_index(source,chapter);self.assertEqual(len(entries),count)
            for e in entries:self.assertEqual(e['sourceUrl'],f'https://revisor.mo.gov/main/OneSection.aspx?section={e["section"]}&bid={e["versionId"]}')
            original='400.2A-101' if chapter=='400' else '409.1-101'
            malformed='400.2a-101' if chapter=='400' else '409.8-101'
            with self.assertRaisesRegex(ValueError,'Malformed source identity'):collect.parse_index(source.replace(original,malformed),chapter)
    def test_unrelated_responses_fail_and_exact_retries_pass(self):
        for id in json.loads(Path('tests/commerce-rejected-identities.json').read_text()):
            e=self.entry(id);name=id.replace(':','-');source=Path(f'tests/fixtures/commerce-{name}.html').read_text();r=collect.parse_section(source,e,'2026-11-13T12:50:00+00:00');self.assertEqual(r['id'],id);self.assertEqual(r['sourceUrl'],e['sourceUrl']);self.assertEqual(r['effectiveFrom'],e['effectiveFrom'])
            with self.assertRaises(ValueError):collect.parse_section(Path(f'tests/fixtures/commerce-rejected-{name}.html').read_text(),e,'2026-11-13T12:50:00+00:00')
    def test_warning_requires_exact_note_and_annotation(self):
        from bs4 import BeautifulSoup
        e=self.entry('407.1610:23330');source=Path('tests/fixtures/commerce-407.1610-23330.html').read_text();r=collect.parse_section(source,e,'2026-11-13T12:50:00+00:00');self.assertTrue(r['hasConstitutionalWarning']);self.assertEqual(r['headingMarker'],'*');self.assertEqual(r['effectiveFrom'],'2014-08-28')
        for phrase in ["*Revisor's Note:",'(2016)']:
            soup=BeautifulSoup(source,'html.parser');target=next(p for p in soup.select('p') if ' '.join(p.get_text(' ').split()).startswith(phrase));target.decompose()
            with self.assertRaisesRegex(ValueError,'Unverified constitutional warning'):collect.parse_section(str(soup),e,'2026-11-13T12:50:00+00:00')
    def test_amendment_annotation_is_preserved_without_invented_whole_section_ruling(self):
        from bs4 import BeautifulSoup
        e=self.entry('416.615:23820');source=Path('tests/fixtures/commerce-416.615-23820.html').read_text();r=collect.parse_section(source,e,'2026-11-13T12:50:00+00:00');self.assertTrue(r['hasConstitutionalWarning']);self.assertEqual(r['effectiveFrom'],'1995-08-28');self.assertFalse(r.get('headingMarker'))
        soup=BeautifulSoup(source,'html.parser');next(p for p in soup.select('p') if ' '.join(p.get_text(' ').split()).startswith('(1996)')).decompose()
        with self.assertRaisesRegex(ValueError,'Unverified constitutional warning'):collect.parse_section(str(soup),e,'2026-11-13T12:50:00+00:00')
    def test_nonwarning_annotations_and_hypothetical_rules_remain_ordinary(self):
        from bs4 import BeautifulSoup
        for id,phrase in [('407.040:23007','not unconstitutional'),('407.926:23218','subsequently held unconstitutional'),('409.6-605:23579','subsequently held unconstitutional')]:
            source=Path(f'tests/fixtures/commerce-{id.replace(":","-")}.html').read_text();self.assertIn(phrase,' '.join(BeautifulSoup(source,'html.parser').stripped_strings));r=collect.parse_section(source,self.entry(id),'2026-11-13T12:50:00+00:00');self.assertFalse(r.get('hasConstitutionalWarning'));self.assertFalse(r.get('hasContingentEffectiveDate'))
    def test_article_heading_must_match_letter_and_selected_version(self):
        from bs4 import BeautifulSoup
        e=next(e for e in collect.parse_index(Path('tests/fixtures/commerce-index-400.html').read_text(),'400') if e['section']=='400.2A-101');source=Path(f'tests/fixtures/commerce-{e["id"].replace(":","-")}.html').read_text();r=collect.parse_section(source,e,'2026-11-13T12:50:00+00:00');self.assertEqual(r['section'],'400.2A-101')
        soup=BeautifulSoup(source,'html.parser');heading=soup.select_one('div.norm > p.norm > span.bold');heading.string=heading.get_text().replace('400.2A-101','400.2-101')
        with self.assertRaisesRegex(ValueError,'Unexpected heading'):collect.parse_section(str(soup),e,'2026-11-13T12:50:00+00:00')
        soup=BeautifulSoup(source,'html.parser');nav=soup.select_one('#farw') or soup.select_one('#barw');nav['href']=nav['href'].replace(e['versionId'],'999999')
        with self.assertRaisesRegex(ValueError,'Wrong selected version'):collect.parse_section(str(soup),e,'2026-11-13T12:50:00+00:00')

class ObligationsSourceTests(unittest.TestCase):
    def test_unrelated_responses_fail_and_exact_retries_preserve_identity_and_dates(self):
        import os
        data=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text())
        for id in ['436.405:24311','436.470:24328']:
            record=next(r for r in data['records'] if r['id']==id);e={k:record[k] for k in ['id','section','versionId','effectiveFrom','sourceUrl']};name=id.replace(':','-');source=Path(f'tests/fixtures/obligations-{name}.html').read_text();r=collect.parse_section(source,e,'2026-11-13T13:05:00+00:00');self.assertEqual(r['id'],id);self.assertEqual(r['sourceUrl'],e['sourceUrl']);self.assertEqual(r['effectiveFrom'],e['effectiveFrom'])
            with self.assertRaisesRegex(ValueError,'Unexpected heading'):collect.parse_section(Path(f'tests/fixtures/obligations-rejected-{name}.html').read_text(),e,'2026-11-13T13:05:00+00:00')

class PropertySourceTests(unittest.TestCase):
    def entry(self,id):
        import os
        d=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text());record=next(r for r in d['records'] if r['id']==id)
        return {k:record[k] for k in ['id','section','versionId','effectiveFrom','sourceUrl']}
    def test_complete_condominium_index_and_malformed_neighbor_citation(self):
        source=Path('tests/fixtures/property-index-448.html').read_text();entries=collect.parse_index(source,'448');self.assertEqual(len(entries),97)
        self.assertIn('448.3-116',[e['section'] for e in entries]);self.assertIn('448.005',[e['section'] for e in entries])
        with self.assertRaisesRegex(ValueError,'Malformed source identity'):collect.parse_index(source.replace('448.1-101','448.5-101'),'448')
    def test_warning_requires_exact_annotation_and_date(self):
        from bs4 import BeautifulSoup
        e=self.entry('447.575:24826');source=Path('tests/fixtures/property-447.575-24826.html').read_text();r=collect.parse_section(source,e,'2026-11-13T13:20:00+00:00');self.assertTrue(r['hasConstitutionalWarning']);self.assertEqual(r['effectiveFrom'],'1994-07-01');self.assertFalse(r.get('effectiveTo'))
        soup=BeautifulSoup(source,'html.parser');next(p for p in soup.select('p') if ' '.join(p.get_text(' ').split()).startswith('(2002)')).decompose()
        with self.assertRaisesRegex(ValueError,'Unverified constitutional warning'):collect.parse_section(str(soup),e,'2026-11-13T13:20:00+00:00')
    def test_surviving_identical_amendment_and_rejected_challenges_remain_ordinary(self):
        from bs4 import BeautifulSoup
        for id,phrase in [('442.130:51139','The H.B. 1662 language remains in effect.'),('442.571:24477','not unconstitutional'),('448.3-116:24932','not unconstitutionally vague or overbroad')]:
            source=Path(f'tests/fixtures/property-{id.replace(":","-")}.html').read_text();text=' '.join(BeautifulSoup(source,'html.parser').stripped_strings);self.assertIn(phrase,text)
            if id=='442.130:51139':self.assertIn('The remaining provisions of H.B. 1606 could not be severed and the bill is declared invalid in its entirety.',text)
            e=self.entry(id);r=collect.parse_section(source,e,'2026-11-13T13:20:00+00:00');self.assertFalse(r.get('hasConstitutionalWarning'));self.assertEqual(r['effectiveFrom'],e['effectiveFrom']);self.assertEqual(r['sourceUrl'],e['sourceUrl'])
    def test_condominium_heading_must_match_article_identity(self):
        from bs4 import BeautifulSoup
        e=self.entry('448.3-116:24932');source=Path('tests/fixtures/property-448.3-116-24932.html').read_text();soup=BeautifulSoup(source,'html.parser');heading=soup.select_one('div.norm > p.norm > span.bold');heading.string=heading.get_text().replace('448.3-116','448.2-116')
        with self.assertRaisesRegex(ValueError,'Unexpected heading'):collect.parse_section(str(soup),e,'2026-11-13T13:20:00+00:00')

class DomesticSourceTests(unittest.TestCase):
    def entry(self,id):
        import os
        d=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text());record=next(r for r in d['records'] if r['id']==id)
        return {k:record[k] for k in ['id','section','versionId','effectiveFrom','sourceUrl']}
    def test_marriage_warning_requires_all_three_literal_annotations(self):
        from bs4 import BeautifulSoup
        e=self.entry('451.022:24958');source=Path('tests/fixtures/domestic-451.022-24958.html').read_text();r=collect.parse_section(source,e,'2026-11-13T13:35:00+00:00');self.assertTrue(r['hasConstitutionalWarning']);self.assertEqual(r['effectiveFrom'],'2001-08-28');self.assertFalse(r.get('effectiveTo'))
        policy=next(p for p in collect.POLICY['constitutionalWarnings'] if p['id']==e['id']);notices=[policy['sourceNotice']]+policy['requiredSourceNotices'];self.assertEqual(len(notices),3);self.assertTrue(any(n.startswith('(2014)') and 'Obergefell' in n for n in notices))
        for notice in notices:
            soup=BeautifulSoup(source,'html.parser');next(p for p in soup.select('p') if collect.clean(p.get_text(' '))==notice).decompose()
            with self.assertRaisesRegex(ValueError,'Unverified constitutional warning'):collect.parse_section(str(soup),e,'2026-11-13T13:35:00+00:00')
    def test_historical_as_applied_license_annotation_retains_current_source_date_and_procedures(self):
        from bs4 import BeautifulSoup
        e=self.entry('451.040:57670');source=Path('tests/fixtures/domestic-451.040-57670.html').read_text();soup=BeautifulSoup(source,'html.parser');text=collect.clean(soup.get_text(' '));self.assertIn('or electronically through an online process',text);self.assertIn('An affidavit or sworn statement is submitted by the incarcerated or military applicant',text);self.assertIn('A.L. 2025 H.B. 737 & 486 merged with S.B. 43',text)
        r=collect.parse_section(source,e,'2026-11-13T13:35:00+00:00');self.assertTrue(r['hasConstitutionalWarning']);self.assertEqual(r['effectiveFrom'],'2025-08-28');self.assertFalse(r.get('effectiveTo'));self.assertEqual(r['sourceUrl'],e['sourceUrl'])
        next(p for p in soup.select('p') if collect.clean(p.get_text(' ')).startswith('(2014)')).decompose()
        with self.assertRaisesRegex(ValueError,'Unverified constitutional warning'):collect.parse_section(str(soup),e,'2026-11-13T13:35:00+00:00')
    def test_adoption_and_protection_order_annotations_rejecting_challenges_remain_ordinary(self):
        from bs4 import BeautifulSoup
        for id,phrase in [('453.120:25163','did not unconstitutionally infringe'),('455.085:51051','not unconstitutionally vague')]:
            source=Path(f'tests/fixtures/domestic-{id.replace(":","-")}.html').read_text();self.assertIn(phrase,collect.clean(BeautifulSoup(source,'html.parser').get_text(' ')));e=self.entry(id);r=collect.parse_section(source,e,'2026-11-13T13:35:00+00:00');self.assertFalse(r.get('hasConstitutionalWarning'));self.assertEqual(r['effectiveFrom'],e['effectiveFrom']);self.assertEqual(r['sourceUrl'],e['sourceUrl'])

class EstatesCourtsSourceTests(unittest.TestCase):
    def entry(self,id):
        import os
        d=json.loads(Path(os.environ.get('STATUTES_DATASET','public/data/statutes.json')).read_text());record=next(r for r in d['records'] if r['id']==id)
        return {k:record[k] for k in ['id','section','versionId','effectiveFrom','sourceUrl']}
    def test_complete_trust_index_and_exact_terminal_letters(self):
        source=Path('tests/fixtures/estates-courts-index-456.html').read_text();entries=collect.parse_index(source,'456');self.assertEqual(len(entries),157)
        for section in ['456.4-411A','456.4-411B','456.10-1001','456.11-1106']:self.assertIn(section,[e['section'] for e in entries])
        for malformed in ['456.4-411a','456.4-411C','456.4-412A']:
            with self.assertRaisesRegex(ValueError,'Malformed source identity'):collect.parse_index(source.replace('456.4-411A',malformed),'456')
    def test_empty_convicts_index_requires_explicit_review_and_correct_identity(self):
        source=Path('tests/fixtures/estates-courts-index-460.html').read_text();self.assertEqual(collect.parse_index(source,'460'),[])
        review=collect.CHAPTERS['460'].pop('emptyIndexReviewedAt')
        try:
            with self.assertRaisesRegex(ValueError,'Unverified empty'):collect.parse_index(source,'460')
        finally:collect.CHAPTERS['460']['emptyIndexReviewedAt']=review
        with self.assertRaises(ValueError):collect.parse_index(source.replace('Chapter 460','Chapter 461'),'460')
    def test_trust_heading_and_version_identity_cannot_switch_terminal_letters(self):
        from bs4 import BeautifulSoup
        es=collect.parse_index(Path('tests/fixtures/estates-courts-index-456.html').read_text(),'456')
        for section in ['456.4-411A','456.4-411B','456.10-1001','456.11-1106']:
            e=next(e for e in es if e['section']==section);source=Path(f'tests/fixtures/estates-courts-{e["id"].replace(":","-")}.html').read_text();r=collect.parse_section(source,e,'2026-11-13T13:50:00+00:00');self.assertEqual(r['sourceUrl'],e['sourceUrl']);self.assertEqual(r['section'],section)
            soup=BeautifulSoup(source,'html.parser');heading=soup.select_one('div.norm > p.norm > span.bold');heading.string=heading.get_text().replace(section,'456.4-411B' if section.endswith('A') else '456.4-411A')
            with self.assertRaisesRegex(ValueError,'Unexpected heading'):collect.parse_section(str(soup),e,'2026-11-13T13:50:00+00:00')
    def test_rejected_source_identity_or_date_fails_and_exact_replacement_passes(self):
        for id in json.loads(Path('tests/estates-courts-rejected-identities.json').read_text()):
            e=self.entry(id);name=id.replace(':','-');source=Path(f'tests/fixtures/estates-courts-{name}.html').read_text();r=collect.parse_section(source,e,'2026-11-13T13:50:00+00:00');self.assertEqual(r['id'],id);self.assertEqual(r['effectiveFrom'],e['effectiveFrom']);self.assertEqual(r['sourceUrl'],e['sourceUrl'])
            with self.assertRaises(ValueError):collect.parse_section(Path(f'tests/fixtures/estates-courts-rejected-{name}.html').read_text(),e,'2026-11-13T13:50:00+00:00')
    def test_competing_versions_require_exact_notice_and_keep_both_blank_ends(self):
        from bs4 import BeautifulSoup
        for id,phrase in [('483.140:26858','without the agreement of all parties'),('483.140:26859','without notification to the parties and providing the parties an opportunity to respond')]:
            e=self.entry(id);source=Path(f'tests/fixtures/estates-courts-{id.replace(":","-")}.html').read_text();soup=BeautifulSoup(source,'html.parser');self.assertIn(phrase,collect.clean(soup.get_text(' ')));r=collect.parse_section(source,e,'2026-11-13T13:50:00+00:00');self.assertEqual(r['effectiveFrom'],'2014-08-28');self.assertIsNone(r['effectiveTo']);self.assertTrue(r['multipleEnactments'])
            next(p for p in soup.select('p') if collect.clean(p.get_text(' ')).startswith('*This section was amended')).decompose()
            with self.assertRaisesRegex(ValueError,'Unverified concurrent'):collect.parse_section(str(soup),e,'2026-11-13T13:50:00+00:00')
    def test_each_reviewed_warning_requires_every_exact_annotation(self):
        from bs4 import BeautifulSoup
        for id in ['472.020:25977','479.359:33329','487.030:26987','487.080:26992']:
            e=self.entry(id);source=Path(f'tests/fixtures/estates-courts-{id.replace(":","-")}.html').read_text();r=collect.parse_section(source,e,'2026-11-13T13:50:00+00:00');self.assertTrue(r['hasConstitutionalWarning']);self.assertEqual(r['effectiveFrom'],e['effectiveFrom']);policy=next(p for p in collect.POLICY['constitutionalWarnings'] if p['id']==id)
            for notice in [policy['sourceNotice']]+policy.get('requiredSourceNotices',[]):
                soup=BeautifulSoup(source,'html.parser');next(p for p in soup.select('p') if collect.clean(p.get_text(' '))==notice).decompose()
                with self.assertRaisesRegex(ValueError,'Unverified constitutional warning'):collect.parse_section(str(soup),e,'2026-11-13T13:50:00+00:00')
    def test_scoped_historical_and_severance_context_is_retained(self):
        from bs4 import BeautifulSoup
        for id,phrases in [('472.020:25977',['A.L. 1983 S.B. 44 & 45','insofar as they purport to grant jurisdiction']),('479.359:33329',['Classification is severed from remainder of section','20 percent statewide']),('487.030:26987',['(1999)','(2003)','Rule 130 supersede']),('487.080:26992',['A.L. 2014 H.B. 1299 Revision','to extent that it purports to limit'])]:
            text=collect.clean(BeautifulSoup(Path(f'tests/fixtures/estates-courts-{id.replace(":","-")}.html').read_text(),'html.parser').get_text(' '))
            for phrase in phrases:self.assertIn(phrase,text)
