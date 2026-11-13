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
