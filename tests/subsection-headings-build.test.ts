import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import pilot from '../data/subsection-headings-pilot.json';
import { headingCoverage, loadStatewideHeadings } from '../src/subsection-headings-build';
import { parseHeadingRegistry, headingsFor } from '../src/subsection-headings';
import type { FullText } from '../src/full-text';

const text: FullText = JSON.parse(readFileSync('tests/fixtures/full-text/parsed-535.300.json', 'utf8'));
const source = new Map([[text.id, text]]);
const entry = {...structuredClone(pilot.entries[0]), reviewStatus: 'draft', draftedBy: 'writer'};
function withShard(run: (directory: string, save: (rows: unknown[], file?: string) => void) => void) {
  const directory = mkdtempSync(join(tmpdir(), 'statute-headings-'));
  const save = (entries: unknown[], file = 'chapter-535.json') => writeFileSync(join(directory, file),
    JSON.stringify({schemaVersion: 1, scope: 'local-statewide', entries}));
  try { run(directory, save); } finally { rmSync(directory, {recursive: true, force: true}); }
}
describe('Statewide editorial review gate', () => {
  it('counts drafts but keeps them out of the rendered registry results', () => withShard((dir, save) => {
    save([entry]);
    const registry = loadStatewideHeadings(dir, source, new Map());
    expect(headingsFor(text, registry).size).toBe(0);
    const report = headingCoverage(source, registry);
    expect(report.complete).toBe(false);
    expect(report.counts.draft).toEqual({versions: 1, headings: 8});
  }));
  it('requires a separate reviewer before accepting a statewide draft', () => withShard((dir, save) => {
    const accepted = {...entry, reviewStatus: 'source-checked', reviewedBy: 'reader', reviewSummary: 'Checked entire version and notes.'};
    save([{...accepted, reviewedBy: 'writer'}]);
    expect(() => loadStatewideHeadings(dir, source, new Map())).toThrow('separate source review');
    save([{...accepted, reviewSummary: ''}]);
    expect(() => loadStatewideHeadings(dir, source, new Map())).toThrow('separate source review');
    save([accepted]);
    const registry = loadStatewideHeadings(dir, source, new Map());
    expect(headingsFor(text, registry).size).toBe(8);
    expect(headingCoverage(source, registry).complete).toBe(true);
  }));
  it('rejects wrong chapters, duplicate pilot entries, and unknown identities', () => withShard((dir, save) => {
    save([entry], 'chapter-1.json');
    expect(() => loadStatewideHeadings(dir, source, new Map())).toThrow('wrong-chapter');
    rmSync(join(dir, 'chapter-1.json'));
    save([entry]);
    expect(() => loadStatewideHeadings(dir, source, parseHeadingRegistry({...pilot, entries: [pilot.entries[0]]}))).toThrow('duplicate');
    save([{...entry, id: '535.300:99999'}]);
    expect(() => loadStatewideHeadings(dir, source, new Map())).toThrow('unknown');
  }));
  it('counts stale and absent entries independently of unnumbered and complex versions', () => {
    const unnumbered = {...text, id: 'unnumbered', subsections: []};
    const complex = {...text, id: 'complex', subsections: [], navigationReview: true};
    const missing = {...text, id: 'missing'};
    const registry = parseHeadingRegistry({...pilot, entries: [{...entry, textSha256: '0'.repeat(64)}]});
    const report = headingCoverage(new Map([text, unnumbered, complex, missing].map(t => [t.id, t])), registry);
    expect(report.complete).toBe(false);
    expect(report.counts.stale.versions).toBe(1);
    expect(report.counts.missing.versions).toBe(1);
    expect(report.counts.unnumbered.versions).toBe(1);
    expect(report.counts['complex-numbering'].versions).toBe(1);
    expect(report.totalHeadings).toBe(16);
  });
});
