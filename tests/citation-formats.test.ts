import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { assertDataset, validSection, constitutionalNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
import formats from './citation-formats.json';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
for (const section of formats.valid) it(`accepts reviewed source citation ${section}`,()=>expect(validSection(section)).toBe(true));
for (const section of formats.invalid) it(`rejects malformed source citation ${section}`,()=>expect(validSection(section)).toBe(false));
it('keeps every UCC and securities article citation exact under both date settings',()=>{
 for(const r of dataset.records.filter(r=>['400','409'].includes(r.chapter)&&r.section.includes('-'))) for(const upcoming of [false,true]) {
  const result=search(r.section,'2026-11-13',upcoming);
  expect(result.exact).toBe(true);expect(result.best.map(m=>m.record.id)).toEqual([r.id]);expect(result.best[0].record.sourceUrl).toBe(r.sourceUrl);
  expect([...result.related,...result.upcoming,...result.contingent,...result.constitutional]).toEqual([]);
 }
});
it('accepts lowercase article input without rewriting source identities or links',()=>{
 for(const section of ['400.2A-101','400.4A-101']) for(const input of [section.toLowerCase(),`§ ${section.toLowerCase()}`,`RSMo ${section}.`,`section ${section}`]) {
  const result=search(input,'2026-11-13');expect(result.best).toHaveLength(1);expect(result.best[0].record.section).toBe(section);expect(result.best[0].record.sourceUrl).toContain(`section=${section}&bid=`);
 }
});
it('keeps numeric and letter articles distinct and applies chapter exclusion',()=>{
 for(const section of ['400.2-101','400.2A-101','400.4-101','400.4A-101','409.1-101']) {
  const result=search(section,'2026-11-13');expect(result.best.map(m=>m.record.section)).toEqual([section]);
  const excluded=search(section,'2026-11-13',true,'402');expect([...excluded.best,...excluded.related,...excluded.upcoming,...excluded.contingent,...excluded.constitutional]).toEqual([]);
 }
});
it('does not guess malformed or absent numeric references',()=>{
 for(const query of [...formats.invalid.filter(s=>s!=='400.2a-101'),'400.2A-999','409.7-999','400.2A 101','400.2A-101 typo','400.2A–101']) {
  const result=search(query,'2026-11-13',true);expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional]).toEqual([]);expect(result.correction).toBeNull();
 }
});
it('rejects altered source case, chapter, date and version URLs in the combined dataset',()=>{
 const original=dataset.records.find(r=>r.section==='400.2A-101')!;
 for(const patch of [{section:'400.2a-101',id:`400.2a-101:${original.versionId}`},{chapter:'409'},{sourceUrl:original.sourceUrl.replace('2A','2')},{id:original.id+'0'},{effectiveFrom:'2026-02-30'}]) {
  const bad=structuredClone(dataset);Object.assign(bad.records.find(r=>r.id===original.id)!,patch);expect(()=>assertDataset(bad)).toThrow();
 }
},20000);
it('keeps the asphalt-shingle constitutional warning outside ordinary and upcoming matches',()=>{
 for(const upcoming of [false,true]) {const result=search('407.1610','2026-11-13',upcoming);expect(result.constitutional.map(m=>m.record.id)).toEqual(['407.1610:23330']);expect([...result.best,...result.related,...result.upcoming,...result.contingent]).toEqual([]);}
});

it('explains the limited fuel-pricing amendment warning in its separate result group',()=>{
 for(const upcoming of [false,true]) {const result=search('416.615','2026-11-13',upcoming);expect(result.constitutional.map(m=>m.record.id)).toEqual(['416.615:23820']);expect([...result.best,...result.related,...result.upcoming,...result.contingent]).toEqual([]);expect(constitutionalNotice(result.constitutional[0].record)).toContain('does not establish that the entire section is invalid');}
});
