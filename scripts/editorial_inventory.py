"""Offline progress inventory for the local editorial-heading rollout.

This reports source-matched drafts separately from reviewed titles. The production
build also validates the full-text source and independently enforces review gates.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
STAGES = ('reviewed', 'draft', 'missing', 'stale', 'unnumbered', 'complex-numbering')

def text(node):
    return node if isinstance(node, str) else ''.join(text(n) for n in node['children'])

def fingerprint(nodes):
    value = re.sub(r'\s', '', ''.join(text(n) for n in nodes).replace('\xad', ''))
    return hashlib.sha256(value.encode()).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate', type=Path, default=ROOT/'data/full-text/statewide-4')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    manifest = json.loads((args.candidate/'manifest.json').read_text())
    assert manifest['complete'] and not manifest['errors']
    dataset = (ROOT/'public/data/statutes.json').read_bytes()
    assert hashlib.sha256(dataset).hexdigest() == manifest['datasetSha256']
    pilot = json.loads((ROOT/'data/subsection-headings-pilot.json').read_text())
    registry = {e['id']: e for e in pilot['entries']}
    for path in sorted((ROOT/'data/subsection-headings/statewide').glob('chapter-*.json')):
        shard = json.loads(path.read_text())
        assert shard['schemaVersion'] == 1 and shard['scope'] == 'local-statewide', path
        for entry in shard['entries']:
            assert entry['id'] not in registry, f'duplicate: {entry["id"]}'
            assert entry['id'].split('.')[0] == path.stem.removeprefix('chapter-'), path
            assert entry.get('draftedBy'), entry['id']
            if entry['reviewStatus'] == 'source-checked':
                assert entry.get('reviewedBy') and entry['reviewedBy'] != entry['draftedBy'] and entry.get('reviewSummary'), entry['id']
            registry[entry['id']] = entry
    candidate_dir = args.candidate.resolve()
    counts = {s: {'versions': 0, 'headings': 0} for s in STAGES}
    chapters = []; versions = []; source_ids = set()
    for shard in manifest['chapters']:
        chapter = shard.get('chapter')
        assert isinstance(chapter, str) and chapter.isdigit(), f'Invalid chapter: {chapter}'
        assert shard.get('file') == f'chapter-{chapter}.json', f'Unexpected shard filename: {shard.get("file")}'
        shard_path = (args.candidate / shard['file']).resolve()
        assert shard_path.is_relative_to(candidate_dir), f'Shard escapes candidate directory: {shard["file"]}'
        raw = shard_path.read_bytes()
        assert hashlib.sha256(raw).hexdigest() == shard['sha256']
        totals = {s: {'versions': 0, 'headings': 0} for s in STAGES}
        for source in json.loads(raw):
            identity = source['id']; source_ids.add(identity)
            n = len(source['subsections']); entry = registry.get(identity)
            if not n:
                assert not entry, f'headings on unnumbered source: {identity}'
                stage = 'complex-numbering' if source['navigationReview'] else 'unnumbered'
            elif not entry:
                stage = 'missing'
            else:
                assert entry['reviewStatus'] in ('draft', 'source-checked'), identity
                rows = entry['headings']; numbers = [h['number'] for h in rows]
                assert len(set(numbers)) == len(numbers), identity
                for h in rows:
                    assert isinstance(h['title'], str) and 0 < len(h['title']) <= 100 and h['title'] == h['title'].strip() and not re.search(r'[\r\n\t]', h['title']), identity
                    assert h.get('reviewNote'), identity
                match = all(entry[k] == source[k] for k in ('sourceUrl','sourceSha256','textSha256')) and n == len(rows)
                for i, subsection in enumerate(source['subsections']):
                    end = source['subsections'][i+1]['block'] if i+1 < n else len(source['blocks'])
                    row = next((h for h in rows if h['number'] == subsection['number']), None)
                    match = match and row is not None and row['bodySha256'] == fingerprint(source['blocks'][subsection['block']:end])
                stage = ('reviewed' if entry['reviewStatus'] == 'source-checked' else 'draft') if match else 'stale'
            for counter in (counts, totals):
                counter[stage]['versions'] += 1; counter[stage]['headings'] += n
            versions.append({'id': identity, 'stage': stage, 'headings': n})
        chapters.append({'chapter': shard['chapter'], 'counts': totals})
    assert set(registry) <= source_ids, 'unknown source versions'
    assert len(versions) == manifest['recordCount']
    result = {'schemaVersion': 1, 'scope': 'local-statewide-numbered-subsections',
        'datasetSha256': manifest['datasetSha256'], 'totalVersions': len(versions),
        'totalHeadings': sum(v['headings'] for v in versions),
        'complete': not any(counts[s]['versions'] for s in ('draft','missing','stale')),
        'counts': counts, 'chapters': chapters, 'versions': versions}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.output.with_suffix('.tmp')
        temporary.write_text(json.dumps(result, indent=2)+'\n'); temporary.replace(args.output)
    print(json.dumps({k: v for k, v in result.items() if k not in ('chapters','versions')}, indent=2))

if __name__ == '__main__':
    main()
