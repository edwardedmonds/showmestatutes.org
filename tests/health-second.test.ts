import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './health-second-queries.json';
import { assertDataset, enactmentNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Health services, vital records, anatomical gifts and drug-regulation heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact citations across Chapters 192–195 and four-digit sections distinct', () => {
  for (const section of ['192.027', '192.1120', '192.2155', '192.2405', '193.087', '193.145', '194.119', '194.425', '195.550', '195.900']) {
    const result = search(section, asOf, true);
    expect(result.best.length).toBeGreaterThan(0);
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.section === section)).toBe(true);
  }
});

it('preserves the health-rule reprint alongside its separately warned source version', () => {
  for (const includeUpcoming of [false, true]) {
    for (const chapter of ['', '192']) {
      const result = search('192.310', asOf, includeUpcoming, chapter);
      expect(result.best.map(m => m.record.id)).toEqual(['192.310:36197']);
      expect(result.constitutional.map(m => m.record.id)).toEqual(['192.310:9768']);
      expect([...result.related, ...result.upcoming, ...result.contingent]).toEqual([]);
      for (const m of [...result.best, ...result.constitutional]) {
        expect(m.record.effectiveTo).toBeNull();
        expect(enactmentNotice(m.record)).toContain('reprints an earlier version');
        expect(m.record.sourceUrl).toBe(`https://revisor.mo.gov/main/OneSection.aspx?section=192.310&bid=${m.record.versionId}`);
      }
    }
    const excluded = search('192.310', asOf, includeUpcoming, '193');
    expect([...excluded.best, ...excluded.related, ...excluded.upcoming, ...excluded.contingent, ...excluded.constitutional]).toEqual([]);
  }
});
