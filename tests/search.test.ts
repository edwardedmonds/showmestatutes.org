import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './queries.json';
import { assertDataset, isEffective, type Dataset } from '../src/data';
import { buildIndex, createSearch, loadIndex } from '../src/search';

const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const pilotSearch = createSearch(dataset.records.filter(r => r.chapter === '565'));

const asOf = '2026-11-11';

describe('Chapter 565 relevance benchmark (frozen before ranking implementation is evaluated)', () => {
  for (const query of queries) {
    it(query.query, () => {
      const result = pilotSearch(query.query, asOf);
      if (query.first) expect(result.best[0]?.record.section).toBe(query.first);
      if (query.top3) for (const section of query.top3) expect(result.best.slice(0, 3).map(r => r.record.section)).toContain(section);
      if (query.related) for (const section of query.related) expect(result.related.map(r => r.record.section)).toContain(section);
      if (query.empty) expect([...result.best, ...result.related, ...result.contingent]).toHaveLength(0);
    });
  }
});

it('selects the current source version instead of the future default', () => {
  const result = search('first degree assault', asOf, true);
  expect(result.best[0].record.versionId).toBe('29279');
  expect(result.best[0].record.sourceUrl).toContain('bid=29279');
  expect(result.upcoming[0].record.versionId).toBe('60733');
  expect(result.upcoming[0].record.effectiveFrom).toBe('2027-07-01');
  expect(result.best.every(r => isEffective(r.record, asOf))).toBe(true);
});
it('uses an exclusive end date and switches at the effective boundary', () => {
  expect(search('565.050', '2027-06-30').best[0].record.versionId).toBe('29279');
  expect(search('565.050', '2027-07-01').best[0].record.versionId).toBe('60733');
});
it('does not silently show future-only sections as current', () => {
  expect(search('565.400', asOf).best).toHaveLength(0);
  expect(search('565.400', asOf, true).upcoming[0].record.effectiveFrom).toBe('2027-07-01');
});
it('preserves first/second degree distinctions', () => {
  expect(search('second degree murder', asOf).best.map(r => r.record.section)).not.toContain('565.020');
});
it('keeps homicide as a broader topic rather than a synonym for one offense', () => {
  const results = search('homicide', asOf);
  expect(results.best[0]?.record.section).not.toBe('565.020');
  expect(results.related.length).toBeGreaterThanOrEqual(5);
});
it('does not index incidental statutory body text', () => {
  const injected = dataset.records.map(r => ({ ...r, text: 'quantum banana spaceship' }));
  expect(createSearch(injected)('quantum banana spaceship', asOf).best).toHaveLength(0);
});
it('supports loading a serialized index without changing results', () => {
  const restored = createSearch(dataset.records, loadIndex(JSON.stringify(buildIndex(dataset.records))));
  expect(restored('first degree murder', asOf)).toEqual(search('first degree murder', asOf));
});
it('rejects malformed and overlapping source records', () => {
  const corrupt = structuredClone(dataset);
  corrupt.records[0].sourceUrl = 'https://example.org/';
  expect(() => assertDataset(corrupt)).toThrow();
  const overlap = structuredClone(dataset);
  overlap.records.find(r => r.id === '565.050:29279')!.effectiveTo = null;
  expect(() => assertDataset(overlap)).toThrow('overlap');
});
it('handles blanks, punctuation, overlong input and markup as plain search text', () => {
  for (const q of ['', '   ', '§', 'a'.repeat(201), '<script>alert(1)</script>']) expect(search(q, asOf).best).toEqual([]);
});
it('rejects invalid as-of dates', () => {
  expect(() => search('murder', '2026-02-30')).toThrow();
});

it('never treats degree-only overlap as a murder heading match', () => {
  const results = search('first degree murder', asOf);
  expect(results.best.map(m => m.record.section)).toEqual(['565.020']);
  expect(results.related.map(m => m.record.section)).toContain('565.030');
  expect([...results.best, ...results.related].map(m => m.record.section)).not.toContain('565.050');
});
