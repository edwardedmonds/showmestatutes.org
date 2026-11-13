import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './executive-queries.json';
import { assertDataset, isEffective, isUpcoming, isContingent, effectiveDateLabel, sourceDateNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Final executive and standards heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});


it('retains all final source citations and exact links under both upcoming settings', () => {
 for(const r of dataset.records.filter(r=>Number(r.chapter)>=610)) for(const upcoming of [false,true]) {
  const result=search(r.section,asOf,upcoming);const all=[...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional];expect(all.filter(m=>m.record.id===r.id)).toHaveLength(1);expect(all.find(m=>m.record.id===r.id)?.record.sourceUrl).toBe(`https://revisor.mo.gov/main/OneSection.aspx?section=${r.section}&bid=${r.versionId}`);
 }
});
it('keeps both conflicting 644.566 enactments without choosing one or inventing ends', () => {
 for(const upcoming of [false,true]) {const result=search('644.566',asOf,upcoming);expect(result.best.map(m=>m.record.versionId).sort()).toEqual(['31294','31295']);expect(new Set(result.best.map(m=>m.record.title)).size).toBe(2);for(const m of result.best) {expect(m.record.effectiveFrom).toBe('1999-08-28');expect(m.record.effectiveTo).toBeNull();expect(m.record.multipleEnactments).toBe(true);}}
});
it('moves 610.141 out of contingent results at its explicit latest-start deadline, never earlier', () => {
 const r=dataset.records.find(r=>r.id==='610.141:60682')!;
 for(const day of ['2026-08-27','2026-08-28','2026-12-31','2027-01-01','2027-01-02']) for(const upcoming of [false,true]) for(const query of ['610.141',r.title]) {
  const result=search(query,day,upcoming,'610');const pending=day<'2027-01-01';expect(result.contingent.some(m=>m.record.id===r.id)).toBe(pending);expect(result.best.some(m=>m.record.id===r.id)).toBe(!pending);expect(result.upcoming.some(m=>m.record.id===r.id)).toBe(false);expect(isContingent(r,day)).toBe(pending);expect(isEffective(r,day)).toBe(!pending);expect(isUpcoming(r,day)).toBe(false);
  expect(effectiveDateLabel(r,day,false)).toContain(pending?'Contingent effective date':'Effective no later than Jan 1, 2027');
 }
 expect(r.effectiveFrom).toBe('2026-08-28');expect(r.effectiveDateIsPlaceholder).toBeUndefined();expect(sourceDateNotice(r)).toContain('does not establish whether technical feasibility occurred earlier');
});
it('uses the explicit 644.570 footnote date while preserving the differing source header', () => {
 const r=dataset.records.find(r=>r.id==='644.570:31297')!;expect(r.effectiveFrom).toBe('2008-08-28');expect(r.effectiveFromFootnote).toBe('2008-11-04');
 for(const day of ['2008-08-28','2008-11-03','2008-11-04','2008-11-05']) for(const upcoming of [false,true]) for(const query of ['644.570','commissioners borrow additional storm water control plans']) {
  const result=search(query,day,upcoming,'644');const started=day>='2008-11-04';expect(result.best.some(m=>m.record.id===r.id),JSON.stringify({query,day,upcoming,best:result.best.map(m=>m.record.id)})).toBe(started);expect(result.upcoming.some(m=>m.record.id===r.id),JSON.stringify({query,day,upcoming,future:result.upcoming.map(m=>m.record.id)})).toBe(!started&&upcoming);expect(result.contingent.some(m=>m.record.id===r.id)).toBe(false);
 }
 expect(effectiveDateLabel(r,asOf,false)).toContain('Nov 4, 2008 (source footnote) · header date Aug 28, 2008');expect(sourceDateNotice(r)).toContain('confirms voter approval');
 expect(search('644.571',asOf,false).best[0]?.record.hasContingentEffectiveDate).toBeUndefined();
});
it('rejects missing, changed or unreviewed date metadata', () => {
 for(const [id,key,value] of [['610.141:60682','contingentUntil',undefined],['610.141:60682','contingentUntil','2026-12-31'],['644.570:31297','effectiveFromFootnote',undefined],['644.570:31297','effectiveFromFootnote','2008-08-28'],['644.571:31298','effectiveFromFootnote','2008-11-04'],['644.571:31298','contingentUntil','2027-01-01']]) {
  const copy=structuredClone(dataset);const r=copy.records.find(r=>r.id===id)!;Object.assign(r,{[key!]:value});expect(()=>assertDataset(copy)).toThrow();
 }
},20000);
it('keeps annotations rejecting constitutional challenges ordinary', () => {
 for(const sec of ['632.480','644.052']) {const result=search(sec,asOf,true);expect(result.best[0]?.record.section).toBe(sec);expect(result.constitutional).toHaveLength(0);}
});
