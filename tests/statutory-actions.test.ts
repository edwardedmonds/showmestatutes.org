import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './statutory-actions-queries.json';
import { assertDataset, constitutionalNotice, enactmentNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Statutory actions and torts heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});


it('retains every statutory-actions source citation and exact URL in its appropriate group', () => {
 for(const record of dataset.records.filter(r=>Number(r.chapter)>=521 && Number(r.chapter)<=538)) for(const upcoming of [false,true]) {
  const result=search(record.section,asOf,upcoming);const matches=[...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional];expect(matches.filter(m=>m.record.id===record.id)).toHaveLength(1);expect(matches.find(m=>m.record.id===record.id)?.record.sourceUrl).toBe(`https://revisor.mo.gov/main/OneSection.aspx?section=${record.section}&bid=${record.versionId}`);
 }
});
it('keeps the two reprints ordinary and the invalid enactments warned without inventing ends', () => {
 for(const [section,oldId,newId] of [['523.061','28009','51507'],['526.010','28092','57129']]) for(const upcoming of [false,true]) {
  const result=search(section,asOf,upcoming);expect(result.best.map(m=>m.record.id)).toEqual([`${section}:${oldId}`]);expect(result.constitutional.map(m=>m.record.id)).toEqual([`${section}:${newId}`]);expect(result.upcoming).toHaveLength(0);
  for(const match of [...result.best,...result.constitutional]) {expect(match.record.effectiveTo).toBeNull();expect(match.record.multipleEnactments).toBe(true);expect(enactmentNotice(match.record)).toContain('reprints the earlier version');}
 }
});
it('keeps the printed 1997 Executive Order dates contingent under either upcoming setting', () => {
 for(const section of ['536.019','536.028']) for(const day of [asOf,'2027-01-01','2099-01-01']) for(const upcoming of [false,true]) {
  const result=search(section,day,upcoming);expect([...result.best,...result.related,...result.upcoming,...result.constitutional]).toHaveLength(0);expect(result.contingent).toHaveLength(1);const r=result.contingent[0].record;expect(r.effectiveFrom).toBe('1997-08-28');expect(r.hasContingentEffectiveDate).toBe(true);expect(r.effectiveDateIsPlaceholder).toBeUndefined();expect(r.multipleEnactments).toBeUndefined();
 }
});
it('scopes historical and as-applied warnings and preserves annotations rejecting challenges', () => {
 for(const [section,phrase,date] of [['535.110','indigent','2018-08-28'],['536.050','jurisdictional','2005-08-28'],['536.087','jurisdictional application','1989-08-28'],['537.053','2006 annotation upholding','2002-08-28'],['538.220','as applied to a patient','2005-08-28']]) {
  const result=search(section,asOf,false);expect(result.best).toHaveLength(0);expect(result.constitutional).toHaveLength(1);expect(constitutionalNotice(result.constitutional[0].record)).toContain(phrase);expect(result.constitutional[0].record.effectiveFrom).toBe(date);
 }
 for(const section of ['533.020','535.040','537.067','537.296']) {const result=search(section,asOf,true);expect(result.best[0]?.record.section).toBe(section);expect(result.constitutional).toHaveLength(0);}
});
