import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './county-queries.json';
import { assertDataset, constitutionalNotice, enactmentNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-12';

describe('County heading benchmark defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.top3) for (const section of q.top3) expect(result.best.slice(0, 3).map(m => m.record.section)).toContain(section);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps identical home-based-work headings in their actual source chapters', () => {
  for (const [chapter, section] of [['64', '64.008'], ['65', '65.710']]) {
    const found = search('home based work', asOf, true, chapter);
    expect(found.best[0]?.record.section).toBe(section);
    expect([...found.best, ...found.related, ...found.upcoming, ...found.contingent, ...found.constitutional].every(m => m.record.chapter === chapter)).toBe(true);
    expect(found.best[0]?.record.sourceUrl).toContain(`section=${section}&bid=`);
  }
});

it('keeps every reviewed constitutional warning out of current and upcoming results', () => {
  const warned = dataset.records.filter(r => r.hasConstitutionalWarning);
  expect(warned.length).toBeGreaterThan(6);
  for (const record of warned) for (const date of ['1900-01-01', '2026-11-12', '2100-01-01']) {
    for (const includeUpcoming of [false, true]) {
      const result = search(record.section, date, includeUpcoming);
      expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent].map(m => m.record.id)).not.toContain(record.id);
      expect(result.constitutional.map(m => m.record.id)).toContain(record.id);
      expect(search(record.section, date, includeUpcoming, '10').constitutional).toEqual([]);
    }
  }
});

it('finds constitutional warnings by heading even with upcoming versions hidden', () => {
  const result = search('homelessness', asOf, false, '67');
  expect(result.constitutional.map(m => m.record.section)).toContain('67.2300');
  expect(result.best.map(m => m.record.section)).not.toContain('67.2300');
});

it('preserves both source versions of reprinted sections without inventing end dates', () => {
  const pairs = [
    ['56.067', '36193', '2011'], ['56.816', '36195', '2078'],
    ['67.457', '2780', '51491'], ['67.461', '2783', '51492'],
    ['67.1431', '3023', '51494'], ['67.1471', '49957', '51495'],
  ];
  for (const [section, reprinted, warned] of pairs) {
    const result = search(section, asOf);
    expect(result.best.map(m => m.record.id)).toEqual([`${section}:${reprinted}`]);
    expect(result.constitutional.map(m => m.record.id)).toEqual([`${section}:${warned}`]);
    for (const match of [...result.best, ...result.constitutional]) {
      expect(match.record.effectiveTo).toBeNull();
      expect(match.record.multipleEnactments).toBe(true);
      expect(enactmentNotice(match.record)).toContain('reprints an earlier version');
    }
  }
});

it('rejects missing, invented or date-altered constitutional warning markers', () => {
  const missing = structuredClone(dataset);
  delete missing.records.find(r => r.id === '1.410:49534')!.hasConstitutionalWarning;
  expect(() => assertDataset(missing)).toThrow('source record');
  const invented = structuredClone(dataset);
  invented.records.find(r => r.section === '46.010')!.hasConstitutionalWarning = true;
  expect(() => assertDataset(invented)).toThrow('source record');
  const wrongDate = structuredClone(dataset);
  wrongDate.records.find(r => r.id === '1.410:49534')!.effectiveFrom = '2021-06-13';
  expect(() => assertDataset(wrongDate)).toThrow('source record');
});

it('rejects invented end dates and incomplete reviewed reprinted pairs', () => {
  const ended = structuredClone(dataset);
  ended.records.find(r => r.id === '56.067:36193')!.effectiveTo = '2014-08-28';
  expect(() => assertDataset(ended)).toThrow('reprinted');
  const missing = structuredClone(dataset);
  missing.records = missing.records.filter(r => r.id !== '56.067:2011');
  expect(() => assertDataset(missing)).toThrow();
});

it('preserves the source qualification for the merged 2014 language in 67.320', () => {
  const result = search('67.320', asOf);
  expect(result.best).toEqual([]);
  expect(result.constitutional.map(m => m.record.id)).toEqual(['67.320:2753']);
  expect(constitutionalNotice(result.constitutional[0].record)).toContain('S.B. 621 is the current version');
});
