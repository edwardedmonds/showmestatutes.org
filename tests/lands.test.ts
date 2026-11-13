import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './lands-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Land, drainage and public water supply heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.topTwo) expect(result.best.slice(0,2).map(m => m.record.section).sort()).toEqual([...q.topTwo].sort());
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations across all ten land and water-supply chapters distinct', () => {
  for (const section of ['241.300','242.698','243.490','244.130','245.450','246.180','247.050','248.170','249.1155','250.230']) {
    for (const upcoming of [false,true]) {
      const result=search(section,asOf,upcoming);
      expect(result.best).toHaveLength(1);
      expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);
    }
  }
});
