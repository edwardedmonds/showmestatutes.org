import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './health-final-queries.json';
import { assertDataset, isEffective, isUpcoming, enactmentNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Public welfare, civil rights and housing heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.includes) expect(result.best.map(m => m.record.section)).toEqual(expect.arrayContaining([q.includes, '215.039']));
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations across the remaining Title XII chapters distinct', () => {
  for (const section of ['208.175', '209.010', '210.790', '211.072', '213.040', '214.132', '215.034']) {
    const result = search(section, asOf, true);
    expect(result.best.length).toBeGreaterThan(0);
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.section === section)).toBe(true);
  }
});

it('keeps the five conditional compact amendments separate from their earlier versions', () => {
  for (const section of ['210.620', '210.622', '210.625', '210.635', '210.640']) {
    for (const query of [section, dataset.records.find(r => r.section === section)!.title]) {
      for (const upcoming of [false, true]) {
        const result = search(query, asOf, upcoming, '210');
        const versions = [...result.best, ...result.contingent].filter(m => m.record.section === section);
        expect(versions).toHaveLength(2);
        const conditional = result.contingent.find(m => m.record.section === section)!.record;
        expect(conditional.effectiveFrom).toBe('2007-08-28');
        expect(conditional.effectiveDateIsPlaceholder).toBeUndefined();
        expect(isEffective(conditional, '2099-01-01')).toBe(false);
        expect(isUpcoming(conditional, '2000-01-01')).toBe(false);
        expect(result.upcoming).toEqual([]);
        expect(enactmentNotice(conditional)).toContain('210.650');
        expect(versions.every(m => m.record.effectiveTo === null && m.record.multipleEnactments)).toBe(true);
      }
    }
  }
});
it('retains the official index heading and rejects altered provenance or conditional markers', () => {
  const r = dataset.records.find(r => r.id === '210.620:11394')!;
  expect(r.title).toBe('Compact enacted, text of compact.');
  expect(r.headingSource).toBe('chapter-index');
  for (const patch of [{headingSource: undefined}, {title: 'Invented heading'}, {hasContingentEffectiveDate: undefined}, {hasContingentEffectiveDate: false}]) {
    const copy = structuredClone(dataset);
    Object.assign(copy.records.find(r => r.id === '210.620:11394')!, patch);
    expect(() => assertDataset(copy)).toThrow();
  }
  const copy = structuredClone(dataset);
  copy.records.find(r => r.id === '210.620:33098')!.hasContingentEffectiveDate = true;
  expect(() => assertDataset(copy)).toThrow();
});
it('does not invent a second indexed version or a repeal date for the two contingent-repeal notes', () => {
  for (const section of ['210.630', '210.700']) {
    const versions = dataset.records.filter(r => r.section === section);
    expect(versions).toHaveLength(1);
    expect(versions[0].headingMarker).toBe('*');
    expect(versions[0].effectiveTo).toBeNull();
    expect(versions[0].multipleEnactments).toBeUndefined();
  }
});
