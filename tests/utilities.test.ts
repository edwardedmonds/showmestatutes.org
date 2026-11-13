import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './utilities-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Utilities and carriers heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations distinct across all nine utility chapters', () => {
for (const section of ["386.135", "386.250", "387.180", "387.408", "388.230", "388.480", "389.560", "389.840", "390.126", "390.330", "391.010", "391.230", "392.160", "392.550", "393.861", "393.939", "394.085", "394.140"]) for (const upcoming of [false,true]) {const result=search(section,asOf,upcoming);expect(result.best).toHaveLength(1);expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);}
});
it('keeps hypothetical rulemaking language outside the actual-warning group', () => {
 for(const upcoming of [false,true]) {const result=search('390.021',asOf,upcoming);expect(result.best.map(m=>m.record.id)).toEqual(['390.021:21925']);expect([...result.related,...result.upcoming,...result.contingent,...result.constitutional]).toEqual([]);}
});
