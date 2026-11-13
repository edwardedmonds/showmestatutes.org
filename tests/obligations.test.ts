import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './obligations-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Debtor-creditor and contract heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.contains) expect(result.best.map(m => m.record.section)).toEqual(expect.arrayContaining(q.contains));
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations distinct across all twelve debtor-creditor and contract chapters', () => {
for (const section of ["425.027", "425.300", "426.310", "426.410", "427.130", "427.180", "428.024", "428.135", "429.140", "429.611", "430.150", "430.200", "431.010", "431.050", "432.010", "432.230", "433.010", "433.040", "434.030", "434.100", "435.355", "435.460", "436.321", "436.450"]) for (const upcoming of [false,true]) {const result=search(section,asOf,upcoming);expect(result.best).toHaveLength(1);expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);}
});
