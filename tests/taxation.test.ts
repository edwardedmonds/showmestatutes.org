import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './taxation-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-12';

describe('Taxation heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps neighboring taxation chapter citations distinct', () => {
  for (const section of ['135.010', '136.010', '137.010', '138.010', '140.010', '141.010']) {
    const result = search(section, asOf, true);
    expect(result.best.length).toBeGreaterThan(0);
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.section === section)).toBe(true);
  }
});

it('keeps the delinquent-land-list reprint separate from its warned 2022 enactment', () => {
  for (const upcoming of [false, true]) {
    const result = search('140.170', asOf, upcoming, '140');
    expect(result.best.map(m => m.record.versionId)).toEqual(['6932']);
    expect(result.best[0].record.effectiveFrom).toBe('2015-08-28');
    expect(result.constitutional.map(m => m.record.versionId)).toEqual(['51501']);
    expect(result.constitutional[0].record.effectiveFrom).toBe('2022-08-28');
    expect([...result.related, ...result.upcoming, ...result.contingent]).toEqual([]);
    for (const m of [...result.best, ...result.constitutional]) {
      expect(m.record.effectiveTo).toBeNull();
      expect(m.record.multipleEnactments).toBe(true);
      expect(m.record.sourceUrl).toBe(`https://revisor.mo.gov/main/OneSection.aspx?section=140.170&bid=${m.record.versionId}`);
    }
    const excluded = search('140.170', asOf, upcoming, '141');
    expect([...excluded.best, ...excluded.related, ...excluded.upcoming, ...excluded.contingent, ...excluded.constitutional]).toEqual([]);
  }
});
