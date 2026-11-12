import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './municipal-queries.json';
import { assertDataset, enactmentNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-12';

describe('Municipal heading benchmark defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps municipal citation suffixes separate across city classifications', () => {
  for (const section of ['71.010', '77.010', '79.010', '80.010']) {
    const result = search(section, asOf, true);
    expect(result.best.length).toBeGreaterThan(0);
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.section === section)).toBe(true);
  }
});

it('does not leak municipal matches across chapter filters', () => {
  for (const chapter of ['71', '77', '79', '80', '89', '99', '100']) {
    const result = search('city', asOf, true, chapter);
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.chapter === chapter)).toBe(true);
  }
});

it('retains each reviewed municipal reprint alongside its separately warned version', () => {
  for (const [section, warned, reprinted] of [
    ['79.130', '3732', '36191'], ['94.270', '4884', '36196'],
    ['99.825', '51497', '33552'], ['99.830', '51498', '5146'], ['99.865', '51499', '33554'],
  ]) {
    for (const includeUpcoming of [false, true]) {
      const result = search(section, asOf, includeUpcoming);
      expect(result.best.map(m => m.record.id)).toEqual([`${section}:${reprinted}`]);
      expect(result.constitutional.map(m => m.record.id)).toEqual([`${section}:${warned}`]);
      expect(result.upcoming).toEqual([]);
      for (const m of [...result.best, ...result.constitutional]) {
        expect(m.record.effectiveTo).toBeNull();
        expect(enactmentNotice(m.record)).toContain('reprints an earlier version');
      }
    }
  }
});

it('shows the single warned 79.135 version without inventing a reprint', () => {
  const result = search('79.135', asOf, true);
  expect(result.best).toEqual([]);
  expect(result.upcoming).toEqual([]);
  expect(result.constitutional.map(m => m.record.id)).toEqual(['79.135:3733']);
  expect(result.constitutional[0].record.multipleEnactments).toBeUndefined();
});
