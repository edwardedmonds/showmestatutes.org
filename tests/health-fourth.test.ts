import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './health-fourth-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Children’s health, sewer districts and local health services heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations across Chapters 201 and 204–207 distinct', () => {
  for (const section of ['201.020', '204.375', '205.769', '206.110', '207.022']) {
    const result = search(section, asOf, true);
    expect(result.best.length).toBeGreaterThan(0);
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.section === section)).toBe(true);
  }
});

it('preserves the transferred air-conservation chapter as an empty reviewed index', () => {
  const chapter = dataset.manifest.chapters.find(c => c.chapter === '203');
  expect(chapter?.title).toBe('Air Conservation (Transferred to Chapter 643)');
  expect(chapter?.recordCount).toBe(0);
  expect(chapter?.sectionCount).toBe(0);
  expect(dataset.records.filter(r => r.chapter === '203')).toEqual([]);
  for (const includeUpcoming of [false, true]) {
    const result = search('air conservation', asOf, includeUpcoming, '203');
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional]).toEqual([]);
  }
});
