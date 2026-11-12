import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './elections-queries.json';
import { assertDataset, enactmentNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-12';

describe('Election heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});

it('keeps neighboring election chapter citations distinct', () => {
  for (const section of ['116.010', '127.010', '128.010']) {
    const result = search(section, asOf, true);
    expect(result.best.length).toBeGreaterThan(0);
    expect([...result.best, ...result.related, ...result.upcoming, ...result.contingent, ...result.constitutional].every(m => m.record.section === section)).toBe(true);
  }
});

it('separates all four warned 2025 enactments from their earlier reprints', () => {
  for (const [section, newer, earlier] of [['116.155','57131','6318'], ['116.160','57132','6319'], ['116.190','57133','6324'], ['116.334','57134','6341']]) {
    for (const upcoming of [false, true]) {
      const result = search(section, asOf, upcoming, '116');
      expect(result.best.map(m => m.record.versionId)).toEqual([earlier]);
      expect(result.constitutional.map(m => m.record.versionId)).toEqual([newer]);
      expect(result.upcoming).toEqual([]);
      for (const m of [...result.best, ...result.constitutional]) {
        expect(m.record.effectiveTo).toBeNull();
        expect(m.record.multipleEnactments).toBe(true);
        expect(m.record.sourceUrl).toBe(`https://revisor.mo.gov/main/OneSection.aspx?section=${section}&bid=${m.record.versionId}`);
      }
      expect(search(section, asOf, upcoming, '115').constitutional).toEqual([]);
    }
  }
});

it('never schedules or activates any of the twelve congressional placeholder dates', () => {
  const pairs = [['128.345','58520','51003'], ['128.346','58521','51004'], ['128.348','58522','51005']];
  const singles = Array.from({length:9}, (_, i) => [`128.${471+i}`, String(58523+i), '']);
  for (const [section, placeholder, earlier] of [...pairs, ...singles]) {
    for (const date of [asOf, '2099-01-01', '2100-01-01']) for (const upcoming of [false, true]) {
      const result = search(section, date, upcoming, '128');
      expect(result.contingent.map(m => m.record.versionId)).toEqual([placeholder]);
      expect(result.best.map(m => m.record.versionId)).toEqual(earlier ? [earlier] : []);
      expect(result.upcoming).toEqual([]);
      expect(result.related).toEqual([]);
      expect(result.constitutional).toEqual([]);
      expect(result.contingent[0].record.effectiveFrom).toBe('2099-01-01');
      expect(result.contingent[0].record.effectiveTo).toBeNull();
      expect(Boolean(result.contingent[0].record.multipleEnactments)).toBe(Boolean(earlier));
      expect(search(section, date, upcoming, '130').contingent).toEqual([]);
    }
  }
});

it('describes referendum pairs without substituting a possible-conflict explanation', () => {
  const result = search('128.345', asOf, true);
  for (const m of [...result.best, ...result.contingent]) {
    expect(enactmentNotice(m.record)).toContain('subject to a referendum');
    expect(enactmentNotice(m.record)).not.toContain('possible conflict');
  }
  expect(enactmentNotice(search('128.471', asOf, true).contingent[0].record)).toBeUndefined();
});
