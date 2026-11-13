import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './property-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Property heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});


it('preserves every condominium citation and its exact official source link', () => {
 for (const record of dataset.records.filter(r=>r.chapter==='448')) for (const upcoming of [false,true]) {
  const result=search(record.section,asOf,upcoming);expect(result.best).toHaveLength(1);expect(result.best[0].record.id).toBe(record.id);
  expect(result.best[0].record.sourceUrl).toBe(`https://revisor.mo.gov/main/OneSection.aspx?section=${record.section}&bid=${record.versionId}`);
 }
});
it('keeps the unclaimed-property warning separate without inferring warnings from rejected challenges', () => {
 for (const upcoming of [false,true]) {
  const warning=search('447.575',asOf,upcoming);expect(warning.best).toHaveLength(0);expect(warning.constitutional.map(m=>m.record.id)).toEqual(['447.575:24826']);
  for (const section of ['442.130','442.571','448.3-116']) {const result=search(section,asOf,upcoming);expect(result.best[0]?.record.section).toBe(section);expect(result.constitutional).toHaveLength(0);}
 }
});
