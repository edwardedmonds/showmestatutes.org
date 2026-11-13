import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './corrections-queries.json';
import { assertDataset, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Corrections, youth services and jail heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps exact corrections, youth-services and jail citations distinct', () => {
  for (const section of ['217.075', '219.066', '221.102']) {
    const result = search(section, asOf, true);
    expect(result.best).toHaveLength(1);
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.section === section)).toBe(true);
  }
});
it('uses the explicit source end dates at all three scheduled corrections transitions', () => {
  for (const section of ['217.362', '217.690', '217.760']) {
    const versions = dataset.records.filter(r => r.section === section);
    expect(versions).toHaveLength(2);
    const earlier = versions.find(r => r.effectiveTo === '2028-01-01')!;
    const later = versions.find(r => r.effectiveFrom === '2028-01-01')!;
    expect(earlier.headingMarker).toBe('*');
    expect(later.effectiveTo).toBeNull();
    for (const date of [asOf, '2027-12-31']) {
      expect(search(section,date).best.map(m => m.record.id)).toEqual([earlier.id]);
      expect(search(section,date).upcoming).toEqual([]);
      expect(search(section,date,true).upcoming.map(m => m.record.id)).toEqual([later.id]);
    }
    const after = search(section, '2028-01-01', true);
    expect(after.best.map(m => m.record.id)).toEqual([later.id]);
    expect([...after.upcoming, ...after.contingent, ...after.constitutional]).toEqual([]);
    expect(versions.every(r => !r.multipleEnactments && !r.hasContingentEffectiveDate && !r.effectiveDateIsPlaceholder)).toBe(true);
  }
});
