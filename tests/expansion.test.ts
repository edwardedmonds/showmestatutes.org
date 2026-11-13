import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './expansion-queries.json';
import pilotQueries from './queries.json';
import { assertDataset, chapterPolicy, isEffective, isUpcoming, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-12';
describe('Expanded criminal-law coverage benchmark', () => {
  for (const q of queries) it(q.query, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.top3) for (const section of q.top3) expect(result.best.slice(0, 3).map(m => m.record.section)).toContain(section);
    if (q.related) for (const section of q.related) expect(result.related.map(m => m.record.section)).toContain(section);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});
it('finds every effective section by exact citation, with no future version promoted', () => {
  // Derive expected identities once; avoid rescanning the statewide corpus for every assertion.
  const expected: Record<string, string[]> = {};
  for (const record of dataset.records) {
    if (isEffective(record, asOf)) (expected[record.section] ??= []).push(record.id);
  }
  for (const [section, ids] of Object.entries(expected)) {
    const result = search(section, asOf);
    expect(result.best.map(m => m.record.id).sort()).toEqual(ids.sort());
  }
});
it('keeps all chapter boundaries and future versions consistent with the source intervals', () => {
  for (const record of dataset.records.filter(r => isUpcoming(r, asOf))) {
    expect(search(record.section, asOf).best.map(m => m.record.id)).not.toContain(record.id);
    expect(search(record.section, asOf, true).upcoming.map(m => m.record.id)).toContain(record.id);
    expect(search(record.section, record.effectiveFrom).best.map(m => m.record.id)).toContain(record.id);
  }
});
it('filters headings, related sections, upcoming versions and exact citations by chapter', () => {
  const result = search('definitions', asOf, true, '565');
  expect(result.best[0].record.section).toBe('565.002');
  expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.chapter === '565')).toBe(true);
  expect(search('579.015', asOf, true, '565').best).toEqual([]);
  expect(search('grand jury', asOf, false, '540').best.length).toBeGreaterThan(0);
  expect(search('murder', asOf, true, '540').related).toEqual([]);
});
it('requires every configured chapter, including explicitly empty index provenance', () => {
  expect(dataset.manifest.coverage).toEqual(chapterPolicy.map(c => c.chapter));
  const missing = structuredClone(dataset);
  missing.manifest.chapters = missing.manifest.chapters.filter(c => c.chapter !== '560');
  expect(() => assertDataset(missing)).toThrow('provenance');
  const missingRecords = structuredClone(dataset);
  missingRecords.records = missingRecords.records.filter(r => r.chapter !== '540');
  missingRecords.manifest.recordCount = missingRecords.records.length;
  missingRecords.manifest.sectionCount = new Set(missingRecords.records.map(r => r.section)).size;
  expect(() => assertDataset(missingRecords)).toThrow('provenance');
});
it('rejects mislabeled chapters and made-up collection timestamps', () => {
  const wrong = structuredClone(dataset);
  wrong.records[0].chapter = '565';
  expect(() => assertDataset(wrong)).toThrow();
  const wrongDate = structuredClone(dataset);
  wrongDate.manifest.indexCheckedAt = '2026-11-12T00:00:00Z';
  expect(() => assertDataset(wrongDate)).toThrow('dates');
});

describe('Unambiguous pilot expectations still work across the expanded collection', () => {
  for (const q of pilotQueries.filter(q => !['definitions', 'grand jury'].includes(q.query))) it(q.query, () => {
    const result = search(q.query, asOf);
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.top3) for (const section of q.top3) expect(result.best.slice(0, 3).map(m => m.record.section)).toContain(section);
    if (q.related) for (const section of q.related) expect(result.related.map(m => m.record.section)).toContain(section);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('retains both explicitly documented concurrent enactments and rejects unmarked overlaps', () => {
  expect(search('590.1265', asOf).best.map(m => m.record.id).sort()).toEqual(['590.1265:50096', '590.1265:50165']);
  const wrong = structuredClone(dataset);
  delete wrong.records.find(r => r.id === '590.1265:50096')!.multipleEnactments;
  expect(() => assertDataset(wrong)).toThrow();
  const wrongDate = structuredClone(dataset);
  wrongDate.records.find(r => r.id === '590.1265:50096')!.effectiveFrom = '2022-08-28';
  expect(() => assertDataset(wrongDate)).toThrow('concurrent');
});
