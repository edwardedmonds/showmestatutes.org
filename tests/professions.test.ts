import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './professions-queries.json';
import { assertDataset, enactmentNotice, constitutionalNotice, isEffective, isUpcoming, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Occupations and professions heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.topTwo) expect(result.best.slice(0,2).map(m=>m.record.section).sort()).toEqual([...q.topTwo].sort());
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations distinct across all twenty-two populated chapters', () => {
for (const section of ["324.1107", "325.050", "326.325", "327.371", "328.130", "329.070", "330.090", "331.010", "332.304", "333.161", "334.001", "335.415", "336.050", "337.135", "338.340", "339.515", "340.238", "341.110", "343.010", "344.105", "345.021", "346.135"]) {const result=search(section,asOf,true);expect(result.best).toHaveLength(1);expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);}
});
it('preserves the appraiser reprinted pair while separating only the warned version', () => {
  for (const [section, warned, reprinted] of [['339.507','18172','36199']]) {
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
      const excluded=search(section,asOf,upcoming,'338');
      expect([...excluded.best,...excluded.related,...excluded.upcoming,...excluded.contingent,...excluded.constitutional]).toEqual([]);
    }
  }
});
it('keeps the standalone appraiser warning outside ordinary results', () => {
 for(const upcoming of [false,true]) {const result=search('339.531',asOf,upcoming);expect(result.constitutional.map(m=>m.record.id)).toEqual(['339.531:18185']);expect([...result.best,...result.related,...result.upcoming,...result.contingent]).toEqual([]);}
});
it('preserves conditional repeal pairs without scheduling a 2099 expiration', () => {
 for(const [section,repeal,earlier] of [['324.406','60569','35854'],['324.424','60572','35859']]) {
  for(const day of [asOf,'2099-01-01','2100-01-01']) for(const upcoming of [false,true]) {
   const result=search(section,day,upcoming);expect(result.best.map(m=>m.record.versionId)).toEqual([earlier]);expect(result.contingent.map(m=>m.record.versionId)).toEqual([repeal]);expect([...result.upcoming,...result.related,...result.constitutional]).toEqual([]);
   for(const m of [...result.best,...result.contingent]) {expect(m.record.effectiveTo).toBe('2099-01-01');expect(m.record.effectiveEndDateIsPlaceholder).toBe(true);expect(enactmentNotice(m.record)).toContain('not scheduled start or end dates');}
   const retired=result.contingent[0].record;expect(retired.title).toBe('(Repealed L. 2026 S.B. 1233)');expect(isEffective(retired,day)).toBe(false);expect(isUpcoming(retired,day)).toBe(false);
  }
 }
});
it('requires exact placeholder end flags, dates and repeal headings in the browser validator', () => {
 for(const id of ['324.406:60569','324.406:35854','324.424:60572','324.424:35859']) {
  for(const change of ['flag','date']) {
   const broken=structuredClone(dataset);const r=broken.records.find(r=>r.id===id)!;
   if(change==='flag') delete r.effectiveEndDateIsPlaceholder; else r.effectiveTo='2098-01-01';
   expect(()=>assertDataset(broken)).toThrow();
  }
 }
 const broken=structuredClone(dataset);broken.records.find(r=>r.id==='324.406:60569')!.title='Repeal assumed';expect(()=>assertDataset(broken)).toThrow();
 const ordinary=structuredClone(dataset);ordinary.records.find(r=>r.section==='1.010')!.effectiveEndDateIsPlaceholder=true;expect(()=>assertDataset(ordinary)).toThrow();
}, 20000);
it('keeps source-resolved compact dates and condition headings outside the contingent group', () => {
 for(const [section,date] of [['324.016','2008-08-28'],['335.420','2016-08-28'],['337.170','2018-08-28'],['335.365','2017-07-20'],['337.135','2020-12-22']]) {
  const result=search(section,asOf,true);expect(result.best).toHaveLength(1);expect(result.best[0].record.effectiveFrom).toBe(date);expect(result.contingent).toEqual([]);
 }
});
