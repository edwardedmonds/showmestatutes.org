import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './roads-queries.json';
import { assertDataset, enactmentNotice, constitutionalNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Roads and waterways heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations across all twelve roads and waterways chapters distinct', () => {
  for (const section of ['226.1115','227.328','228.140','229.010','230.245','231.080','233.177','234.070','235.010','236.010','237.010','238.010']) {
    const result=search(section,asOf,true);
    expect(result.best).toHaveLength(1);
    expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);
  }
});
it('preserves the three reprinted pairs while separating only the warned version', () => {
  for (const [section, warned, reprinted] of [['226.033','11971','11972'],['238.212','51503','12727'],['238.222','51504','33130']]) {
    for (const upcoming of [false,true]) {
      const result=search(section,asOf,upcoming);
      expect(result.best.map(m=>m.record.versionId)).toEqual([reprinted]);
      expect(result.constitutional.map(m=>m.record.versionId)).toEqual([warned]);
      expect([...result.upcoming,...result.contingent,...result.related]).toEqual([]);
      for (const m of [...result.best,...result.constitutional]) {
        expect(m.record.multipleEnactments).toBe(true);
        expect(m.record.effectiveTo).toBeNull();
        expect(enactmentNotice(m.record)).toContain('reprints an earlier version');
      }
      expect(constitutionalNotice(result.constitutional[0].record)).toBeTruthy();
      expect(constitutionalNotice(result.best[0].record)).toBeUndefined();
      const excluded=search(section,asOf,upcoming,'237');
      expect([...excluded.best,...excluded.related,...excluded.upcoming,...excluded.contingent,...excluded.constitutional]).toEqual([]);
    }
  }
});
