import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './estates-courts-queries.json';
import { assertDataset, constitutionalNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Trusts, estates and courts heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});


it('keeps every trust citation exact with its original source link', () => {
 for (const record of dataset.records.filter(r=>r.chapter==='456')) for (const upcoming of [false,true]) {
  const result=search(record.section,asOf,upcoming);expect(result.best.map(m=>m.record.id)).toEqual([record.id]);expect(result.best[0].record.sourceUrl).toBe(record.sourceUrl);expect([...result.related,...result.upcoming,...result.constitutional,...result.contingent]).toEqual([]);
 }
});
it('accepts lowercase terminal letters and keeps A/B citations distinct', () => {
 for (const section of ['456.4-411A','456.4-411B','456.10-1001','456.11-1106']) for (const input of [section,section.toLowerCase(),`§ ${section.toLowerCase()}`,`RSMo ${section}.`,`section ${section}`]) {
  const result=search(input,asOf,true);expect(result.exact).toBe(true);expect(result.best.map(m=>m.record.section)).toEqual([section]);expect(result.best[0].record.sourceUrl).toContain(`section=${section}&bid=`);
 }
 for (const input of ['456.4-411','456.4-411C','456.4-411AB','456.4-411A typo','456.4–411A']) {const result=search(input,asOf,true);expect([...result.best,...result.related,...result.upcoming,...result.constitutional,...result.contingent]).toEqual([]);expect(result.correction).toBeNull();}
});
it('retains both competing court-record enactments without inventing an end or choosing one', () => {
 for (const upcoming of [false,true]) {const result=search('483.140',asOf,upcoming);expect(result.best.map(m=>m.record.id).sort()).toEqual(['483.140:26858','483.140:26859']);for (const {record} of result.best) {expect(record.effectiveFrom).toBe('2014-08-28');expect(record.effectiveTo).toBeNull();expect(record.multipleEnactments).toBe(true);expect(record.sourceUrl).toContain(`bid=${record.versionId}`);}}
 expect(dataset.records.filter(r=>r.chapter==='460')).toEqual([]);
});
it('shows scoped source warnings for historical jurisdiction, severance and rehearing procedures', () => {
 for (const [section,phrase] of [['472.020','entire 1983 section'],['479.359','severed'],['487.030','Rule 130'],['487.080','jurisdictional limitation']]) for (const upcoming of [false,true]) {
  const result=search(section,asOf,upcoming);expect([...result.best,...result.related,...result.upcoming,...result.contingent]).toHaveLength(0);expect(result.constitutional).toHaveLength(1);expect(constitutionalNotice(result.constitutional[0].record)).toContain(phrase);
 }
});
