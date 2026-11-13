import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { type Dataset, constitutionalNotice, sourceDateNotice, standaloneReprintNotice, enactmentNotice } from '../src/data';
import { browseAssets, escapeHtml, homepageSeo, siteUrl } from '../src/seo';

const dataset: Dataset = JSON.parse(readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8'));
const files = browseAssets(dataset, '/assets/browse-test.css', '2026-11-13');
const chapters = dataset.manifest.chapters.filter(c => c.sectionCount);
const html = homepageSeo(readFileSync('index.html', 'utf8'), dataset);
const jsonLd = (source: string) => [...source.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));

describe('Static chapter discovery and metadata', () => {
  it('creates one browse page per populated chapter and lists empty official indexes separately', () => {
    expect(Object.keys(files).filter(p => p.endsWith('/index.html'))).toHaveLength(chapters.length + 1);
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
  it('includes only canonical, existing public HTML pages in the sitemap', () => {
    const urls = [...files['sitemap.xml'].matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
    expect(urls).toHaveLength(chapters.length + 2);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url.startsWith(siteUrl + '/')).toBe(true);
      if (url !== siteUrl + '/') expect(files[url.slice(siteUrl.length + 1) + 'index.html']).toBeDefined();
    }
    expect(files['sitemap.xml']).not.toContain('<lastmod>');
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
    expect(html).toContain('<title>Missouri Statute Search | Show Me Statutes</title>');
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(jsonLd(html)[0]).toMatchObject({ '@type': 'WebSite', name: 'Show Me Statutes', url: siteUrl + '/' });
    expect(html).toContain('30,346 distinct sections');
  });
  it('escapes source headings and attributes as text', () => {
    expect(escapeHtml('<script>"x" & \'y\'</script>')).toBe('&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
  });
});
