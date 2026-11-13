import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './corporations-queries.json';
import { assertDataset, enactmentNotice, constitutionalNotice, standaloneReprintNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Corporations and partnerships heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.topTwo) expect(result.best.slice(0,2).map(m=>m.record.section).sort()).toEqual([...q.topTwo].sort());
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations distinct across all fourteen chapters', () => {
for (const section of ["347.055", "347.093", "348.215", "348.408", "349.025", "349.080", "350.015", "350.030", "351.240", "351.455", "352.070", "352.245", "353.190", "353.160", "354.480", "354.345", "355.166", "355.721", "356.151", "356.241", "357.160", "357.080", "358.110", "358.220", "359.411", "359.145", "360.046", "360.080"]) {const result=search(section,asOf,true);expect(result.best).toHaveLength(1);expect([...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional].every(m=>m.record.section===section)).toBe(true);}
});
it('preserves the eight reprinted pairs while separating only the warned version', () => {
  for (const [section, warned, reprinted] of [["348.251", "18572", "18573"], ["348.256", "18576", "18577"], ["348.261", "18579", "18580"], ["348.262", "18581", "18582"], ["348.263", "18583", "18584"], ["348.264", "18585", "18586"], ["348.271", "18590", "18591"], ["348.300", "18595", "18596"]]) {
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
      const excluded=search(section,asOf,upcoming,'347');
      expect([...excluded.best,...excluded.related,...excluded.upcoming,...excluded.contingent,...excluded.constitutional]).toEqual([]);
    }
  }
});
it('separates annotation-only warnings without duplicating them in the contingent group', () => {
 for(const id of ['348.250:18571','348.257:18578','348.265:18587','348.269:18589','348.280:18594']) for(const upcoming of [false,true]) {
  const result=search(id.split(':')[0],asOf,upcoming);expect(result.constitutional.map(m=>m.record.id)).toEqual([id]);expect([...result.best,...result.related,...result.upcoming,...result.contingent]).toEqual([]);
  const record=result.constitutional[0].record;expect(record.effectiveFrom).toBe('2012-02-03');expect(record.effectiveTo).toBeNull();expect(constitutionalNotice(record)).toContain('S.B.8 did not pass');
 }
});
it('keeps the standalone reprint as one source result with its own explanation', () => {
 for(const upcoming of [false,true]) {
  const result=search('348.253',asOf,upcoming);expect(result.best.map(m=>m.record.id)).toEqual(['348.253:18575']);expect([...result.related,...result.upcoming,...result.contingent,...result.constitutional]).toEqual([]);
  const record=result.best[0].record;expect(record.effectiveFrom).toBe('1995-08-28');expect(record.effectiveTo).toBeNull();expect(record.multipleEnactments).toBeUndefined();expect(enactmentNotice(record)).toBeUndefined();expect(standaloneReprintNotice(record)).toContain('one version');
 }
 expect(standaloneReprintNotice(dataset.records.find(r=>r.section==='348.266')!)).toBeUndefined();
});
it('rejects changed standalone dates, invented multiple versions and missing annotation warnings', () => {
 for(const field of ['effectiveFrom','effectiveTo','multipleEnactments']) {
  const bad=structuredClone(dataset);const r=bad.records.find(r=>r.id==='348.253:18575')!;
  if(field==='effectiveFrom')r.effectiveFrom='1996-08-28';else if(field==='effectiveTo')r.effectiveTo='2012-02-03';else r.multipleEnactments=true;
  expect(()=>assertDataset(bad)).toThrow();
 }
 const bad=structuredClone(dataset);delete bad.records.find(r=>r.id==='348.280:18594')!.hasConstitutionalWarning;expect(()=>assertDataset(bad)).toThrow();
}, 20000);
