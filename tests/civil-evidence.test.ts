import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './civil-evidence-queries.json';
import { assertDataset, constitutionalNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Evidence, juries and civil procedure heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});


it('finds every current source citation with its exact source URL under both upcoming settings', () => {
 const chapters=['490','491','492','493','494','506','507','508','509','510','511','512','513','514','515','516','517'];
 for(const record of dataset.records.filter(r=>chapters.includes(r.chapter) && r.effectiveFrom<=asOf)) for(const upcoming of [false,true]) {
  const result=search(record.section,asOf,upcoming);const matches=[...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional];
  expect(matches.filter(m=>m.record.id===record.id)).toHaveLength(1);expect(matches.find(m=>m.record.id===record.id)?.record.sourceUrl).toBe(`https://revisor.mo.gov/main/OneSection.aspx?section=${record.section}&bid=${record.versionId}`);
 }
});
it('switches all three executions and exemptions pairs at the explicit 2027 boundary', () => {
 for(const [section,oldId,newId] of [['513.380','27713','60207'],['513.430','51255','60209'],['513.475','27731','60210']]) {
  for(const day of [asOf,'2026-12-31']) for(const upcoming of [false,true]) {
   const result=search(section,day,upcoming);expect(result.best.map(m=>m.record.id)).toEqual([`${section}:${oldId}`]);expect(result.upcoming.map(m=>m.record.id)).toEqual(upcoming?[`${section}:${newId}`]:[]);
  }
  for(const upcoming of [false,true]) {const result=search(section,'2027-01-01',upcoming);expect(result.best.map(m=>m.record.id)).toEqual([`${section}:${newId}`]);expect(result.upcoming).toHaveLength(0);expect(result.related).toHaveLength(0);}
  const old=dataset.records.find(r=>r.id===`${section}:${oldId}`)!;const next=dataset.records.find(r=>r.id===`${section}:${newId}`)!;expect(old.effectiveTo).toBe('2027-01-01');expect(next.effectiveFrom).toBe('2027-01-01');expect(next.effectiveTo).toBeFalsy();expect(next.sourceUrl).toBe(`https://revisor.mo.gov/main/OneSection.aspx?section=${section}&bid=${newId}`);
 }
});
it('keeps four scoped annotations outside ordinary results and a rejected challenge ordinary', () => {
 for(const upcoming of [false,true]) {
  for(const [section,phrase,date] of [['509.520','subdivisions (4) and (5)','2023-08-28'],['510.265','entire 2020 section','2020-08-28'],['513.436','single-subject','1987-07-15'],['516.200','nonresident','2009-08-28']]) {
   const result=search(section,asOf,upcoming);expect(result.best).toHaveLength(0);expect(result.constitutional).toHaveLength(1);expect(constitutionalNotice(result.constitutional[0].record)).toContain(phrase);expect(result.constitutional[0].record.effectiveFrom).toBe(date);
  }
  const ordinary=search('511.760',asOf,upcoming);expect(ordinary.best[0]?.record.section).toBe('511.760');expect(ordinary.constitutional).toHaveLength(0);
 }
});

it('keeps the new adjustment section upcoming until January 2027 without inventing an older version', () => {
 for(const query of ['513.423','adjustment interval revisor duties']) {
  const current=search(query,'2026-12-31',false,'513');expect([...current.best,...current.related,...current.upcoming]).toHaveLength(0);
  const future=search(query,'2026-12-31',true,'513');expect(future.upcoming.map(m=>m.record.id)).toEqual(['513.423:60208']);expect(future.upcoming[0].record.sourceUrl).toBe('https://revisor.mo.gov/main/OneSection.aspx?section=513.423&bid=60208');
  const next=search(query,'2027-01-01',false,'513');expect(next.best[0]?.record.id).toBe('513.423:60208');expect(next.upcoming).toHaveLength(0);
 }
 expect(dataset.records.filter(r=>r.section==='513.423')).toHaveLength(1);
});
