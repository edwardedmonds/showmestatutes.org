import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './health-first-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Public health and emergency-service heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations across public health chapters and four-digit sections distinct', () => {
  for (const section of ['188.021', '189.015', '190.108', '191.227', '190.1005', '190.1010', '191.1145', '191.2610']) {
    const result = search(section, asOf, true);
    expect(result.best.length).toBeGreaterThan(0);
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.section === section)).toBe(true);
  }
});

it('keeps the warned ambulance-district section separate in scoped and unscoped searches', () => {
  for (const upcoming of [false, true]) {
    for (const chapter of ['', '190']) {
      const result = search('190.088', asOf, upcoming, chapter);
      expect(result.constitutional.map(m => m.record.id)).toEqual(['190.088:9437']);
      expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent]).toEqual([]);
      const record = result.constitutional[0].record;
      expect(record.effectiveFrom).toBe('2014-08-28');
      expect(record.effectiveTo).toBeNull();
      expect(record.sourceUrl).toBe('https://revisor.mo.gov/main/OneSection.aspx?section=190.088&bid=9437');
    }
    const excluded = search('190.088', asOf, upcoming, '189');
    expect([...excluded.best, ...excluded.related, ...excluded.upcoming, ...excluded.contingent, ...excluded.constitutional]).toEqual([]);
  }
});
