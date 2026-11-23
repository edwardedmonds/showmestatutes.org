import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { effectiveDateLabel, type Dataset } from '../src/data';
import { navigationFor, type FullText } from '../src/full-text';
import { buildIndex, createSearch, singularize } from '../src/search';
import { browseAssets, homepageSeo, type TopicPage } from '../src/seo';

const dataset: Dataset = JSON.parse(readFileSync('public/data/statutes.json', 'utf8'));
const index = buildIndex(dataset.records);
const search = createSearch(dataset.records, index);

describe('Security and edge-case hardening', () => {
  it('handles 50-prefix adversarial queries quickly with zero results', () => {
    // Warm up lazy vocabulary construction before timing the query itself.
    search('seat belts', '2026-11-13');
    const prefixes = [
      'pro', 'con', 'com', 'req', 'app', 'sta', 'reg', 'pub', 'gen', 'off',
      'law', 'act', 'sec', 'tax', 'fee', 'pay', 'use', 'not', 'may', 'sub',
      'per', 'rec', 'rep', 'rev', 'tra', 'tra', 'dis', 'emp', 'lic', 'ser',
      'pro', 'dep', 'dir', 'boa', 'cou', 'cit', 'mun', 'sch', 'hea', 'med',
      'ins', 'ban', 'fin', 'fun', 'gra', 'loa', 'pro', 'own', 'sal', 'est',
    ];
    const query = prefixes.slice(0, 50).join(' ');
    expect(query.length).toBeLessThanOrEqual(200);
    // Warm up MiniSearch prefix expansion once before timing.
    search(query, '2026-11-13');
    const start = performance.now();
    const res = search(query, '2026-11-13');
    const elapsed = performance.now() - start;
    expect(res.best).toHaveLength(0);
    expect(res.related).toHaveLength(0);
    expect(elapsed).toBeLessThan(500);
  });

  it('preserves stop-word plural queries like "sections" under AND candidate lookup', () => {
    const res = search('sections', '2026-11-13');
    expect(res.best.length).toBeGreaterThan(100);
  });

  it('singularizes pluralized duis/dwis to find 577.010 while preserving real -is words', () => {
    expect(singularize('duis')).toBe('dui');
    expect(singularize('dwis')).toBe('dwi');
    expect(singularize('basis')).toBe('basis');
    expect(singularize('crisis')).toBe('crisis');
    expect(search('duis', '2026-11-13').best.some(m => m.record.section === '577.010')).toBe(true);
    expect(search('dwis', '2026-11-13').best.some(m => m.record.section === '577.010')).toBe(true);
  });

  it('renders past-tense effectiveDateLabel on expired versions when asOf >= effectiveTo', () => {
    const expiring = dataset.records.find(
      r => r.effectiveTo && !r.effectiveEndDateIsPlaceholder && !r.hasConstitutionalWarning && !r.hasContingentEffectiveDate && !r.effectiveDateIsPlaceholder && !r.contingentUntil,
    )!;
    expect(expiring).toBeDefined();
    const expiredLabel = effectiveDateLabel(expiring, expiring.effectiveTo!, false);
    expect(expiredLabel).toMatch(/^Was effective .* · ended /);
    expect(expiredLabel).not.toContain('· ends ');

    const activeBeforeEnd = effectiveDateLabel(expiring, expiring.effectiveFrom, false);
    expect(activeBeforeEnd).toMatch(/^Effective .* · ends /);
  });

  it('formats data-copy-citation with no double periods or double spaces', () => {
    const sample535: FullText = JSON.parse(readFileSync('tests/fixtures/full-text/parsed-535.300.json', 'utf8'));
    const sample79: FullText[] = JSON.parse(readFileSync('tests/fixtures/full-text/parsed-79.130.json', 'utf8'));
    const rec535 = dataset.records.find(r => r.id === sample535.id)!;
    const recs79 = dataset.records.filter(r => r.section === '79.130');
    const fixture: Dataset = { ...dataset, records: [rec535, ...recs79] };
    const fullTextMap = new Map<string, FullText>([
      [sample535.id, sample535],
      ...sample79.map((t): [string, FullText] => [t.id, t]),
    ]);
    const files = browseAssets(fixture, '/style.css', '2026-11-15', fullTextMap);

    for (const path of ['statutes/535.300/index.html', 'statutes/79.130/index.html']) {
      const citations = [...files[path].matchAll(/data-copy-citation="([^"]+)"/g)].map(m => m[1]);
      expect(citations.length).toBeGreaterThan(0);
      for (const citation of citations) {
        expect(citation).not.toContain('..');
        expect(citation).not.toContain('  ');
      }
    }
  });

  it('rejects invalid or duplicate topic slugs and emits referrer + CSP meta tags', () => {
    const sampleRecord = dataset.records.find(r => r.section === '535.300')!;
    const fixture: Dataset = { ...dataset, records: [sampleRecord] };
    const validTopic: TopicPage = {
      slug: 'valid-topic',
      title: 'Valid Topic',
      description: 'Valid topic description.',
      intro: 'Valid topic intro.',
      queries: ['security deposits'],
      sections: ['535.300'],
    };

    for (const badSlug of ['../escape', 'UpperCase', 'bad_slug', 'with space', 'a/b', '']) {
      expect(() =>
        browseAssets(fixture, '/style.css', '2026-11-13', undefined, undefined, [{ ...validTopic, slug: badSlug }]),
      ).toThrow(/Invalid topic slug/);
    }

    expect(() =>
      browseAssets(fixture, '/style.css', '2026-11-13', undefined, undefined, [validTopic, { ...validTopic }]),
    ).toThrow(/Duplicate topic slug/);

    const sample535: FullText = JSON.parse(readFileSync('tests/fixtures/full-text/parsed-535.300.json', 'utf8'));
    const normalFiles = browseAssets(fixture, '/style.css', '2026-11-13', undefined, undefined, [validTopic]);
    const fullTextFiles = browseAssets(fixture, '/style.css', '2026-11-13', new Map([[sample535.id, sample535]]), undefined, [validTopic]);
    const home = homepageSeo(readFileSync('index.html', 'utf8'), dataset);
    const homeDev = homepageSeo(readFileSync('index.html', 'utf8'), dataset, false);

    expect(home).toContain('<meta name="referrer" content="no-referrer">');
    expect(home.match(/name="referrer"/g)).toHaveLength(1);
    expect(home).toContain(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'">`);
    expect(homeDev).not.toContain('Content-Security-Policy');

    for (const page of [normalFiles['about/index.html'], normalFiles['topics/valid-topic/index.html'], normalFiles['statutes/535.300/index.html']]) {
      expect(page).toContain('<meta name="referrer" content="no-referrer">');
      expect(page).toContain(`style-src 'self';`);
      expect(page).not.toContain(`'unsafe-inline'`);
    }

    expect(fullTextFiles['statutes/535.300/index.html']).toContain(`style-src 'self' 'unsafe-inline';`);
    expect(fullTextFiles['statutes/535.300/index.html']).toContain(`script-src 'self';`);
    expect(fullTextFiles['chapters/535/index.html']).toContain(`style-src 'self';`);
    expect(fullTextFiles['chapters/535/index.html']).not.toContain(`'unsafe-inline'`);
  });

  it('runs navigationFor in linear time on pathological whitespace input', () => {
    const payload = ' '.repeat(20_000) + 'x';
    const start = performance.now();
    const plan = navigationFor([{ tag: 'p', attrs: {}, children: [payload] }]);
    const elapsed = performance.now() - start;
    expect(plan.subsections).toEqual([]);
    expect(elapsed).toBeLessThan(50);
  });
});
