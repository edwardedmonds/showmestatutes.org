import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './public-safety-queries.json';
import { assertDataset, enactmentNotice, constitutionalNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Alcoholic beverages and public safety heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations distinct across all eleven populated chapters', () => {
for (const section of ["311.025", "313.013", "314.100", "315.067", "316.213", "317.013", "319.019", "320.082", "321.162", "322.140", "323.030"]) {const result=search(section,asOf,true);expect(result.best).toHaveLength(1);expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);}
});
it('preserves the two fire-district reprinted pairs while separating only the warned version', () => {
  for (const [section, warned, reprinted] of [['321.320','34863','17169'],['321.322','17170','36198']]) {
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
      const excluded=search(section,asOf,upcoming,'320');
      expect([...excluded.best,...excluded.related,...excluded.upcoming,...excluded.contingent,...excluded.constitutional]).toEqual([]);
    }
  }
});
it('retains the recorded bingo dates without treating a fulfilled source condition as pending', () => {
 for (const upcoming of [false,true]) for (const [section,date] of [['313.040','2018-12-06'],['313.041','2018-08-28']]) {
  const result=search(section,asOf,upcoming);expect(result.best).toHaveLength(1);expect(result.contingent).toEqual([]);expect(result.best[0].record.effectiveFrom).toBe(date);expect(result.best[0].record.effectiveTo).toBeNull();
 }
});
