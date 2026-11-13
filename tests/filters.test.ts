import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { type Dataset } from '../src/data';
import { createSearch, type SearchResults } from '../src/search';
import { chapterFacets, filterByChapter, resultCount } from '../src/filters';

const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
const search = createSearch(dataset.records);
const asOf = '2026-11-13';
const groups = ['best', 'related', 'upcoming', 'contingent', 'constitutional'] as const;

describe('Narrow existing results by chapter', () => {
  it('counts actual source versions in each matching chapter, not the whole chapter catalog', () => {
    const found = search('records', asOf);
    const facets = chapterFacets(found);
    const ids = new Set(groups.flatMap(g => found[g].map(m => m.record.id)));
    expect(facets.length).toBeGreaterThan(1);
    expect(resultCount(found)).toBe(ids.size);
    for (const facet of facets) {
      expect(resultCount(filterByChapter(found, facet.chapter))).toBe(facet.count);
      expect(facet.count).toBeLessThanOrEqual(dataset.manifest.chapters.find(c => c.chapter === facet.chapter)!.recordCount);
    }
  });
  it('preserves ranking, reasons, source identity and result groups without mutating the search', () => {
    const found = search('first degree murder', asOf);
    const before = structuredClone(found);
    const narrowed = filterByChapter(found, '565');
    for (const group of groups) expect(narrowed[group]).toEqual(found[group].filter(m => m.record.chapter === '565'));
    expect(narrowed.best[0].record.sourceUrl).toContain('bid=33575');
    expect(narrowed.related.some(m => m.record.section === '565.030')).toBe(true);
    expect(found).toEqual(before);
    expect(filterByChapter(found, '')).toEqual(found);
  });
  it('counts current and upcoming versions separately and keeps them in their own groups', () => {
    const found = search('565.050', asOf, true);
    expect(chapterFacets(found)).toEqual([{ chapter: '565', title: 'Offenses Against the Person', count: 2 }]);
    const narrowed = filterByChapter(found, '565');
    expect(narrowed.best[0].record.versionId).toBe('29279');
    expect(narrowed.upcoming[0].record.versionId).toBe('60733');
    expect(resultCount(search('565.050', asOf, false))).toBe(1);
  });
  it('does not discard conditional or constitutional warning groups', () => {
    for (const group of ['contingent', 'constitutional'] as const) {
      const record = dataset.records.find(r => group === 'constitutional' ? r.hasConstitutionalWarning : r.hasContingentEffectiveDate && r.contingentUntil && r.contingentUntil > asOf)!;
      expect(record).toBeDefined();
      const found = search(record.section, asOf, true);
      expect(found[group].length).toBeGreaterThan(0);
      const narrowed = filterByChapter(found, record.chapter);
      expect(narrowed[group]).toEqual(found[group]);
      expect(chapterFacets(narrowed)[0].count).toBe(resultCount(found));
    }
  });
  it('handles no results and a selected chapter with no remaining visible versions', () => {
    const found = search('565.400', asOf, false);
    expect(chapterFacets(found)).toEqual([]);
    expect(resultCount(filterByChapter(found, '565'))).toBe(0);
  });
  it('does not count a source identity twice if it appears in two groups', () => {
    const found = search('565.020', asOf);
    const overlap: SearchResults = { ...found, related: [...found.best] };
    expect(resultCount(overlap)).toBe(1);
  });
});
