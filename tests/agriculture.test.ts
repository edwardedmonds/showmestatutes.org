import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './agriculture-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Agriculture and animal heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact agriculture citations, source retries and empty chapter distinct', () => {
  for (const section of ["261.100", "262.001", "263.512", "264.051", "265.380", "266.095", "267.625", "268.151", "269.021", "270.260", "271.130", "272.134", "273.080", "274.210", "275.357", "276.516", "277.022", "278.100", "281.048", "262.700", "267.169", "281.101", "281.265"]) {
    for (const upcoming of [false,true]) {
      const result=search(section,asOf,upcoming);
      expect(result.best).toHaveLength(1);
      expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);
    }
  }
  expect(dataset.records.filter(r=>r.chapter==='280')).toEqual([]);
  expect(search('timber',asOf,true,'280').best).toEqual([]);
});
