import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './conservation-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Conservation, natural resources and development heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact conservation citations and source footnotes distinct', () => {
  for (const section of ['251.505','252.243','253.175','254.225','256.447','257.230','258.100','259.100','260.295','260.1092','260.1101']) {
    for (const upcoming of [false,true]) {
      const result=search(section,asOf,upcoming);
      expect(result.best).toHaveLength(1);
      expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);
    }
  }
  for (const section of ['256.447','260.295','260.1092','260.1101']) {
    const record=search(section,asOf).best[0].record;
    expect(record.headingMarker).toBe(section === '260.1092' ? '' : '*');
    expect(record.effectiveTo).toBeNull();
    expect(record.hasConstitutionalWarning).not.toBe(true);
    expect(record.hasContingentEffectiveDate).not.toBe(true);
  }
  expect(dataset.records.filter(r=>r.chapter==='255')).toEqual([]);
  expect(search('commerce',asOf,true,'255').best).toEqual([]);
});
