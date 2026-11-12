import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './government-queries.json';
import { assertDataset, enactmentNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-12';

describe('Government heading benchmark defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('preserves short chapter numbers verbatim and rejects padded identities', () => {
  for (const section of ['1.010', '10.010', '44.020']) {
    const record = dataset.records.find(r => r.section === section)!;
    expect(record.sourceUrl).toContain(`section=${section}&bid=`);
    const wrong = structuredClone(dataset);
    const target = wrong.records.find(r => r.id === record.id)!;
    target.section = target.section.padStart(7, '0');
    target.chapter = target.section.split('.')[0];
    target.id = `${target.section}:${target.versionId}`;
    target.sourceUrl = `https://revisor.mo.gov/main/OneSection.aspx?section=${target.section}&bid=${target.versionId}`;
    expect(() => assertDataset(wrong)).toThrow('source record');
  }
});

it('keeps same-suffix citations in different chapters separate', () => {
  for (const section of ['1.010', '10.010']) {
    const result = search(section, asOf, true);
    expect(result.best.length).toBeGreaterThan(0);
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.section === section)).toBe(true);
  }
});

it('keeps a single contingent version separate without claiming competing enactments or a scheduled start', () => {
  const record = dataset.records.find(r => r.id === '44.098:35640')!;
  expect(record.multipleEnactments).toBeUndefined();
  for (const asOf of ['2026-11-12', '2099-01-01', '2100-01-01']) {
    const result = search('44.098', asOf, true);
    expect(result.best).toEqual([]);
    expect(result.upcoming).toEqual([]);
    expect(result.contingent.map(m => m.record.id)).toEqual(['44.098:35640']);
  }
  expect(search('44.098', asOf, true, '43').contingent).toEqual([]);
  const wrong = structuredClone(dataset);
  wrong.records.find(r => r.id === record.id)!.multipleEnactments = true;
  expect(() => assertDataset(wrong)).toThrow('source record');
  const missing = structuredClone(dataset);
  delete missing.records.find(r => r.id === record.id)!.effectiveDateIsPlaceholder;
  expect(() => assertDataset(missing)).toThrow('source record');
});

it('preserves source intervals for the delayed pair without inventing an end date', () => {
  const now = search('27.117', asOf, true);
  expect(now.best.map(m => m.record.id)).toEqual(['27.117:60466']);
  expect(now.upcoming.map(m => m.record.id)).toEqual(['27.117:60727']);
  const later = search('27.117', '2027-07-01', true);
  expect(later.best.map(m => m.record.id).sort()).toEqual(['27.117:60466', '27.117:60727']);
  expect(later.best.every(m => m.record.effectiveTo === null)).toBe(true);
  expect(later.upcoming).toEqual([]);
  for (const match of later.best) expect(enactmentNotice(match.record)).toContain('delayed effective date');
  expect(enactmentNotice(dataset.records.find(r => r.id === '44.098:35640')!)).toBeUndefined();
  expect(enactmentNotice(dataset.records.find(r => r.id === '301.287:60471')!)).toContain('possible conflict');
  const inventedEnd = structuredClone(dataset);
  inventedEnd.records.find(r => r.id === '27.117:60466')!.effectiveTo = '2027-07-01';
  expect(() => assertDataset(inventedEnd)).toThrow('delayed');
  const inventedStart = structuredClone(dataset);
  inventedStart.records.find(r => r.id === '27.117:60727')!.effectiveFrom = '2027-08-01';
  expect(() => assertDataset(inventedStart)).toThrow('delayed');
});
