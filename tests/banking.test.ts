import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './banking-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Banking and financial institutions heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations distinct across all nine banking chapters', () => {
for (const section of ["361.996", "361.963", "362.063", "362.410", "364.135", "364.140", "365.110", "365.090", "367.521", "367.530", "368.060", "368.080", "369.211", "369.162", "370.283", "370.230", "371.150", "371.210"]) for (const upcoming of [false,true]) {const result=search(section,asOf,upcoming);expect(result.best).toHaveLength(1);expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);}
});
it('keeps hypothetical rulemaking language outside the actual-warning group', () => {
 for(const upcoming of [false,true]) {const result=search('361.933',asOf,upcoming);expect(result.best.map(m=>m.record.id)).toEqual(['361.933:54889']);expect([...result.related,...result.upcoming,...result.contingent,...result.constitutional]).toEqual([]);}
});
