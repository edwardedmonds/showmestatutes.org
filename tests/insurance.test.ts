import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './insurance-queries.json';
import { assertDataset, enactmentNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Insurance heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations distinct across all twelve insurance chapters', () => {
for (const section of ["374.060", "374.415", "375.196", "375.1218", "376.806", "376.925", "377.320", "377.180", "378.620", "378.629", "379.195", "379.1920", "380.391", "380.291", "381.026", "381.403", "382.177", "382.275", "383.077", "383.108", "384.041", "384.054", "385.211", "385.304"]) for (const upcoming of [false,true]) {const result=search(section,asOf,upcoming);expect(result.best).toHaveLength(1);expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);}
});
it('preserves both possible-conflict enactments and their different source dates', () => {
 for(const upcoming of [false,true]) {
  const result=search('376.1516',asOf,upcoming);expect(result.best.map(m=>m.record.id).sort()).toEqual(['376.1516:20990','376.1516:20991']);expect([...result.related,...result.upcoming,...result.contingent,...result.constitutional]).toEqual([]);
  for(const m of result.best){expect(m.record.effectiveTo).toBeNull();expect(m.record.multipleEnactments).toBe(true);expect(enactmentNotice(m.record)).toContain('possible conflict');expect(enactmentNotice(m.record)).not.toContain('reprints');}
 }
 const early=search('376.1516','2007-12-31',false);expect(early.best.map(m=>m.record.versionId)).toEqual(['20991']);expect(early.upcoming).toEqual([]);
 const future=search('376.1516','2007-12-31',true);expect(future.best.map(m=>m.record.versionId)).toEqual(['20991']);expect(future.upcoming.map(m=>m.record.versionId)).toEqual(['20990']);
 const effective=search('376.1516','2008-01-01',false);expect(effective.best).toHaveLength(2);
});
it('rejects changed dates, inferred ends, missing versions and removed conflict flags', () => {
 for(const field of ['effectiveFrom','effectiveTo','multipleEnactments','remove']) {
  const bad=structuredClone(dataset);const r=bad.records.find(r=>r.id==='376.1516:20990')!;
  if(field==='effectiveFrom') r.effectiveFrom='2007-08-28';else if(field==='effectiveTo')r.effectiveTo='2009-01-01';else if(field==='multipleEnactments')delete r.multipleEnactments;else bad.records=bad.records.filter(r=>r.id!=='376.1516:20990');
  expect(()=>assertDataset(bad)).toThrow();
 }
},20000);
it('does not infer whole-section warnings or expiration dates from unrelated or partial source notes', () => {
 for(const section of ['375.024','376.426','376.1387','381.025']) {
  const result=search(section,asOf,true);expect(result.best).toHaveLength(1);expect([...result.related,...result.upcoming,...result.contingent,...result.constitutional]).toEqual([]);expect(result.best[0].record.effectiveTo).toBeNull();
 }
});
