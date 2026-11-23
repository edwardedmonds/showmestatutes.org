import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import aliasData from '../data/aliases.json';
import { type Dataset, constitutionalNotice, sourceDateNotice, standaloneReprintNotice, enactmentNotice } from '../src/data';
import { statutePath, statuteVersionPath } from '../src/paths';
import { browseAssets, escapeHtml, homepageSeo, SITEMAP_STATUTE_CHUNK_SIZE, siteUrl } from '../src/seo';

const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
const files = browseAssets(dataset, '/assets/browse-test.css', '2026-11-13');
const chapters = dataset.manifest.chapters.filter(c => c.sectionCount);
const html = homepageSeo(readFileSync('index.html', 'utf8'), dataset);
const jsonLd = (source: string) => [...source.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));

describe('Static chapter discovery and metadata', () => {
  it('creates one browse page per populated chapter and lists empty official indexes separately', () => {
    expect(Object.keys(files).filter(p => p.startsWith('chapters/') && p.endsWith('/index.html'))).toHaveLength(chapters.length + 1);
    for (const c of dataset.manifest.chapters) {
      if (c.sectionCount) expect(files['chapters/index.html']).toContain(`href="/chapters/${c.chapter}/"`);
      else {
        expect(files[`chapters/${c.chapter}/index.html`]).toBeUndefined();
        expect(files['chapters/index.html']).toContain(escapeHtml(c.sourceIndex));
      }
    }
  });
  it('preserves every exact source identity and official heading in static HTML', () => {
    for (const record of dataset.records) {
      const page = files[`chapters/${record.chapter}/index.html`];
      expect(page).toContain(`id="version-${record.id}"`);
      expect(page).toContain(escapeHtml(record.title));
      expect(page).toContain(`href="${escapeHtml(record.sourceUrl)}"`);
    }
  });
  it('retains constitutional, reprint, date and enactment notices rather than stripping them for SEO', () => {
    for (const record of dataset.records) {
      for (const notice of [constitutionalNotice(record), sourceDateNotice(record), standaloneReprintNotice(record), enactmentNotice(record)]) {
        if (notice) expect(files[`chapters/${record.chapter}/index.html`]).toContain(escapeHtml(notice));
      }
    }
    expect(files['chapters/565/index.html']).toContain('Upcoming · effective Jul 1, 2027');
    expect(files['chapters/300/index.html']).toContain('does not establish which provisions a locality has adopted');
  });
  it('emits a sitemap index with chunked child sitemaps containing only canonical, existing public HTML pages', () => {
    const indexXml = files['sitemap.xml'];
    expect(indexXml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(indexXml).not.toContain('<urlset');
    expect(indexXml).not.toContain('<lastmod>');

    const childLocs = [...indexXml.matchAll(/<sitemap><loc>(.*?)<\/loc><\/sitemap>/g)].map(m => m[1]);
    const expectedStatuteChunks = Math.ceil(dataset.manifest.sectionCount / SITEMAP_STATUTE_CHUNK_SIZE);
    const expectedChildren = [
      'sitemap-core.xml',
      'sitemap-chapters.xml',
      ...Array.from({ length: expectedStatuteChunks }, (_, i) => `sitemap-statutes-${i + 1}.xml`),
    ];
    expect(childLocs).toEqual(expectedChildren.map(name => `${siteUrl}/${name}`));
    expect(Object.keys(files).filter(k => /^sitemap-.*\.xml$/.test(k)).sort()).toEqual([...expectedChildren].sort());

    const extractUrls = (xml: string) => [...xml.matchAll(/<url><loc>(.*?)<\/loc><\/url>/g)].map(m => m[1]);
    const allUrls: string[] = [];
    for (const name of expectedChildren) {
      const xml = files[name];
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).not.toContain('<lastmod>');
      const childUrls = extractUrls(xml);
      expect(childUrls.length).toBeLessThanOrEqual(SITEMAP_STATUTE_CHUNK_SIZE);
      allUrls.push(...childUrls);
    }

    expect(extractUrls(files['sitemap-core.xml'])).toHaveLength(4 + aliasData.topicPages.length);
    expect(extractUrls(files['sitemap-chapters.xml'])).toHaveLength(chapters.length);
    const statuteUrls = expectedChildren.slice(2).flatMap(name => extractUrls(files[name]));
    expect(statuteUrls).toHaveLength(dataset.manifest.sectionCount);

    expect(allUrls).toHaveLength(chapters.length + 3 + dataset.manifest.sectionCount + 1 + aliasData.topicPages.length);
    expect(new Set(allUrls).size).toBe(allUrls.length);
    for (const url of allUrls) {
      expect(url.startsWith(siteUrl + '/')).toBe(true);
      if (url !== siteUrl + '/') expect(files[url.slice(siteUrl.length + 1) + 'index.html']).toBeDefined();
    }
    expect(files['robots.txt']).toContain('Sitemap: https://showmestatutes.org/sitemap.xml');
    expect(files['robots.txt']).not.toContain('Disallow');
  });
  it('gives each browse page unique titles, descriptions, canonicals and valid breadcrumbs without requiring JavaScript', () => {
    const titles = new Set<string>();
    for (const [path, page] of Object.entries(files).filter(([p]) => p.endsWith('.html'))) {
      const canonical = siteUrl + '/' + path.replace(/index.html$/, '');
      expect(page).toContain(`<link rel="canonical" href="${canonical}">`);
      expect(page).toContain(`<meta property="og:url" content="${canonical}">`);
      expect(page.match(/<h1>/g)).toHaveLength(1);
      expect(page).not.toContain('<script src=');
      const title = page.match(/<title>(.*?)<\/title>/)![1];
      expect(titles.has(title)).toBe(false); titles.add(title);
      const schema = jsonLd(page)[0];
      expect(schema['@graph'][0].url).toBe(canonical);
      expect(schema['@graph'][1].itemListElement.at(-1).item).toBe(canonical);
    }
  });
  it('links the homepage to the static directory and provides one consistent homepage identity', () => {
    expect(html).toContain('href="/chapters/"');
    expect(html).toContain('href="/topics/"');
    expect(html).toContain('<title>Missouri Statute Search | Show Me Statutes</title>');
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(jsonLd(html)[0]).toMatchObject({ '@type': 'WebSite', name: 'Show Me Statutes', url: siteUrl + '/' });
    expect(html).toContain('30,346 distinct sections');
  });
  it('creates one page per exact section and preserves every version, source link and warning', () => {
    expect(Object.keys(files).filter(p => p.startsWith('statutes/'))).toHaveLength(dataset.manifest.sectionCount);
    for (const record of dataset.records) {
      const path = statutePath(record.section);
      const statute = files[path.slice(1) + 'index.html'];
      expect(statute).toContain(`id="version-${record.id}"`);
      expect(statute).toContain(escapeHtml(record.title));
      expect(statute).toContain(`href="${escapeHtml(record.sourceUrl)}"`);
      expect(files[`chapters/${record.chapter}/index.html`]).toContain(escapeHtml(statuteVersionPath(record.section, record.id)));
      for (const notice of [constitutionalNotice(record), sourceDateNotice(record), standaloneReprintNotice(record), enactmentNotice(record)]) {
        if (notice) expect(statute).toContain(escapeHtml(notice));
      }
    }
    expect(files['statutes/565.050/index.html']).toContain('Upcoming · effective Jul 1, 2027');
    expect(files['statutes/300.010/index.html']).toContain('does not establish which provisions a locality has adopted');
    expect(files['statutes/456.4-411A/index.html']).toBeDefined();
    expect(files['statutes/456.4-411B/index.html']).toBeDefined();
    expect(jsonLd(files['statutes/1.010/index.html'])[0]['@graph'][0]['@type']).toBe('WebPage');
  });
  it('escapes source headings and attributes as text', () => {
    expect(escapeHtml('<script>"x" & \'y\'</script>')).toBe('&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
  });
  it('uses primary effective headings in multi-version statute titles and renders common-name aliases and related links', () => {
    const multi = files['statutes/565.050/index.html'];
    expect(multi).toMatch(/<title>Missouri § 565\.050: .* \(2 versions\) \| Show Me Statutes<\/title>/);
    expect(multi).not.toContain('Headings and source versions');

    const dwi = files['statutes/577.010/index.html'];
    expect(dwi).toContain('Commonly searched as:');
    expect(dwi).toContain('dwi, dui, drunk driving');
    expect(dwi).toContain('plain-English search terms, not official legal names');
    expect(dwi).toContain('Related Missouri statutes');
    expect(dwi).toContain('href="/statutes/577.012/"');
    const dwiSchema = jsonLd(dwi)[0]['@graph'][0];
    expect(dwiSchema.alternateName).toEqual(aliasData.sections['577.010']);
    expect(dwi).toMatch(/<meta name="description" content="Missouri statute 577\.010 \(dwi, dui, drunk driving\)/);
  });
  it('generates static topic directory and all curated topic hub pages with zero JS and valid metadata', () => {
    const topicsIndex = files['topics/index.html'];
    expect(topicsIndex).toBeDefined();
    expect(topicsIndex).toContain('<title>Missouri Statutes by Topic | Show Me Statutes</title>');
    expect(topicsIndex).not.toContain('<script src=');
    for (const topic of aliasData.topicPages) {
      expect(topicsIndex).toContain(`href="/topics/${topic.slug}/"`);
      const hub = files[`topics/${topic.slug}/index.html`];
      expect(hub).toBeDefined();
      expect(hub).toContain(`<title>${escapeHtml(topic.title)} | Show Me Statutes</title>`);
      expect(hub).toContain(`<meta name="description" content="${escapeHtml(topic.description)}">`);
      expect(hub).toContain('not legal advice or an exhaustive list');
      const expectedQuery = ('searchQuery' in topic && typeof topic.searchQuery === 'string') ? topic.searchQuery : topic.queries[0];
      expect(hub).toContain(`href="/?q=${encodeURIComponent(expectedQuery)}"`);
      expect(hub).not.toContain('<script src=');
      const schema = jsonLd(hub)[0];
      expect(schema['@graph'][0]['@type']).toBe('CollectionPage');
      expect(schema['@graph'][1]['@type']).toBe('BreadcrumbList');
      expect(schema['@graph'][1].itemListElement.map((i: { name: string }) => i.name)).toEqual(['Home', 'Topics', topic.title]);
      for (const sec of topic.sections) {
        expect(hub).toContain(`href="${statutePath(sec)}"`);
      }
    }
  });
});
