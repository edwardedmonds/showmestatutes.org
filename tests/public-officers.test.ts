import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './public-officers-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-12';

describe('Public-officer queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps public-officer citations distinct across neighboring chapters', () => {
  for (const section of ['104.010', '105.010', '106.010', '107.010', '108.010', '109.010', '110.010']) {
    const result = search(section, asOf, true);
    expect(result.best.length).toBeGreaterThan(0);
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.section === section)).toBe(true);
  }
});

it('does not leak public-record matches into public-fund chapters', () => {
  const result = search('109.180', asOf, true, '110');
  expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional]).toEqual([]);
  expect(search('public records open inspection', asOf, false, '109').best[0]?.record.section).toBe('109.180');
});

it('keeps all 21 reviewed public-officer versions in the warning group without inventing replacements', () => {
  const ids = ["105.503:34967", "105.505:34968", "105.525:34969", "105.530:34970", "105.533:34971", "105.535:34972", "105.537:34973", "105.540:34974", "105.545:34975", "105.550:34976", "105.555:34977", "105.570:34978", "105.575:34979", "105.580:34980", "105.583:34981", "105.585:34982", "105.590:34983", "105.595:34984", "105.598:34985", "105.1415:5715", "105.1155:51508"];
  for (const id of ids) {
    const section = id.split(':')[0];
    for (const includeUpcoming of [false, true]) {
      const result = search(section, asOf, includeUpcoming, '105');
      expect(result.best).toEqual([]);
      expect(result.related).toEqual([]);
      expect(result.upcoming).toEqual([]);
      expect(result.constitutional.map(m => m.record.id)).toEqual([id]);
      expect(result.constitutional[0].record.multipleEnactments).toBeUndefined();
      const excluded = search(section, asOf, includeUpcoming, '106');
      expect(excluded.constitutional).toEqual([]);
    }
  }
});
