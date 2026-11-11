"""Collect the Chapter 565 heading pilot, preserving source version identities.

Run from repository root. Network fetches are sequential, >=1 second apart.
No existing validated dataset is overwritten by collection.
"""
import argparse
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
INDEX = BASE + '/main/OneChapter.aspx?chapter=565'
AGENT = 'ShowMeStatutes/0.1 (+https://github.com/deths74r/show-me-statutes)'


def clean(text):
    return re.sub(r'\s+', ' ', text).strip()


def date(value):
    for fmt in ('%m/%d/%Y', '%d %b %Y'):
        try:
            return datetime.strptime(clean(value), fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError(f'Unrecognized effective date: {value}')


def parse_index(html):
    soup = BeautifulSoup(html, 'html.parser')
    entries = {}
    for a in soup.select('a[href]'):
        query = parse_qs(urlparse(a['href']).query)
        section = query.get('section', [''])[0]
        bid = query.get('bid', [''])[0]
        if not re.fullmatch(r'565\.\d{3}', section) or not bid:
            continue
        row = a.find_parent('tr')
        match = re.search(r'\((\d+/\d+/\d+)\)\s*$', clean(row.get_text(' ')))
        if not match:
            raise ValueError(f'Missing index date: {section}/{bid}')
        key = section + ':' + bid
        if key in entries:
            raise ValueError(f'Duplicate index version: {key}')
        entries[key] = {'id': key, 'section': section, 'versionId': bid,
                        'effectiveFrom': date(match[1]),
                        'sourceUrl': f'{BASE}/main/OneSection.aspx?section={section}&bid={bid}'}
    if len(entries) < 50:
        raise ValueError('Incomplete or changed chapter index; expected at least 50 versions')
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
    return {**entry, 'title': title, 'chapter': '565', 'chapterTitle': 'Offenses Against the Person',
            'effectiveTo': until, 'headingMarker': marker, 'sourceCheckedAt': checked_at,
            'sourceSha256': hashlib.sha256(html.encode()).hexdigest()}


def validate(dataset, previous=None):
    records = dataset['records']
    manifest = dataset['manifest']
    if manifest['schemaVersion'] != 1 or manifest['coverage'] != ['565']:
        raise ValueError('Unsupported dataset schema/coverage')
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
        if record['id'] != record['section'] + ':' + record['versionId']:
            raise ValueError('Mismatched record identity')
        if record['chapter'] != '565' or not re.fullmatch(r'565\.\d{3}', record['section']):
            raise ValueError('Unexpected section')
        if record['sourceUrl'] != f'{BASE}/main/OneSection.aspx?section={record["section"]}&bid={record["versionId"]}':
            raise ValueError('Source URL must identify the exact version')
        if not re.fullmatch(r'[a-f0-9]{64}', record['sourceSha256']):
            raise ValueError('Missing source hash')
        datetime.fromisoformat(record['sourceCheckedAt'])
        datetime.strptime(record['effectiveFrom'], '%Y-%m-%d')
        if record['effectiveTo']:
            datetime.strptime(record['effectiveTo'], '%Y-%m-%d')
            if record['effectiveTo'] <= record['effectiveFrom']:
                raise ValueError('Invalid effective interval')
        grouped[record['section']].append(record)
    if manifest['sectionCount'] != len(grouped):
        raise ValueError('Section count mismatch')
    for versions in grouped.values():
        versions.sort(key=lambda r: r['effectiveFrom'])
        for earlier, later in zip(versions, versions[1:]):
            if earlier['effectiveTo'] is None or earlier['effectiveTo'] > later['effectiveFrom']:
                raise ValueError(f'Overlapping/unresolved versions: {earlier["section"]}')
    if previous:
        lost = {r['id'] for r in previous['records']} - ids
        if lost:
            raise ValueError('Record loss requires explicit review: ' + ', '.join(sorted(lost)))
    return {'valid': True, 'records': len(records), 'sections': len(grouped),
            'futureVersionsAtCheck': sum(r['effectiveFrom'] > manifest['collectedAt'][:10] for r in records)}


def collect(cache, offline=False):
    cache.mkdir(parents=True, exist_ok=True)
    last_fetch = 0.0
    robots = None

    def get(url):
        nonlocal last_fetch
        target = cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')
        if target.exists():
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
                with urlopen(Request(url, headers={'User-Agent': AGENT}), timeout=45) as response:
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
    chapter = get(INDEX)
    entries = parse_index(chapter['html'])
    records = []
    for number, entry in enumerate(entries, 1):
        source = get(entry['sourceUrl'])
        records.append(parse_section(source['html'], entry, source['checkedAt']))
        print(f'{number}/{len(entries)} {entry["id"]}', flush=True)
    return {'manifest': {'schemaVersion': 1, 'coverage': ['565'],
                        'coverageDescription': 'All versions listed in the Chapter 565 index at source check; not a complete historical archive.',
                        'sourceIndex': INDEX, 'indexCheckedAt': chapter['checkedAt'],
                        'collectedAt': max(r['sourceCheckedAt'] for r in records),
                        'recordCount': len(records), 'sectionCount': len({r['section'] for r in records}),
                        'robotsResponse': 'directives' if robots else 'HTML response; no robots directives'},
            'records': sorted(records, key=lambda r: (r['section'], r['effectiveFrom']))}


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
