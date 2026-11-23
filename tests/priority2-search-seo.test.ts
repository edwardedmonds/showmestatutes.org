import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import aliasData from '../data/aliases.json';
import { assertDataset, isEffective, type Dataset } from '../src/data';
import { statutePath } from '../src/paths';
import { createSearch, findMatchingChapters, normalize, singularize } from '../src/search';
import { browseAssets, escapeHtml } from '../src/seo';

const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
assertDataset(dataset);
const search = createSearch(dataset.records);
const asOf = '2026-11-23';

const sectionsIn = (matches: { record: { section: string } }[]) => matches.map(m => m.record.section);

describe('Priority 2 high-demand everyday Missouri queries', () => {
  const everydayQueries: { query: string; inBest?: string[]; inBestOrRelated: string[] }[] = [
    { query: 'divorce', inBest: ['452.305'], inBestOrRelated: ['452.305', '452.310', '452.330'] },
    { query: 'alimony', inBest: ['452.335'], inBestOrRelated: ['452.335', '452.370'] },
    { query: 'child custody', inBest: ['452.375'], inBestOrRelated: ['452.375', '565.150', '565.153'] },
    { query: 'elder abuse', inBest: ['192.2425', '565.188'], inBestOrRelated: ['192.2405', '192.2425', '565.188', '570.145'] },
    { query: 'restraining order', inBest: ['455.020'], inBestOrRelated: ['455.020', '455.035', '455.050'] },
    { query: 'eviction', inBest: ['534.030'], inBestOrRelated: ['534.030', '535.010', '441.060', '441.233'] },
    { query: 'security deposit', inBest: ['535.300'], inBestOrRelated: ['535.300'] },
    { query: 'adverse possession', inBest: ['516.010'], inBestOrRelated: ['516.010', '524.010'] },
    { query: 'dui', inBest: ['577.010'], inBestOrRelated: ['577.010', '577.012'] },
    { query: 'dwi', inBest: ['577.010'], inBestOrRelated: ['577.010', '577.012'] },
    { query: 'texting while driving', inBest: ['304.822'], inBestOrRelated: ['304.822'] },
    { query: 'window tint', inBest: ['307.173'], inBestOrRelated: ['307.173'] },
    { query: 'hit and run', inBest: ['577.060'], inBestOrRelated: ['577.060'] },
    { query: 'lemon law', inBest: ['407.563'], inBestOrRelated: ['407.560', '407.563', '407.567'] },
    { query: 'castle doctrine', inBest: ['563.031'], inBestOrRelated: ['563.031', '563.074'] },
    { query: 'stand your ground', inBest: ['563.031'], inBestOrRelated: ['563.031', '563.074'] },
    { query: 'shoplifting', inBest: ['570.030'], inBestOrRelated: ['570.030', '537.125'] },
    { query: 'expungement', inBest: ['610.140'], inBestOrRelated: ['610.140', '610.122'] },
    { query: 'concealed carry', inBest: ['571.101'], inBestOrRelated: ['571.030', '571.101', '571.107'] },
    { query: 'sunshine law', inBest: ['610.011'], inBestOrRelated: ['610.010', '610.011', '610.021', '610.023'] },
    { query: 'foia', inBest: ['610.011'], inBestOrRelated: ['610.011', '610.021', '610.023'] },
    { query: 'small claims', inBest: ['482.300'], inBestOrRelated: ['482.300', '482.305', '482.340'] },
    { query: 'statute of limitations', inBestOrRelated: ['516.110', '516.120', '516.140', '556.036'] },
    { query: 'wage garnishment', inBest: ['525.030'], inBestOrRelated: ['525.030', '525.010', '513.430'] },
    { query: 'minimum wage', inBest: ['290.502'], inBestOrRelated: ['290.502', '290.505', '290.512'] },
    { query: 'workers compensation', inBest: ['287.120'], inBestOrRelated: ['287.120', '287.140', '287.780'] },
    { query: 'wiretapping', inBest: ['542.402'], inBestOrRelated: ['542.400', '542.402'] },
    { query: 'do not call', inBest: ['407.1098'], inBestOrRelated: ['407.1098', '407.1101', '407.1107'] },
    { query: 'probate', inBestOrRelated: ['473.017', '473.050', '473.097', '473.360'] },
  ];

  for (const { query, inBest, inBestOrRelated } of everydayQueries) {
    it(`surfaces verified statutes for "${query}"`, () => {
      const result = search(query, asOf);
      const bestSections = sectionsIn(result.best);
      const combined = [...bestSections, ...sectionsIn(result.related)];
      if (inBest) {
        for (const section of inBest) {
          expect(bestSections).toContain(section);
        }
      }
      for (const section of inBestOrRelated) {
        expect(combined).toContain(section);
      }
    });
  }

  it('returns Ch. 452 family law in best AND Ch. 565 criminal interference in related for "child custody"', () => {
    const result = search('child custody', asOf);
    const bestChapters = new Set(result.best.map(m => m.record.chapter));
    const relatedSections = sectionsIn(result.related);
    expect(bestChapters.has('452')).toBe(true);
    expect(sectionsIn(result.best)).toContain('452.375');
    expect(relatedSections).toContain('565.150');
    expect(relatedSections).toContain('565.153');
    expect(result.related.some(m => m.record.chapter === '565' && m.reason === 'Broader topic match')).toBe(true);
  });

  it('returns both 192.2425 and 565.188 in best for "elder abuse"', () => {
    const result = search('elder abuse', asOf);
    const bestSections = sectionsIn(result.best);
    expect(bestSections).toContain('192.2425');
    expect(bestSections).toContain('565.188');
  });
});

