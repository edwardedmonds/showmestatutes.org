"""Compare every emitted reading transcript and source structure to its extracted shard.

Run after an explicit full-text build. This is additional to check-seo.py.
It does not constitute a source-format/completeness review.
"""
import argparse
from collections import defaultdict
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
VOID = {'br','hr','col','meta','link','input','img','area','base','embed','param','source','track','wbr'}
def compact(s): return re.sub(r'\s+', '', s.replace('\xad',''))
def sha(s): return hashlib.sha256(s.encode()).hexdigest()
def transcript(nodes):
    return ''.join(n if isinstance(n,str) else transcript(n['children']) for n in nodes)
def structures(nodes):
    out=[]
    for n in nodes:
        if isinstance(n,str): continue
        out.append(('start',n['tag'],json.dumps(n['attrs'],sort_keys=True)))
        out.extend(structures(n['children']))
        if n['tag'] not in VOID:out.append(('end',n['tag']))
    return out
class ReadingPage(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.active=None; self.stack=[]; self.parts=defaultdict(list); self.structure=defaultdict(list)
        self.ids=[];self.fragments=[]
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if a.get('href','').startswith('#'):self.fragments.append(unquote(a['href'][1:]))
        if self.active:
            wrapper = tag == 'div' and a.get('class') == 'source-table'
            if not wrapper:self.structure[self.active].append(('start',tag,json.dumps(a,sort_keys=True)))
            if tag not in VOID:self.stack.append((tag,wrapper))
        elif any('data-source-'+part in a for part in ('heading','body','notes')):
            part=next(part for part in ('heading','body','notes') if 'data-source-'+part in a)
            self.active=(a['data-source-'+part],part)
            self.stack=[(tag,True)]
    def handle_endtag(self,tag):
        if self.active and tag not in VOID:
            opened,wrapper=self.stack.pop()
            assert opened==tag, f'Unbalanced source HTML: {self.active}: {opened}/{tag}'
            if not wrapper:self.structure[self.active].append(('end',tag))
            if not self.stack:self.active=None
    def handle_data(self,s):
        if self.active:self.parts[self.active].append(s)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('candidate',type=Path)
    parser.add_argument('--dist',type=Path,default=ROOT/'dist')
    args=parser.parse_args()
    source=(ROOT/'public/data/statutes.json').read_text()
    manifest=json.loads((args.candidate/'manifest.json').read_text())
    assert manifest['complete'] and not manifest['errors']
    assert manifest['datasetSha256']==sha(source)
    assert (args.dist/'data/statutes.json').read_text()==source,'Heading data changed'
    candidate_dir = args.candidate.resolve()
    statutes_dir = (args.dist / 'statutes').resolve()
    versions=0;pages={};navigation_review=[]
    for shard in manifest['chapters']:
        chapter = shard.get('chapter')
        assert isinstance(chapter, str) and chapter.isdigit(), f'Invalid chapter: {chapter}'
        assert shard.get('file') == f'chapter-{chapter}.json', f'Unexpected shard filename: {shard.get("file")}'
        shard_path = (args.candidate / shard['file']).resolve()
        assert shard_path.is_relative_to(candidate_dir), f'Shard escapes candidate directory: {shard["file"]}'
        raw=shard_path.read_text()
        assert sha(raw)==shard['sha256']
        for r in json.loads(raw):
            section = r.get('section')
            assert isinstance(section, str) and section and '/' not in section and '\\' not in section and '..' not in section, f'Invalid section path: {section}'
            path=(args.dist/'statutes'/section/'index.html').resolve()
            assert path.is_relative_to(statutes_dir), f'Section HTML escapes dist/statutes: {section}'
            # Keep only the current page; alternate versions are adjacent in a chapter shard.
            if str(path) not in pages:pages={str(path):ReadingPage(path.read_bytes().decode('utf-8'))}
            doc=pages[str(path)]; identity=r['id']
            assert not doc.active,identity
            assert len(doc.ids)==len(set(doc.ids)),f'Duplicate anchors: {identity}'
            assert all(f in doc.ids for f in doc.fragments),f'Broken fragment: {identity}'
            assert 'version-'+identity in doc.ids,identity
            assert ''.join(doc.parts[(identity,'heading')])==r['headingText'],f'Changed source heading: {identity}'
            for part,key in [('body','blocks'),('notes','notes')]:
                actual=''.join(doc.parts[(identity,part)])
                assert actual==transcript(r[key]),f'Changed {part}: {identity}'
                # Compare ordered opening/closing events, including every retained attribute.
                assert doc.structure[(identity,part)]==structures(r[key]),f'Changed {part} structure: {identity}'
            assert sha(compact(r['headingText']+transcript(r['blocks']+r['notes'])))==r['textSha256'],identity
            for s in r['subsections']:assert f'version-{identity}-subsection-{s["number"]}' in doc.ids,identity
            if r['navigationReview']:navigation_review.append(identity)
            versions+=1
    assert versions==manifest['recordCount']
    print(json.dumps({'verifiedVersions':versions,'scope':manifest['scope'],'headingDatasetUnchanged':True,'navigationReview':navigation_review},indent=2))
if __name__=='__main__':main()
