import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './transportation-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-12';

it('rejects coverage prose that claims a different scope from the reviewed policy', () => {
  const wrong = structuredClone(dataset);
  wrong.manifest.coverageDescription = 'All Missouri statutes';
  expect(() => assertDataset(wrong)).toThrow('manifest');
});

describe('Transportation heading benchmark defined from source indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.top3) for (const section of q.top3) expect(result.best.slice(0, 3).map(m => m.record.section)).toContain(section);
    if (q.related) {
      expect(result.best).toHaveLength(0);
      expect(result.related.map(m => m.record.section)).toEqual(q.related);
    }
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent]).toHaveLength(0);
  });
});

it('keeps Model Traffic Ordinance results identifiable and separate from other chapter filters', () => {
  const model = search('pedestrians crosswalks', asOf, false, '300');
  expect(model.best.length).toBeGreaterThan(0);
  expect(model.best.every(m => m.record.chapter === '300' && m.record.chapterTitle === 'Model Traffic Ordinance')).toBe(true);
  const statewide = search('right of way', asOf, true, '304');
  expect(statewide.best.length).toBeGreaterThan(0);
  expect([...statewide.best, ...statewide.related, ...statewide.upcoming, ...statewide.contingent].every(m => m.record.chapter === '304')).toBe(true);
});

it('keeps source placeholder dates out of both current and scheduled future results', () => {
  for (const asOf of ['2026-11-12', '2099-01-01', '2100-01-01']) {
    for (const includeUpcoming of [false, true]) {
      const result = search('301.287', asOf, includeUpcoming);
      expect(result.best.map(m => m.record.id)).toEqual(['301.287:60726']);
      expect(result.upcoming).toEqual([]);
      expect(result.contingent.map(m => m.record.id)).toEqual(['301.287:60471']);
    }
  }
  expect(search('301.287', '2026-01-01', true).upcoming.map(m => m.record.id)).toEqual(['301.287:60726']);
});

it('finds contingent headings without the upcoming toggle and applies chapter filtering', () => {
  expect(search('Mason law', asOf).contingent.map(m => m.record.id)).toEqual(['301.287:60471']);
  expect(search('301.287', asOf, true, '304').contingent).toEqual([]);
  expect(search('Mason law', asOf, true, '304').contingent).toEqual([]);
});

it('rejects missing placeholder flags, invented dates, and invented end dates in the reviewed pair', () => {
  const missing = structuredClone(dataset);
  delete missing.records.find(r => r.id === '301.287:60471')!.effectiveDateIsPlaceholder;
  expect(() => assertDataset(missing)).toThrow();
  const wrong = structuredClone(dataset);
  wrong.records.find(r => r.id === '301.287:60471')!.effectiveFrom = '2098-01-01';
  expect(() => assertDataset(wrong)).toThrow('contingent');
  const wrongEnd = structuredClone(dataset);
  wrongEnd.records.find(r => r.id === '301.287:60726')!.effectiveTo = '2099-01-01';
  expect(() => assertDataset(wrongEnd)).toThrow('contingent');
});
