import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import queries from './domestic-queries.json';
import { assertDataset, constitutionalNotice, type Dataset } from '../src/data';
import { createSearch } from '../src/search';
const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-13';

describe('Domestic relations heading queries defined from official indexes before ranking evaluation', () => {
  for (const q of queries) it(`${q.query} (${q.chapter ?? 'all'})`, () => {
    const result = search(q.query, asOf, false, q.chapter ?? '');
    if (q.first) expect(result.best[0]?.record.section).toBe(q.first);
    if (q.empty) expect([...result.best, ...result.related, ...result.contingent, ...result.constitutional]).toHaveLength(0);
  });
});


it('keeps every domestic-relations source citation exact under both date settings', () => {
 for (const record of dataset.records.filter(r=>['451','452','453','454','455'].includes(r.chapter))) for (const upcoming of [false,true]) {
  const result=search(record.section,asOf,upcoming);const matches=[...result.best,...result.related,...result.upcoming,...result.contingent,...result.constitutional];expect(matches.map(m=>m.record.id)).toEqual([record.id]);expect(matches[0].record.sourceUrl).toBe(`https://revisor.mo.gov/main/OneSection.aspx?section=${record.section}&bid=${record.versionId}`);
 }
});
it('preserves marriage annotations with a scoped historical warning and ordinary rejected challenges', () => {
 for (const upcoming of [false,true]) {
  for (const section of ['451.022','451.040']) {const result=search(section,asOf,upcoming);expect([...result.best,...result.related,...result.upcoming,...result.contingent]).toHaveLength(0);expect(result.constitutional).toHaveLength(1);}
  const marriage=search('451.022',asOf,upcoming).constitutional[0].record;expect(constitutionalNotice(marriage)).toContain('right of same-sex couples to marry');expect(marriage.effectiveFrom).toBe('2001-08-28');
  const license=search('451.040',asOf,upcoming).constitutional[0].record;expect(license.effectiveFrom).toBe('2025-08-28');expect(constitutionalNotice(license)).toContain('as applied to an incarcerated applicant');expect(constitutionalNotice(license)).toContain('does not establish that the entire 2025 section is invalid');
  for (const section of ['453.120','455.085']) {const result=search(section,asOf,upcoming);expect(result.best[0]?.record.section).toBe(section);expect(result.constitutional).toHaveLength(0);}
 }
});