describe('Singular/plural normalization and protected legal plurals', () => {
  it('matches singular headings from regular plural queries ("pets", "landlords", "deposits")', () => {
    expect(singularize('pets')).toBe('pet');
    expect(singularize('landlords')).toBe('landlord');
    expect(singularize('deposits')).toBe('deposit');

    const pets = search('pets', asOf);
    expect(pets.correction).toBeNull();
    expect(pets.best.some(m => /\bpet\b/i.test(m.record.title))).toBe(true);

    const landlords = search('landlords', asOf);
    expect(landlords.correction).toBeNull();
    expect(landlords.best.some(m => /\blandlord\b/i.test(m.record.title))).toBe(true);

    const deposits = search('deposits', asOf);
    expect(deposits.correction).toBeNull();
    expect(deposits.best.some(m => /\bdeposit\b/i.test(m.record.title))).toBe(true);
  });

  it('does not collapse protected legal plurals into their singular forms', () => {
    const pairs: [string, string][] = [
      ['damages', 'damage'],
      ['arms', 'arm'],
      ['goods', 'good'],
      ['means', 'mean'],
    ];
    for (const [plural, singular] of pairs) {
      expect(singularize(plural)).toBe(plural);
      expect(singularize(singular)).toBe(singular);
      expect(singularize(plural)).not.toBe(singularize(singular));
    }

    // Verify search index keeps protected plurals distinct from singular-only headings
    // (prefix matching allows words starting with the plural, e.g. "arms*", never singular "arm").
    for (const plural of ['damages', 'arms', 'goods', 'means']) {
      const pattern = new RegExp(`\\b${plural}`, 'i');
      const res = search(plural, asOf);
      expect(res.best.length).toBeGreaterThan(0);
      expect(
        res.best.every(
          m => pattern.test(m.record.title)
            || (aliasData.sections[m.record.section as keyof typeof aliasData.sections] ?? []).some(a => pattern.test(a)),
        ),
      ).toBe(true);
    }

    // Also verify directly on synthetic singular vs plural records that they do not collapse into each other.
    const template = dataset.records.find(r => isEffective(r, asOf))!;
    const syntheticSearch = createSearch(
      pairs.flatMap(([plural, singular], idx) => [
        { ...template, id: `syn-${idx}-s`, section: `990.${idx}01`, title: `Statute about ${singular} only` },
        { ...template, id: `syn-${idx}-p`, section: `990.${idx}02`, title: `Statute about ${plural} only` },
      ]),
    );
    for (const [idx, [plural, singular]] of pairs.entries()) {
      const pluralRes = sectionsIn(syntheticSearch(plural, asOf).best);
      expect(pluralRes).toContain(`990.${idx}02`);
      expect(pluralRes).not.toContain(`990.${idx}01`);
      // Singular query can prefix-match plural (e.g. "damage" is prefix of "damages"),
      // but exact-word-form preference must rank the singular record first.
      const singularRes = sectionsIn(syntheticSearch(singular, asOf).best);
      expect(singularRes[0]).toBe(`990.${idx}01`);
    }
  });
});

