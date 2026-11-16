import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pilot from '../data/subsection-headings-pilot.json';
import { headingsFor, parseHeadingRegistry } from '../src/subsection-headings';
import { renderFullText, type FullText } from '../src/full-text';
import { browseAssets } from '../src/seo';
import { buildIndex } from '../src/search';
import type { Dataset } from '../src/data';

const text: FullText = JSON.parse(readFileSync('tests/fixtures/full-text/parsed-535.300.json', 'utf8'));
const registry = parseHeadingRegistry(pilot);
const dataset: Dataset = JSON.parse(readFileSync('public/data/statutes.json', 'utf8'));

describe('Editorial subsection heading pilot', () => {
  it('attaches reviewed labels to the exact archived body and keeps source text and anchors', () => {
    const before = JSON.stringify(text);
    const titles = headingsFor(text, registry);
    expect(titles.size).toBe(8);
    const html = renderFullText(text, titles);
    expect(html).toContain('Deposit returns and itemized damage statements');
    expect(html).toContain('Editorial heading');
    expect(html).toContain('editorial reading aids added by Show Me Statutes');
    expect(html).toContain('id="version-535.300:35191-subsection-3"');
    expect(html).toContain('The landlord shall have complied with this subsection');
    expect(html).toContain('commercial property');
    expect(JSON.stringify(text)).toBe(before);
  });

  it('falls back to numbers for changed sources, annotations, numbering, or subsection text', () => {
    const changes: ((t: FullText) => void)[] = [
      t => { t.id = '535.300:999999'; },
      t => { t.sourceUrl += '&changed=true'; },
      t => { t.sourceSha256 = 'a'.repeat(64); },
      t => { t.textSha256 = 'b'.repeat(64); },
      t => { t.subsections[0].number = 99; },
      t => { t.subsections[1].block += 1; },
      t => { t.blocks[t.subsections[0].block] = '1. A changed rule.'; },
      t => { t.subsections.pop(); },
    ];
    for (const change of changes) {
      const changed = structuredClone(text); change(changed);
      const titles = headingsFor(changed, registry);
      expect(titles.size).toBe(0);
      expect(renderFullText(changed, titles)).not.toContain('class="editorial-heading"');
    }
  });

  it('withholds draft headings and rejects ambiguous duplicate reviews', () => {
    const draft = structuredClone(pilot);
    draft.entries.find(e => e.id === text.id)!.reviewStatus = 'draft';
    expect(headingsFor(text, parseHeadingRegistry(draft)).size).toBe(0);
    const duplicateVersion = structuredClone(pilot);
    duplicateVersion.entries.push(duplicateVersion.entries[0]);
    expect(() => parseHeadingRegistry(duplicateVersion)).toThrow('duplicate version');
    const duplicateNumber = structuredClone(pilot);
    duplicateNumber.entries[0].headings.push(duplicateNumber.entries[0].headings[0]);
    expect(() => parseHeadingRegistry(duplicateNumber)).toThrow('duplicate subsection');
  });

  it('keeps alternate versions and their constitutional notices distinct', () => {
    const versions: FullText[] = JSON.parse(readFileSync('tests/fixtures/full-text/parsed-79.130.json', 'utf8'));
    const old = versions.find(t => t.id === '79.130:36191')!;
    const amended = versions.find(t => t.id === '79.130:3732')!;
    expect(headingsFor(old, registry).size).toBe(0);
    expect(headingsFor(amended, registry).size).toBe(2);
    const data = {...dataset, records: dataset.records.filter(r => r.section === '79.130')};
    const html = browseAssets(data, '/style.css', '2026-11-15', new Map(versions.map(t => [t.id, t])), registry)['statutes/79.130/index.html'];
    expect(html).toContain('declared unconstitutional');
    expect(html.split('id="version-79.130:36191"')[1].split('</li>')[0]).not.toContain('class="editorial-heading"');
    expect(html.split('id="version-79.130:3732"')[1].split('</li>')[0]).toContain('Procedures for enacting ordinances');
  });

  it('requires opt-in and leaves headings, chapter pages, metadata, sitemap, and search inputs alone', () => {
    const data = {...dataset, records: dataset.records.filter(r => r.id === text.id)};
    const before = JSON.stringify(data);
    const index = JSON.stringify(buildIndex(data.records).toJSON());
    const texts = new Map([[text.id, text]]);
    const normal = browseAssets(data, '/style.css', '2026-11-15', texts);
    const labeled = browseAssets(data, '/style.css', '2026-11-15', texts, registry);
    const path = 'statutes/535.300/index.html';
    expect(normal[path]).not.toContain('class="editorial-heading"');
    expect(labeled[path]).toContain('class="editorial-heading"');
    expect(labeled[path].split('</head>')[0]).toBe(normal[path].split('</head>')[0]);
    expect(labeled['chapters/535/index.html']).toBe(normal['chapters/535/index.html']);
    expect(labeled['sitemap.xml']).toBe(normal['sitemap.xml']);
    expect(JSON.stringify(data)).toBe(before);
    expect(JSON.stringify(buildIndex(data.records).toJSON())).toBe(index);
  });

  it('escapes editorial text in visible headings and accessible link names', () => {
    const html = renderFullText(text, new Map([[1, '<img src=x> "Title" & topic']]));
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('&lt;img src=x&gt; &quot;Title&quot; &amp; topic');
  });
});
