import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { constitutionalNotice, standaloneReprintNotice, type Dataset } from '../src/data';
import { loadFullText, validateText } from '../src/full-text-build';
import { renderFullText, renderNode, textContent, navigationFor, type FullText } from '../src/full-text';
import { browseAssets } from '../src/seo';
import { buildIndex } from '../src/search';

const raw = readFileSync('public/data/statutes.json', 'utf8');
const dataset: Dataset = JSON.parse(raw);
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const text: FullText = JSON.parse(readFileSync('tests/fixtures/full-text/parsed-535.300.json', 'utf8'));
const record = dataset.records.find(r => r.id === text.id)!;
function candidate(fn: (dir: string, manifest: any, rows: FullText[]) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'statute-text-test-'));
  const rows = [structuredClone(text)];
  const payload = JSON.stringify(rows);
  const manifest = { schemaVersion: 1, extractorVersion: 4, datasetSha256: sha(raw), complete: true, errors: [], scope: 'pilot', expectedVersions: 1, recordCount: 1, chapters: [{ chapter: '535', file: 'chapter-535.json', sha256: sha(payload), recordCount: 1 }] };
  writeFileSync(join(dir, 'chapter-535.json'), payload);
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
  try { fn(dir, manifest, rows); } finally { rmSync(dir, { recursive: true }); }
}

