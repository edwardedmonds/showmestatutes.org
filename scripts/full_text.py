"""Offline, fail-closed extraction of exact archived statute responses.

This separate artifact is build-time input only. Never add its text to the
heading dataset or MiniSearch index. Unknown markup is an explicit failure.
"""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit
from bs4 import BeautifulSoup, NavigableString, Comment, SoupStrainer

ROOT = Path(__file__).resolve().parent.parent
EMPTY_BODY_REVIEWS = {r['id']: r['sourceSha256'] for r in json.loads((ROOT / 'data/full-text-policy.json').read_text())['emptyBodies']}
ALLOWED = {'p', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'sup', 'sub',
           'br', 'hr', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
           'caption', 'colgroup', 'col', 'ul', 'ol', 'li', 'blockquote', 'pre', 'a'}
MARKUP = Counter()
SEMANTIC_CLASSES = {'bold', 'italic', 'indent', 'indentblk', 'center'}
IGNORED_CLASSES = {'norm', 'rsmo', 'tiny', 'footspc', 'bigspc'}
# Original type size, colors and spacing are presentation. In particular tiny
# source paragraphs sometimes wrap real continuation text: never hide them.
IGNORED_STYLES = {'font', 'font-size', 'font-family', 'color', 'background-color',
                  'margin', 'margin-top', 'margin-bottom', 'padding', 'padding-left', 'padding-right'}
STYLE_ENUMS = {
    'text-align': {'left','right','center','justify'},
    'vertical-align': {'top','middle','bottom','baseline'},
    'font-weight': {'normal','bold','100','200','300','400','500','600','700','800','900'},
    'font-style': {'normal','italic','oblique'},
    'text-decoration': {'none','underline','line-through'},
    'white-space': {'normal','nowrap','pre','pre-wrap','pre-line'},
}

def safe_styles(style):
    kept = {}
    for declaration in style.split(';'):
        if not declaration.strip(): continue
        if ':' not in declaration: raise ValueError('Unreviewed style declaration')
        key, value = (part.strip().lower() for part in declaration.split(':', 1))
        if key in IGNORED_STYLES: continue
        valid = value in STYLE_ENUMS.get(key, set())
        if re.fullmatch(r'border-(top|right|bottom|left)-style', key):
            valid = value in {'none','solid','dashed','dotted','double'}
        if re.fullmatch(r'border-(top|right|bottom|left)-width', key):
            valid = value in {'thin','medium','thick'} or bool(re.fullmatch(r'[0-9.]+(pt|px|in|em)?', value))
        if key in {'width','height','margin-left','margin-right','text-indent'}:
            valid = bool(re.fullmatch(r'-?[0-9.]+(pt|px|in|em|%)?', value))
        if not valid: raise ValueError(f'Unreviewed style: {key}: {value}')
        kept[key] = value
    return ';'.join(f'{k}:{v}' for k,v in sorted(kept.items()))

def compact(text):
    return re.sub(r'\s+', '', text.replace('\xad', ''))

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

