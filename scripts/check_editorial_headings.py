"""Audit labels from the exact local build snapshot, including excluded drafts."""
import argparse
import importlib.util
import json
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('full_text_audit', ROOT/'scripts/check-full-text.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT/'dist')
    parser.add_argument('--candidate', type=Path, default=ROOT/'data/full-text/statewide-4')
    parser.add_argument('--snapshot', type=Path, default=ROOT/'data/editorial-work/last-build.json')
    args = parser.parse_args()
    snapshot = json.loads(args.snapshot.read_text())
    source = (ROOT/'public/data/statutes.json').read_text()
    assert audit.sha(source) == snapshot['datasetSha256']
    assert (args.dist/'data/statutes.json').read_text() == source
    entries = {e['id']: e for e in snapshot['entries']}
    counts = {'displayedHeadings': 0, 'displayedVersions': 0, 'withheldVersions': 0}
    pages = {}; seen = set()
    for chapter in {e['id'].split('.')[0] for e in entries.values()}:
        for text in json.loads((args.candidate/f'chapter-{chapter}.json').read_text()):
            if text['id'] not in entries:
                continue
            identity = text['id']; entry = entries[identity]; seen.add(identity)
            section = text['section']
            if section not in pages:
                # Preserve CR characters in archived notes for exact comparison.
                html = (args.dist/'statutes'/section/'index.html').read_bytes().decode('utf-8')
                pages = {section: (BeautifulSoup(html, 'html.parser'), audit.ReadingPage(html))}
            soup, doc = pages[section]
            assert ''.join(doc.parts[(identity, 'heading')]) == text['headingText'], identity
            for part, key in [('body', 'blocks'), ('notes', 'notes')]:
                assert ''.join(doc.parts[(identity, part)]) == audit.transcript(text[key]), (identity, part)
                assert doc.structure[(identity, part)] == audit.structures(text[key]), (identity, part)
            version = soup.find(id='version-'+identity)
            assert version, identity
            headings = version.select('.editorial-heading')
            if not entry['displayed']:
                assert not headings, f'unreviewed or stale headings displayed: {identity}'
                counts['withheldVersions'] += 1
                continue
            assert entry['reviewStatus'] == 'source-checked'
            assert len(headings) == len(entry['headings']) == len(text['subsections']), identity
            for row in entry['headings']:
                anchor = f'version-{identity}-subsection-{row["number"]}'
                subsection = soup.find(id=anchor)
                assert subsection.select_one('.editorial-heading').get_text() == 'Editorial heading'+row['title'], anchor
                assert version.find('a', attrs={'aria-label': f'Subsection {row["number"]}: {row["title"]}'}), anchor
                assert anchor in doc.ids, anchor
            counts['displayedVersions'] += 1; counts['displayedHeadings'] += len(headings)
    assert seen == set(entries)
    assert counts['displayedHeadings'] == snapshot['coverage']['counts']['reviewed']['headings']
    print(json.dumps(counts, indent=2))

if __name__ == '__main__':
    main()
