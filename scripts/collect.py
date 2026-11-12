"""Collect the configured Missouri statute headings, preserving source version identities.

Run from repository root. Network fetches are sequential, >=1 second apart.
No existing validated dataset is overwritten by collection.
"""
import argparse
from contextlib import contextmanager
import os
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import time
from urllib.parse import parse_qs, urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
from bs4 import BeautifulSoup

BASE = 'https://revisor.mo.gov'
POLICY = json.loads((Path(__file__).resolve().parent.parent / 'data/coverage.json').read_text())
CHAPTERS = {c['chapter']: c for c in POLICY['chapters']}
REVIEWED_OVERLAPS = POLICY.get('delayedEnactments', []) + POLICY.get('reprintedEnactments', [])

def index_url(chapter):
    return BASE + '/main/OneChapter.aspx?chapter=' + chapter
AGENT = 'ShowMeStatutes/0.1 (+https://github.com/edwardedmonds/showmestatutes.org)'


def clean(text):
    return re.sub(r'\s+', ' ', text).strip()


def date(value):
    for fmt in ('%m/%d/%Y', '%d %b %Y'):
        try:
            return datetime.strptime(clean(value), fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError(f'Unrecognized effective date: {value}')


def parse_index(html, chapter='565'):
    soup = BeautifulSoup(html, 'html.parser')
    entries = {}
    rows = {}
    if not soup.title or not re.search(r'\bChapter ' + re.escape(chapter) + r'\b', soup.title.get_text()):
        raise ValueError('Incomplete or wrong chapter index: ' + chapter)
    for a in soup.select('a[href]'):
        query = parse_qs(urlparse(a['href']).query)
        section = query.get('section', [''])[0]
        bid = query.get('bid', [''])[0]
        if urlparse(a['href']).path != '/main/PageSelect.aspx':
            continue
        if not section.startswith(chapter + '.'):
            raise ValueError('Wrong chapter in source index: ' + section)
        if not re.fullmatch(re.escape(chapter) + r'\.\d{3,4}', section) or not bid.isdigit():
            raise ValueError('Malformed source identity: ' + section)
        row = a.find_parent('tr')
        match = re.search(r'\((\d+/\d+/\d+)\)\s*$', clean(row.get_text(' ')))
        if not match:
            raise ValueError(f'Missing index date: {section}/{bid}')
        key = section + ':' + bid
        row_text = clean(row.get_text(' '))
        if key in entries:
            if rows[key] != row_text:
                raise ValueError(f'Conflicting duplicate index version: {key}')
            raise ValueError(f'Duplicate index row may hide missing coverage: {key}')
        rows[key] = row_text
        entries[key] = {'id': key, 'section': section, 'versionId': bid,
                        'effectiveFrom': date(match[1]),
                        'sourceUrl': f'{BASE}/main/OneSection.aspx?section={section}&bid={bid}'}
    if len(entries) < CHAPTERS[chapter]['minimumVersions']:
        raise ValueError('Incomplete or changed chapter index: ' + chapter)
    if not entries and (not CHAPTERS[chapter].get('emptyIndexReviewedAt')
            or not soup.find('a', href='/main/OneChapter.aspx?chapter=' + chapter + '&idx=v')
            or 'Cross References' not in soup.get_text()):
        raise ValueError('Unverified empty chapter index: ' + chapter)
    return list(entries.values())


def parse_section(html, entry, checked_at):
    soup = BeautifulSoup(html, 'html.parser')
    effective = soup.select_one('#effdt')
    heading = soup.select_one('div.norm > p.norm > span.bold')
    if not effective or not heading:
        raise ValueError(f'Missing heading/effective date for {entry["id"]}')
    match = re.search(r'Effective\s*-\s*(\d{2} \w{3} \d{4})', clean(effective.get_text(' ')))
    if not match or date(match[1]) != entry['effectiveFrom']:
        raise ValueError(f'Source date differs from index for {entry["id"]}')
    full_heading = clean(heading.get_text(' '))
    marker = '*' if full_heading.startswith('*') else ''
    full_heading = full_heading.lstrip('*').strip()
    prefix = entry['section'] + '.'
    if not full_heading.startswith(prefix) or not full_heading.endswith('—'):
        raise ValueError(f'Unexpected heading for {entry["id"]}')
    title = full_heading[len(prefix):].strip().removesuffix('—').strip()
    if not title or title.endswith('...'):
        raise ValueError('Missing/truncated heading')
    # Navigation includes the selected source identity even for single-version pages.
    nav = soup.select_one('#farw') or soup.select_one('#barw')
    if not nav or parse_qs(urlparse(nav['href']).query).get('bid') != [entry['versionId']]:
        raise ValueError(f'Wrong selected version: {entry["id"]}')
    until = None
    history = next((t for t in soup.find_all('table') if 'All versions' in t.get_text()), None)
    if history:
        matches = []
        for row in history.find_all('tr'):
            link = row.find('a', href=True)
            if link and parse_qs(urlparse(link['href']).query).get('bid') == [entry['versionId']]:
                cells = row.find_all('td')
                if date(cells[1].get_text()) != entry['effectiveFrom']:
                    raise ValueError('Conflicting history date')
                end = clean(cells[2].get_text())
                matches.append(date(end) if end else None)
        if len(matches) != 1:
            raise ValueError('Selected version not uniquely present in history')
        until = matches[0]
    elif 'multiple enactments' in soup.get_text().lower():
        raise ValueError('Multiple enactments without a version table')
    concurrent = next((p for p in POLICY['concurrentEnactments'] if p['section'] == entry['section'] and entry['versionId'] in p['versionIds']), None)
    if concurrent and (entry['effectiveFrom'] != concurrent['effectiveFrom'] or until is not None
            or f'There are multiple enactments of {entry["section"]}' not in clean(soup.get_text(' '))
            or 'Due to possible conflict, both versions are printed.' not in clean(soup.get_text(' '))):
        raise ValueError('Unverified concurrent enactment: ' + entry['id'])
    contingent = next((p for p in POLICY['contingentEnactments'] if p['section'] == entry['section']), None)
    reviewed = next((v for v in contingent['versions'] if v['versionId'] == entry['versionId']), None) if contingent else None
    placeholder = 'date is placeholder' in clean(effective.get_text(' ')).lower()
    if placeholder != bool(reviewed and reviewed['dateIsPlaceholder']):
        raise ValueError('Unverified placeholder effective date: ' + entry['id'])
    if contingent and (not reviewed or entry['effectiveFrom'] != reviewed['effectiveFrom'] or until is not None
            or (contingent['multipleEnactments'] != (f'There are multiple enactments of {entry["section"]}' in clean(soup.get_text(' '))))
            or contingent['sourceNotice'] not in clean(soup.get_text(' '))):
        raise ValueError('Unverified contingent enactment: ' + entry['id'])
    delayed = next((p for p in REVIEWED_OVERLAPS if p['section'] == entry['section']), None)
    delayed_version = next((v for v in delayed['versions'] if v['versionId'] == entry['versionId']), None) if delayed else None
    if delayed and (not delayed_version or entry['effectiveFrom'] != delayed_version['effectiveFrom'] or until is not None
            or f'There are multiple enactments of {entry["section"]}' not in clean(soup.get_text(' '))
            or delayed_version['sourceNotice'] not in clean(soup.get_text(' '))):
        raise ValueError('Unverified delayed/reprinted enactment: ' + entry['id'])
    warning = next((p for p in POLICY.get('constitutionalWarnings', []) if p['id'] == entry['id']), None)
    source_warning = ('all or part is unconstitutional' in clean(effective.get_text(' ')).lower()
                      or any(clean(p.get_text(' ')).startswith("*Revisor's Note:")
                             and 'This section was declared unconstitutional' in clean(p.get_text(' '))
                             for p in soup.select('p')))
    if source_warning != bool(warning) or (warning and (entry['effectiveFrom'] != warning['effectiveFrom']
            or warning['sourceNotice'] not in clean(soup.get_text(' ')))):
        raise ValueError('Unverified constitutional warning: ' + entry['id'])
    chapter = entry['section'].split('.')[0]
    return {**entry, 'title': title, 'chapter': chapter, 'chapterTitle': CHAPTERS[chapter]['title'],
            'effectiveTo': until, **({'multipleEnactments': True} if concurrent or delayed or (contingent and contingent['multipleEnactments']) else {}),
            **({'effectiveDateIsPlaceholder': True} if placeholder else {}),
            **({'hasConstitutionalWarning': True} if source_warning else {}), 'headingMarker': marker, 'sourceCheckedAt': checked_at,
            'sourceSha256': hashlib.sha256(html.encode()).hexdigest()}


def validate(dataset, previous=None):
    records = dataset['records']
    manifest = dataset['manifest']
    if manifest['schemaVersion'] != 2 or manifest['coverage'] != list(CHAPTERS):
        raise ValueError('Unsupported dataset schema/coverage')
    if manifest.get('coverageDescription') != POLICY['coverageDescription']:
        raise ValueError('Coverage description differs from reviewed policy')
    if manifest['recordCount'] != len(records) or len(records) < 50:
        raise ValueError('Invalid record count')
    ids = set()
    grouped = defaultdict(list)
    for record in records:
        for key in ('id', 'section', 'versionId', 'title', 'chapter', 'chapterTitle', 'effectiveFrom', 'sourceUrl', 'sourceCheckedAt', 'sourceSha256'):
            if not isinstance(record.get(key), str) or not record[key].strip():
                raise ValueError(f'Missing {key}')
        if record['id'] in ids:
            raise ValueError('Duplicate version identity')
        ids.add(record['id'])
        if not record['versionId'].isdigit() or record['id'] != record['section'] + ':' + record['versionId']:
            raise ValueError('Mismatched record identity')
        if record['chapter'] not in CHAPTERS or not re.fullmatch(re.escape(record['chapter']) + r'\.\d{3,4}', record['section']) or record['chapterTitle'] != CHAPTERS[record['chapter']]['title']:
            raise ValueError('Unexpected section')
        if record['sourceUrl'] != f'{BASE}/main/OneSection.aspx?section={record["section"]}&bid={record["versionId"]}':
            raise ValueError('Source URL must identify the exact version')
        if not re.fullmatch(r'[a-f0-9]{64}', record['sourceSha256']):
            raise ValueError('Missing source hash')
        if record['title'].endswith('...'):
            raise ValueError('Truncated heading')
        datetime.fromisoformat(record['sourceCheckedAt'])
        datetime.strptime(record['effectiveFrom'], '%Y-%m-%d')
        concurrent = next((p for p in POLICY['concurrentEnactments'] if p['section'] == record['section'] and record['versionId'] in p['versionIds']), None)
        contingent = next((p for p in POLICY['contingentEnactments'] if p['section'] == record['section']), None)
        reviewed = next((v for v in contingent['versions'] if v['versionId'] == record['versionId']), None) if contingent else None
        delayed = next((p for p in REVIEWED_OVERLAPS if p['section'] == record['section']), None)
        delayed_version = next((v for v in delayed['versions'] if v['versionId'] == record['versionId']), None) if delayed else None
        if ((record.get('multipleEnactments') is not None and record.get('multipleEnactments') is not True)
                or bool(record.get('multipleEnactments')) != bool(concurrent or delayed_version or (reviewed and contingent['multipleEnactments']))):
            raise ValueError('Unverified concurrent enactment marker')
        if (record.get('effectiveDateIsPlaceholder') is not None and record.get('effectiveDateIsPlaceholder') is not True) or bool(record.get('effectiveDateIsPlaceholder')) != bool(reviewed and reviewed['dateIsPlaceholder']):
            raise ValueError('Unverified placeholder date marker')
        warning = next((p for p in POLICY.get('constitutionalWarnings', []) if p['id'] == record['id']), None)
        if ((record.get('hasConstitutionalWarning') is not None and record.get('hasConstitutionalWarning') is not True)
                or bool(record.get('hasConstitutionalWarning')) != bool(warning)
                or (warning and record['effectiveFrom'] != warning['effectiveFrom'])):
            raise ValueError('Unverified constitutional warning marker')
        if record['effectiveTo']:
            datetime.strptime(record['effectiveTo'], '%Y-%m-%d')
            if record['effectiveTo'] <= record['effectiveFrom']:
                raise ValueError('Invalid effective interval')
        grouped[record['section']].append(record)
    if any(p['id'] not in ids for p in POLICY.get('constitutionalWarnings', [])):
        raise ValueError('Missing reviewed constitutional warning')
    summaries = manifest.get('chapters', [])
    if [c['chapter'] for c in summaries] != list(CHAPTERS):
        raise ValueError('Missing chapter provenance')
    for summary in summaries:
        ch = summary['chapter']
        chapter_records = [r for r in records if r['chapter'] == ch]
        if (summary['recordCount'] != len(chapter_records)
                or summary['sectionCount'] != len({r['section'] for r in chapter_records})
                or len(chapter_records) < CHAPTERS[ch]['minimumVersions']
                or summary['sourceIndex'] != index_url(ch)
                or summary['title'] != CHAPTERS[ch]['title']
                or not re.fullmatch(r'[a-f0-9]{64}', summary['sourceSha256'])):
            raise ValueError('Incomplete chapter/provenance: ' + ch)
        datetime.fromisoformat(summary['indexCheckedAt'])
    if manifest['indexCheckedAt'] != min(c['indexCheckedAt'] for c in summaries):
        raise ValueError('Oldest index check mismatch')
    if manifest['collectedAt'] != max([r['sourceCheckedAt'] for r in records] + [c['indexCheckedAt'] for c in summaries]):
        raise ValueError('Collection time mismatch')
    if manifest['sectionCount'] != len(grouped):
        raise ValueError('Section count mismatch')
    for versions in grouped.values():
        versions.sort(key=lambda r: r['effectiveFrom'])
        contingent = next((p for p in POLICY['contingentEnactments'] if p['section'] == versions[0]['section']), None)
        if contingent:
            expected = {v['versionId']: v for v in contingent['versions']}
            if (set(r['versionId'] for r in versions) != set(expected)
                    or any(bool(r.get('multipleEnactments')) != contingent['multipleEnactments'] or r['effectiveFrom'] != expected[r['versionId']]['effectiveFrom']
                           or r['effectiveTo'] is not None
                           or bool(r.get('effectiveDateIsPlaceholder')) != expected[r['versionId']]['dateIsPlaceholder'] for r in versions)):
                raise ValueError('Unresolved contingent enactments')
            continue
        delayed = next((p for p in REVIEWED_OVERLAPS if p['section'] == versions[0]['section']), None)
        if delayed:
            expected = {v['versionId']: v for v in delayed['versions']}
            if (set(r['versionId'] for r in versions) != set(expected)
                    or any(not r.get('multipleEnactments') or r['effectiveFrom'] != expected[r['versionId']]['effectiveFrom']
                           or r['effectiveTo'] is not None for r in versions)):
                raise ValueError('Unresolved delayed/reprinted enactments')
            continue
        concurrent = next((p for p in POLICY['concurrentEnactments'] if p['section'] == versions[0]['section']), None)
        if concurrent:
            if (set(r['versionId'] for r in versions) != set(concurrent['versionIds'])
                    or any(not r.get('multipleEnactments') or r['effectiveFrom'] != concurrent['effectiveFrom'] or r['effectiveTo'] is not None for r in versions)):
                raise ValueError('Unresolved concurrent enactments')
            continue
        for earlier, later in zip(versions, versions[1:]):
            if earlier['effectiveTo'] is None or earlier['effectiveTo'] > later['effectiveFrom']:
                raise ValueError(f'Overlapping/unresolved versions: {earlier["section"]}')
    if previous:
        lost = {r['id'] for r in previous['records']} - ids
        if lost:
            raise ValueError('Record loss requires explicit review: ' + ', '.join(sorted(lost)))
    return {'valid': True, 'records': len(records), 'sections': len(grouped), 'chapters': len(CHAPTERS),
            'futureVersionsAtCheck': sum(not r.get('hasConstitutionalWarning') and not r.get('effectiveDateIsPlaceholder') and r['effectiveFrom'] > manifest['collectedAt'][:10] for r in records),
            'contingentVersions': sum(bool(r.get('effectiveDateIsPlaceholder')) for r in records),
            'constitutionalWarningVersions': sum(bool(r.get('hasConstitutionalWarning')) for r in records)}


def parse_with_retry(entry, source, get, cache, offline):
    for attempt in range(3):
        try:
            return parse_section(source['html'], entry, source['checkedAt'])
        except ValueError as error:
            if offline or attempt == 2:
                raise
            rejected = cache / (hashlib.sha256(source['html'].encode()).hexdigest() + '.rejected.json')
            rejected.write_text(json.dumps(source))
            print(f'Rejected {entry["id"]}: {error}; retrying exact source URL', flush=True)
            source = get(entry['sourceUrl'], fresh=True)


def collect(cache, offline=False):
    cache.mkdir(parents=True, exist_ok=True)
    last_fetch = 0.0
    robots = None

    def get(url, fresh=False):
        nonlocal last_fetch
        target = cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')
        if target.exists() and not fresh:
            item = json.loads(target.read_text())
            if item['url'] != url:
                raise ValueError('Cache identity mismatch')
            return item
        if offline:
            raise ValueError(f'Offline source missing: {url}')
        if robots and not robots.can_fetch(AGENT, url):
            raise ValueError('robots.txt disallows source: ' + url)
        for attempt in range(3):
            time.sleep(max(0, 1.0 - (time.monotonic() - last_fetch)))
            last_fetch = time.monotonic()
            try:
                with urlopen(Request(url, headers={'User-Agent': AGENT, 'Cache-Control': 'no-cache'}), timeout=45) as response:
                    if urlparse(response.url).hostname != 'revisor.mo.gov':
                        raise ValueError('Unexpected source redirect')
                    html = response.read().decode('utf-8-sig')
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(2 ** (attempt + 1))
        item = {'url': url, 'checkedAt': datetime.now(timezone.utc).isoformat(), 'html': html}
        target.write_text(json.dumps(item))
        return item

    robot = get(BASE + '/robots.txt')
    # The Revisor currently routes robots.txt to its HTML home page.
    # Honor real directives if provided; document the non-directive response otherwise.
    if not robot['html'].lstrip().lower().startswith('<'):
        robots = RobotFileParser()
        robots.parse(robot['html'].splitlines())
    records = []
    summaries = []
    for chapter, policy in CHAPTERS.items():
        source_index = get(index_url(chapter))
        for attempt in range(3):
            try:
                entries = parse_index(source_index['html'], chapter)
                break
            except ValueError:
                if offline or attempt == 2:
                    raise
                (cache / (hashlib.sha256(source_index['html'].encode()).hexdigest() + '.rejected.json')).write_text(json.dumps(source_index))
                source_index = get(index_url(chapter), fresh=True)
        chapter_records = []
        for number, entry in enumerate(entries, 1):
            source = get(entry['sourceUrl'])
            chapter_records.append(parse_with_retry(entry, source, get, cache, offline))
            print(f'Chapter {chapter}: {number}/{len(entries)} {entry["id"]}', flush=True)
        records.extend(chapter_records)
        summaries.append({'chapter': chapter, 'title': policy['title'],
                          'sourceIndex': index_url(chapter), 'indexCheckedAt': source_index['checkedAt'],
                          'sourceSha256': hashlib.sha256(source_index['html'].encode()).hexdigest(),
                          'recordCount': len(entries), 'sectionCount': len({e['section'] for e in entries})})
    return {'manifest': {'schemaVersion': 2, 'coverage': list(CHAPTERS),
                        'coverageDescription': POLICY['coverageDescription'],
                        'chapters': summaries, 'indexCheckedAt': min(c['indexCheckedAt'] for c in summaries),
                        'collectedAt': max([r['sourceCheckedAt'] for r in records] + [c['indexCheckedAt'] for c in summaries]),
                        'recordCount': len(records), 'sectionCount': len({r['section'] for r in records}),
                        'robotsResponse': 'directives' if robots else 'HTML response; no robots directives'},
            'records': sorted(records, key=lambda r: (r['section'], r['effectiveFrom']))}



@contextmanager
def collection_lock(path=Path('data/.collect.lock')):
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        raise ValueError('Collection lock exists: ' + str(path) + '. Check for a running collector before removing a stale lock.') from None
    try:
        os.write(descriptor, str(os.getpid()).encode())
        yield
    finally:
        os.close(descriptor)
        path.unlink()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path, default=Path('data/raw') / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--output', type=Path, default=Path('data/candidate.json'))
    parser.add_argument('--validate', type=Path)
    args = parser.parse_args()
    if args.validate:
        print(json.dumps(validate(json.loads(args.validate.read_text())), indent=2))
        return
    with collection_lock():
        dataset = collect(args.cache, args.offline)
    previous_path = Path('public/data/statutes.json')
    previous = json.loads(previous_path.read_text()) if previous_path.exists() else None
    if not isinstance(previous, dict):
        previous = None
    report = validate(dataset, previous)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.output.with_suffix('.tmp')
    tmp.write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + '\n')
    tmp.replace(args.output)
    Path('data/validation-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