describe('Full-text snapshot and safe rendering', () => {
  it('loads only an explicitly permitted pilot tied to the same heading snapshot', () => candidate(dir => {
    expect(() => loadFullText(dir, dataset, sha(raw))).toThrow('pilot');
    expect(loadFullText(dir, dataset, sha(raw), true).get(text.id)).toEqual(text);
    expect(() => loadFullText(dir, dataset, 'wrong', true)).toThrow('another heading snapshot');
  }));
  it('rejects missing statewide coverage and incomplete extraction', () => candidate((dir,m) => {
    m.scope = 'statewide'; writeFileSync(join(dir,'manifest.json'), JSON.stringify(m));
    expect(() => loadFullText(dir,dataset,sha(raw))).toThrow('version count');
    m.complete = false; writeFileSync(join(dir,'manifest.json'), JSON.stringify(m));
    expect(() => loadFullText(dir,dataset,sha(raw))).toThrow('extraction failures');
  }));
  it('rejects changed shard bytes', () => candidate(dir => {
    writeFileSync(join(dir,'chapter-535.json'), '[]');
    expect(() => loadFullText(dir,dataset,sha(raw),true)).toThrow('shard checksum');
  }));
  it('rejects changed provenance, truncated text, unsafe markup and incorrect anchors', () => {
    const edits = [
      (t: FullText) => { t.sourceCheckedAt = '2027-01-01'; },
      (t: FullText) => { t.blocks.splice(t.subsections[0].block, 1); },
      (t: FullText) => { t.notes = []; },
      (t: FullText) => { t.blocks.push({ tag: 'script', attrs: {}, children: ['bad'] }); },
      (t: FullText) => { t.blocks.push({ tag: 'a', attrs: { href:'javascript:alert(1)' }, children: [] }); },
      (t: FullText) => { t.blocks.push({ tag: 'p', attrs: { onclick: 'bad' }, children: [] }); },
      (t: FullText) => { t.subsections[0].block = 999; },
      (t: FullText) => { t.subsections[1].number = 9; },
    ];
    for (const edit of edits) { const changed = structuredClone(text); edit(changed); expect(() => validateText(changed, record)).toThrow(); }
  });
  it('rejects an unreviewed empty body even when its transcript checksum is internally consistent', () => {
    const changed = structuredClone(text);
    changed.blocks = []; changed.subsections = [];
    changed.textSha256 = sha((changed.headingText + changed.notes.map(textContent).join('')).replace(/\u00ad/g,'').replace(/\s/g,''));
    expect(() => validateText(changed, record)).toThrow('unreviewed empty statutory body');
  });
  it('requires every subsection boundary, including starred trailing numbers', () => {
    const changed = structuredClone(text);
    changed.subsections.pop();
    expect(() => validateText(changed, record)).toThrow('subsection navigation');
    const blocks = ['1. First.', '**2. Second.', '*3. Final.'].map(t => ({tag:'p',attrs:{},children:[t]}));
    expect(navigationFor(blocks).subsections.map(s => s.number)).toEqual([1,2,3]);
    for (const prefix of ['ARTICLE I', 'A. Part', '1.1. Compound', 'The form shall read as follows:']) {
      expect(navigationFor([{tag:'p',attrs:{},children:[prefix]}, ...blocks]).subsections).toEqual([]);
    }
    const badReview = structuredClone(text); badReview.navigationReview = true;
    expect(() => validateText(badReview, record)).toThrow('subsection navigation');
  });
  it('blocks a newly ambiguous source unless its exact response has been reviewed', () => {
    const changed = structuredClone(text);
    changed.blocks.unshift({tag:'p',attrs:{},children:['ARTICLE I']});
    changed.subsections = []; changed.navigationReview = true;
    changed.textSha256 = sha((changed.headingText + [...changed.blocks,...changed.notes].map(textContent).join('')).replace(/\u00ad/g,'').replace(/\s/g,''));
    expect(() => validateText(changed,record)).toThrow('unreviewed source numbering');
  });
  it('keeps subsection anchors version-qualified and continuation text with subsection three', () => {
    const html = renderFullText(text);
    expect(html).toContain('id="version-535.300:35191-subsection-3"');
    expect(html).toContain('href="#version-535.300%3A35191-subsection-3"');
    const third = html.split('id="version-535.300:35191-subsection-3"')[1].split('</section>')[0];
    expect(third).toContain('The landlord shall have complied with this subsection');
    expect(third).toContain('(2)');
    expect(html).toContain('History &amp; source notes');
    const marked = {...text, headingText: '**535.300. Source heading — '};
    expect(renderFullText(marked)).toContain('data-source-heading="535.300:35191">**535.300. Source heading — </p>');
  });
  it('keeps constitutional and reprint notices in copied citations for alternate versions', () => {
    const versions: FullText[] = JSON.parse(readFileSync('tests/fixtures/full-text/parsed-79.130.json','utf8'));
    const records = dataset.records.filter(r => r.section === '79.130');
    const page = browseAssets({...dataset, records}, '/style.css', '2026-11-15', new Map(versions.map(t => [t.id,t])))['statutes/79.130/index.html'];
    for (const r of records) {
      const card = page.split(`id="version-${r.id}"`)[1].split('</li>')[0];
      const citation = card.match(/data-copy-citation="([^"]+)"/)![1];
      for (const notice of [constitutionalNotice(r), standaloneReprintNotice(r)].filter(Boolean)) {
        expect(citation).toContain(notice!.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'));
      }
    }
  });
  it('escapes source text and gives wide tables a keyboard-accessible scroll container', () => {
    expect(renderNode('<bad>&')).toBe('&lt;bad&gt;&amp;');
    expect(renderNode({ tag:'table', attrs:{}, children:[] })).toContain('tabindex="0"');
  });
  it('preserves existing version links and keeps full text outside heading and search data', () => {
    const sourceBefore = JSON.stringify(dataset);
    const indexBefore = JSON.stringify(buildIndex([record]).toJSON());
    // Rendering a small section fixture exercises the same optional build path.
    const fixture = { ...dataset, records: [record] };
    const normal = browseAssets(fixture,'/style.css','2026-11-15');
    const reading = browseAssets(fixture,'/style.css','2026-11-15', new Map([[text.id,text]]));
    const path = 'statutes/535.300/index.html';
    expect(reading[path]).toContain('id="version-535.300:35191"');
    expect(reading[path]).toContain(record.sourceUrl.replace(/&/g,'&amp;'));
    expect(reading[path]).toContain('A landlord may not demand');
    expect(normal[path]).not.toContain('A landlord may not demand');
    expect(reading['chapters/535/index.html']).not.toContain('A landlord may not demand');
    expect(JSON.stringify(dataset)).toBe(sourceBefore);
    expect(JSON.stringify(buildIndex([record]).toJSON())).toBe(indexBefore);
    expect(readFileSync('src/main.ts','utf8')).not.toContain('full-text');
    expect(readFileSync('src/search.ts','utf8')).not.toContain('full-text');
  });
});