describe('findMatchingChapters', () => {
  it('matches chapter titles such as "elections" -> Ch. 115', () => {
    const matches = findMatchingChapters(dataset.manifest.chapters, 'elections');
    expect(matches.some(c => c.chapter === '115')).toBe(true);
    expect(matches.every(c => c.sectionCount > 0)).toBe(true);
  });

  it('ignores exact section queries like "535.300"', () => {
    expect(findMatchingChapters(dataset.manifest.chapters, '535.300')).toEqual([]);
    expect(findMatchingChapters(dataset.manifest.chapters, 'RSMo 535.300')).toEqual([]);
    expect(findMatchingChapters(dataset.manifest.chapters, '§ 535.300')).toEqual([]);
  });

  it('ignores empty chapters even when their title matches', () => {
    const emptyChapter = dataset.manifest.chapters.find(c => c.sectionCount === 0);
    expect(emptyChapter).toBeDefined();
    const synthetic = [
      ...dataset.manifest.chapters,
      { ...emptyChapter!, chapter: '9999', title: 'Elections', sectionCount: 0, recordCount: 0 },
    ];
    const matches = findMatchingChapters(synthetic, 'elections', 20);
    expect(matches.every(c => c.sectionCount > 0)).toBe(true);
    expect(matches.some(c => c.chapter === '9999')).toBe(false);
  });

  it('respects the limit parameter', () => {
    expect(findMatchingChapters(dataset.manifest.chapters, 'tax', 2).length).toBeLessThanOrEqual(2);
    expect(findMatchingChapters(dataset.manifest.chapters, 'tax', 1)).toHaveLength(1);
    expect(findMatchingChapters(dataset.manifest.chapters, 'tax').length).toBeLessThanOrEqual(4);
  });
});

describe('data/aliases.json integrity and topic hub rendering', () => {
  const bySection = new Map<string, Dataset['records']>();
  for (const record of dataset.records) {
    const list = bySection.get(record.section);
    if (list) list.push(record);
    else bySection.set(record.section, [record]);
  }

  const expectEffectiveSection = (section: string, source: string) => {
    const records = bySection.get(section);
    expect(records, `${source}: section ${section} missing from public/data/statutes.json`).toBeDefined();
    expect(
      records!.some(r => isEffective(r, asOf)),
      `${source}: section ${section} has no effective version as of ${asOf}`,
    ).toBe(true);
  };

  it('ensures every section in sections, topics, related, and topicPages exists and has an effective version', () => {
    for (const section of Object.keys(aliasData.sections)) {
      expectEffectiveSection(section, 'aliases.sections');
    }
    for (const [topic, sections] of Object.entries(aliasData.topics)) {
      for (const section of sections) {
        expectEffectiveSection(section, `aliases.topics["${topic}"]`);
      }
    }
    for (const [section, relatedSections] of Object.entries(aliasData.related)) {
      expectEffectiveSection(section, 'aliases.related key');
      for (const rel of relatedSections) {
        expectEffectiveSection(rel, `aliases.related["${section}"]`);
      }
    }
    for (const page of aliasData.topicPages) {
      for (const section of page.sections) {
        expectEffectiveSection(section, `aliases.topicPages["${page.slug}"]`);
      }
    }
  });

  it('ensures every topics key equals normalize(key)', () => {
    for (const key of Object.keys(aliasData.topics)) {
      expect(normalize(key), `topics key "${key}" is not normalized`).toBe(key);
    }
  });

  it('ensures all 27 topicPages have unique slugs, titles, and descriptions and render valid /topics/{slug}/ pages', () => {
    expect(aliasData.topicPages).toHaveLength(27);
    const slugs = new Set<string>();
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const page of aliasData.topicPages) {
      expect(page.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(slugs.has(page.slug), `duplicate slug: ${page.slug}`).toBe(false);
      expect(titles.has(page.title), `duplicate title: ${page.title}`).toBe(false);
      expect(descriptions.has(page.description), `duplicate description: ${page.description}`).toBe(false);
      slugs.add(page.slug);
      titles.add(page.title);
      descriptions.add(page.description);
    }

    const files = browseAssets(dataset, '/assets/browse-test.css', asOf);
    expect(files['topics/index.html']).toBeDefined();
    for (const page of aliasData.topicPages) {
      const html = files[`topics/${page.slug}/index.html`];
      expect(html, `missing rendered page for /topics/${page.slug}/`).toBeDefined();
      expect(html).toContain(`<title>${escapeHtml(page.title)} | Show Me Statutes</title>`);
      expect(html).toContain(`<meta name="description" content="${escapeHtml(page.description)}">`);
      expect(html).toContain(`<link rel="canonical" href="https://showmestatutes.org/topics/${page.slug}/">`);
      expect(html).not.toContain('<script src=');
      for (const section of page.sections) {
        expect(html).toContain(`href="${statutePath(section)}"`);
      }
    }
  });
});
