import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './labor-queries.json';
import { assertDataset, enactmentNotice, constitutionalNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Labor and employment heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact labor citations distinct across all ten chapters', () => {
  for (const section of ['285.1045','286.080','287.143','288.100','290.140','291.130','292.650','293.620','294.045','295.080']) {
    const result=search(section,asOf,true);
    expect(result.best).toHaveLength(1);
    expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);
  }
});
it('preserves the five labor reprinted pairs while separating only the warned version', () => {
  for (const [section, warned, reprinted] of [['288.036','15216','33833'],['288.060','15227','33834'],['288.120','15236','33837'],['288.122','15238','33835'],['288.330','15271','33836']]) {
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
      const excluded=search(section,asOf,upcoming,'287');
      expect([...excluded.best,...excluded.related,...excluded.upcoming,...excluded.contingent,...excluded.constitutional]).toEqual([]);
    }
  }
});
it('separates the certification-conditioned section without inventing dates or multiple versions', () => {
  for (const upcoming of [false,true]) {
    const result=search('288.501',asOf,upcoming);
    expect([...result.best,...result.related,...result.upcoming,...result.constitutional]).toEqual([]);
    expect(result.contingent.map(m=>m.record.id)).toEqual(['288.501:15289']);
    const r=result.contingent[0].record;
    expect(r.effectiveFrom).toBe('2009-06-12');expect(r.effectiveTo).toBeNull();
    expect(r.hasContingentEffectiveDate).toBe(true);
    expect(r.effectiveDateIsPlaceholder).not.toBe(true);expect(r.multipleEnactments).not.toBe(true);
  }
});