class SourceText(HTMLParser):
    """Independent stream check: every character inside the source body."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.roots = 0
        self.parts = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if not self.depth:
            if tag == 'div' and 'norm' in attrs.get('class', '').split():
                self.depth = 1
                self.roots += 1
        elif tag == 'div':
            self.depth += 1
    def handle_endtag(self, tag):
        if self.depth and tag == 'div':
            self.depth -= 1
    def handle_data(self, text):
        if self.depth:
            self.parts.append(text)

def node_text(node):
    if isinstance(node, str):
        return node
    return ''.join(node_text(c) for c in node['children'])

def safe_node(node, source_url):
    if isinstance(node, Comment):
        return ''
    if isinstance(node, NavigableString):
        return str(node).replace('\xad', '')
    tag = node.name
    for key, value in node.attrs.items():
        if key != 'href':
            MARKUP[f'{tag}|{key}|{value}'] += 1
    if tag not in ALLOWED:
        raise ValueError('Unreviewed body element: ' + tag)
    allowed_attrs = {'class', 'style', 'align'}
    if tag == 'a': allowed_attrs.add('href')
    if tag in {'td', 'th'}: allowed_attrs.update({'rowspan', 'colspan'})
    if tag == 'ol': allowed_attrs.add('start')
    if tag == 'p' and node.get('title') == 'Footnotes follow': allowed_attrs.add('title')
    if set(node.attrs) - allowed_attrs:
        raise ValueError('Unreviewed source attributes: ' + str(sorted(set(node.attrs) - allowed_attrs)))
    attrs = {}
    if tag == 'a':
        href = node.get('href')
        if not href:
            # Named anchors have no reading content beyond their children.
            tag = 'span'
        else:
            href = urljoin(source_url, href)
            parts = urlsplit(href)
            if parts.scheme != 'https' or parts.hostname != 'revisor.mo.gov' or parts.username or parts.password:
                raise ValueError('Unreviewed body link: ' + href)
            attrs['href'] = href
    if tag in {'td', 'th'}:
        for key in ('rowspan', 'colspan'):
            if key in node.attrs:
                val = str(node[key])
                if not val.isdigit() or not 1 <= int(val) <= 100:
                    raise ValueError('Invalid table span')
                attrs[key] = val
    if tag == 'ol' and node.get('start'):
        if not re.fullmatch(r'-?\d+', node['start']):
            raise ValueError('Invalid list start')
        attrs['start'] = node['start']
    # Retain semantic emphasis from the Revisor's named presentation classes.
    classes = set(node.get('class', []))
    if classes - SEMANTIC_CLASSES - IGNORED_CLASSES:
        raise ValueError('Unreviewed source classes: ' + str(sorted(classes)))
    semantic = sorted(classes & SEMANTIC_CLASSES)
    if semantic: attrs['class'] = ' '.join('source-' + c for c in semantic)
    styles = safe_styles(node.get('style', ''))
    if node.get('align'):
        if node['align'] not in STYLE_ENUMS['text-align']: raise ValueError('Unreviewed alignment')
        styles += (';' if styles else '') + 'text-align:' + node['align']
    if styles: attrs['style'] = styles
    if tag == 'span' and 'bold' in classes:
        tag = 'strong'
    elif tag == 'span' and 'italic' in classes:
        tag = 'em'
    children = [safe_node(c, source_url) for c in node.children]
    # Invalid nested p markup occurs in unnumbered continuation paragraphs.
    # Use a generic block so browsers cannot auto-close it and move the text.
    if tag == 'p' and node.find(['p', 'div', 'table']):
        tag = 'div'
    return {'tag': tag, 'attrs': attrs, 'children': children}

# Footnote asterisks belong to the source number, not to a separate paragraph.
NUMBER = re.compile(r'^\s*(?:\*+\s*)?([0-9]+)\.\s+')
COMPOUND = re.compile(r'^\s*(?:\*+\s*)?[0-9]+\.[0-9]')
HIERARCHY = re.compile(r'^\s*(?:ARTICLE|SECTION|PART)\s+(?:[IVXLC]+|[0-9]+)(?:\.(?=\s|$)|(?=\s|$))', re.I)
LETTERED = re.compile(r'^\s*[A-Z]+[.)]\s+')

def navigation_for(blocks):
    """Infer only flat 1..N paragraph numbering; preserve other structures whole."""
    starts, reasons = [], set()
    def inspect(node, nested=False):
        if isinstance(node, str): return
        text = node_text(node)
        if node['tag'] in ('p', 'div'):
            if HIERARCHY.match(text): reasons.add('article-or-part-structure')
            if COMPOUND.match(text): reasons.add('compound-numbering')
            if LETTERED.match(text): reasons.add('lettered-or-roman-structure')
            if nested and NUMBER.match(text): reasons.add('nested-numbering')
        for child in node['children']: inspect(child, True)
    for index, block in enumerate(blocks):
        text = node_text(block)
        match = NUMBER.match(text)
        if isinstance(block, dict) and block['tag'] in ('p', 'div'):
            if match: starts.append({'number': int(match[1]), 'block': index})
        elif match or COMPOUND.match(text): reasons.add('unsupported-number-container')
        if HIERARCHY.match(text): reasons.add('article-or-part-structure')
        inspect(block)
    if starts and any(compact(node_text(b)) for b in blocks[:starts[0]['block']]):
        reasons.add('introductory-text-before-numbering')
    numbers = [s['number'] for s in starts]
    if numbers != list(range(1, len(numbers) + 1)): reasons.add('nonsequential-numbering')
    return ([] if reasons else starts), sorted(reasons)

def extract(record, cached):
    raw = cached['html']
    if (cached.get('url') != record['sourceUrl']
            or cached.get('checkedAt') != record['sourceCheckedAt']
            or digest(raw) != record['sourceSha256']):
        raise ValueError('Archive provenance differs from validated heading record')
    stream = SourceText()
    stream.feed(raw)
    if stream.roots != 1 or stream.depth:
        raise ValueError('Missing, repeated or unclosed source body')
    soup = BeautifulSoup(raw, 'html.parser', parse_only=SoupStrainer('div', class_='norm'))
    roots = soup.select('div.norm')
    if len(roots) != 1:
        raise ValueError('Ambiguous body root')
    body = roots[0]
    if compact(''.join(stream.parts)) != compact(body.get_text()):
        raise ValueError('Independent source-body transcript differs from parsed DOM')
    source_text = body.get_text()
    heading = body.select_one(':scope > p.norm > span.bold')
    if not heading and record.get('headingSource') != 'chapter-index':
        heading = body.select_one(':scope > span.bold')
    heading_text = ''
    if record.get('headingSource') != 'chapter-index':
        if not heading or not heading.get_text().strip().lstrip('*').lstrip().startswith(record['section'] + '.'):
            raise ValueError('Missing or mismatched source heading')
        heading_text = heading.get_text()
        heading.decompose()
    notes = body.select('div.foot')
    if any(n.parent is not body for n in notes):
        raise ValueError('Nested source notes need review')
    note_nodes = []
    for note in notes:
        note_nodes.extend(safe_node(c, record['sourceUrl']) for c in note.children)
        note.decompose()
    blocks = [safe_node(c, record['sourceUrl']) for c in body.children]
    if not compact(''.join(map(node_text, blocks))) and EMPTY_BODY_REVIEWS.get(record['id']) != record['sourceSha256']:
        raise ValueError('Unreviewed empty statutory body')
    # Splitting into body and notes may not change characters or their order.
    combined = heading_text + ''.join(node_text(n) for n in blocks + note_nodes)
    if compact(source_text) != compact(combined):
        raise ValueError('Source text lost, reordered or duplicated during extraction')
    navigation, reasons = navigation_for(blocks)
    return {
        'id': record['id'], 'section': record['section'], 'versionId': record['versionId'],
        'sourceUrl': record['sourceUrl'], 'sourceCheckedAt': record['sourceCheckedAt'],
        'sourceSha256': record['sourceSha256'], 'textSha256': digest(compact(source_text)),
        'headingText': heading_text, 'blocks': blocks, 'notes': note_nodes,
        'subsections': navigation,
        'navigationReview': bool(reasons),
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=ROOT / 'data/full-text/candidate')
    parser.add_argument('--sections', nargs='*', help='Explicit pilot section identifiers; omitted means statewide')
    args = parser.parse_args()
    dataset_bytes = (ROOT / 'public/data/statutes.json').read_text()
    dataset = json.loads(dataset_bytes)
    selected = [r for r in dataset['records'] if not args.sections or r['section'] in args.sections]
    if args.sections and set(args.sections) != {r['section'] for r in selected}:
        raise ValueError('Unknown pilot section')
    if args.output.exists():
        raise ValueError('Use a new candidate directory; never overwrite an extracted snapshot')
    args.output.mkdir(parents=True)
    groups = defaultdict(list)
    errors = []
    for i, r in enumerate(selected):
        try:
            path = args.cache / (digest(r['sourceUrl']) + '.json')
            cached = json.loads(path.read_text())
            groups[r['chapter']].append(extract(r, cached))
        except Exception as error:
            errors.append({'id': r['id'], 'error': str(error)})
        if i % 1000 == 0:
            print(f'{i + 1}/{len(selected)} checked; {len(errors)} require review', flush=True)
            (args.output / 'progress.json').write_text(json.dumps({'checkedVersions': i + 1, 'expectedVersions': len(selected), 'errorCount': len(errors), 'recentErrors': errors[-20:]}, indent=2))
    manifest = {
        'schemaVersion': 1, 'extractorVersion': 4, 'datasetSha256': digest(dataset_bytes),
        'extractedAt': datetime.now(timezone.utc).isoformat(),
        'scope': 'pilot' if args.sections else 'statewide',
        'expectedVersions': len(selected), 'recordCount': sum(map(len, groups.values())),
        'complete': not errors, 'errors': errors, 'chapters': [],
    }
    for chapter, records in groups.items():
        payload = json.dumps(records, ensure_ascii=False, separators=(',', ':'))
        filename = f'chapter-{chapter}.json'
        (args.output / filename).write_text(payload)
        manifest['chapters'].append({'chapter': chapter, 'file': filename, 'sha256': digest(payload), 'recordCount': len(records)})
    (args.output / 'markup-inventory.json').write_text(json.dumps(dict(MARKUP), indent=2))
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    print(f'Extracted {manifest["recordCount"]}/{len(selected)} versions; {len(errors)} require review.', flush=True)
    if errors:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
