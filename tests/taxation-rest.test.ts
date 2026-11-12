import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './taxation-rest-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-12';

describe('Remaining taxation heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.top3) for (const section of q.top3) expect(result.best.slice(0, 3).map(m => m.record.section)).toContain(section);
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('records the empty private-car-tax chapter without creating headings from cross references', () => {
  const chapter = dataset.manifest.chapters.find(c => c.chapter === '152');
  expect(chapter?.recordCount).toBe(0);
  expect(chapter?.sectionCount).toBe(0);
  expect(dataset.records.filter(r => r.chapter === '152')).toEqual([]);
  expect(search('private car', asOf, true, '152').best).toEqual([]);
  for (const section of ['137.022', '137.975', '137.985']) {
    expect(search(section, asOf).best.map(m => m.record.section)).toContain(section);
  }
});
