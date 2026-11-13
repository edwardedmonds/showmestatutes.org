import { constitutionalNotice, effectiveDateLabel, enactmentNotice, isUpcoming, sourceDateNotice, standaloneReprintNotice, type Dataset, type Statute } from './data';

export const siteUrl = 'https://showmestatutes.org';
export const siteTitle = 'Missouri Statute Search | Show Me Statutes';
export const siteDescription = 'Search Missouri statute headings by topic, common name, or section number. Browse chapters and read the official law on the Missouri Revisor’s website.';
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
const date = (value: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));

export function metadata(title: string, description: string, path: string) {
  const url = siteUrl + path;
  return `<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Show Me Statutes">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${siteUrl}/social-card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Show Me Statutes — Missouri statute search. Know the topic? Find the section.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${siteUrl}/social-card.png">
<meta name="twitter:image:alt" content="Show Me Statutes — Missouri statute search. Know the topic? Find the section.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">`;
}

export const websiteSchema = {
  '@context': 'https://schema.org', '@type': 'WebSite', '@id': siteUrl + '/#website',
  name: 'Show Me Statutes', url: siteUrl + '/', description: siteDescription, inLanguage: 'en-US',
};

export function homepageSeo(html: string, dataset: Dataset) {
  return html.replace(/<title>.*?<\/title>/, `<title>${siteTitle}</title>`)
    .replace(/\s*<meta name="description"[^>]*>/, '')
    .replace(/\s*<link rel="canonical"[^>]*>/, '')
    .replace('</head>', `${metadata(siteTitle, siteDescription, '/')}
<script type="application/ld+json">${json(websiteSchema)}</script>\n</head>`)
    .replace('<p id="coverage-stats"></p>', `<p id="coverage-stats">${dataset.manifest.sectionCount.toLocaleString('en-US')} distinct sections · ${dataset.manifest.recordCount.toLocaleString('en-US')} source versions · ${dataset.manifest.chapters.filter(c => c.sectionCount).length} chapters with headings</p>`);
}

function page(title: string, description: string, path: string, content: string, stylesheet: string, breadcrumb: { name: string; path: string }[]) {
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', '@id': siteUrl + path, name: title, description, url: siteUrl + path, inLanguage: 'en-US', isPartOf: { '@id': siteUrl + '/#website' } },
    { '@type': 'BreadcrumbList', itemListElement: breadcrumb.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: siteUrl + item.path })) },
  ] };
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title>
${metadata(title, description, path)}
<link rel="stylesheet" href="${stylesheet}">
<script type="application/ld+json">${json(schema)}</script></head><body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><a class="brand" href="/" aria-label="Show Me Statutes home"><span class="brand-mark" aria-hidden="true">§</span> Show Me Statutes</a><nav class="site-nav" aria-label="Main navigation"><a href="/#search">Search</a><a href="/chapters/">Browse chapters</a><a href="/#coverage">Coverage &amp; sources</a></nav></header>
<main id="main" class="browse-main"><nav class="breadcrumbs" aria-label="Breadcrumb">${breadcrumb.map((item, index) => index === breadcrumb.length - 1 ? `<span aria-current="page">${escapeHtml(item.name)}</span>` : `<a href="${item.path}">${escapeHtml(item.name)}</a> <span aria-hidden="true">/</span>`).join(' ')}</nav>${content}</main>
<footer><span>SHOW ME STATUTES</span><p>Independent search. Links to official sources.<br>Not affiliated with the State of Missouri. Not legal advice.</p><a href="/licenses.txt">MIT &amp; license notices</a><a href="https://github.com/edwardedmonds/showmestatutes.org">Project on GitHub ↗</a></footer></body></html>`;
}

function recordHtml(record: Statute, asOf: string) {
  const notices = [sourceDateNotice(record), constitutionalNotice(record), standaloneReprintNotice(record), enactmentNotice(record)];
  if (record.headingSource === 'chapter-index') notices.push('Heading supplied by the official chapter index; this version’s source page omits its heading.');
  if (record.headingMarker) notices.push('The official source marks this section with a footnote. Read the source notes.');
  return `<li class="result-card" id="version-${escapeHtml(record.id)}"><div class="card-meta"><span class="section-number">§ ${escapeHtml(record.section)}${record.headingMarker ? ' *' : ''}</span><span>Source version ${record.versionId}</span></div>
<h2 class="browse-heading"><a href="${escapeHtml(record.sourceUrl)}">${escapeHtml(record.title)}</a></h2>
<p class="version">${escapeHtml(effectiveDateLabel(record, asOf, isUpcoming(record, asOf)))}</p>
${notices.filter(Boolean).map(notice => `<p class="version">${escapeHtml(notice!)}</p>`).join('\n')}
<p class="version">Source checked ${date(record.sourceCheckedAt)}</p>
<a class="official-link" href="${escapeHtml(record.sourceUrl)}">Read this version at the Revisor ↗</a></li>`;
}

export function browseAssets(dataset: Dataset, stylesheet: string, asOf: string): Record<string, string> {
  const chapters = dataset.manifest.chapters.filter(c => c.sectionCount);
  const empty = dataset.manifest.chapters.filter(c => !c.sectionCount);
  const files: Record<string, string> = {};
  const rootBreadcrumb = [{ name: 'Home', path: '/' }, { name: 'Chapters', path: '/chapters/' }];
  const directory = `<h1>Browse Missouri statutes by chapter</h1>
<p class="intro">A directory of Missouri Revised Statutes (RSMo) section headings, organized by chapter. Choose a chapter to see its headings, version dates and links to the official Missouri Revisor.</p>
<p>${dataset.manifest.sectionCount.toLocaleString('en-US')} distinct sections · ${chapters.length} chapters with headings · earliest chapter-index check ${date(dataset.manifest.indexCheckedAt)}.</p>
<p>These are headings and source references, not the full text of the law. <a href="/#search">Search by topic or section number</a>, or use your browser’s Find command to locate a chapter below.</p>
<ul class="browse-chapters">${chapters.map(c => `<li><a href="/chapters/${c.chapter}/"><span>Chapter ${c.chapter}</span> ${escapeHtml(c.title)}</a><small>${c.sectionCount.toLocaleString('en-US')} sections</small></li>`).join('\n')}</ul>
<h2>Chapter indexes with no listed sections</h2><p>These ${empty.length} additional indexes were checked and contain no section headings in this snapshot.</p><ul>${empty.map(c => `<li><a href="${escapeHtml(c.sourceIndex)}">Chapter ${c.chapter}: ${escapeHtml(c.title)} — official index</a></li>`).join('')}</ul>`;
  files['chapters/index.html'] = page('Missouri Statutes by Chapter | Show Me Statutes', 'Browse Missouri Revised Statutes by chapter. Find section headings, effective dates and exact source links in the statewide statute-heading directory.', '/chapters/', directory, stylesheet, rootBreadcrumb);
  const byChapter = new Map<string, Statute[]>();
  for (const record of dataset.records) {
    const rows = byChapter.get(record.chapter) ?? [];
    rows.push(record); byChapter.set(record.chapter, rows);
  }
  for (const [index, chapter] of chapters.entries()) {
    const title = `Missouri Chapter ${chapter.chapter}: ${chapter.title} | Show Me Statutes`;
    const description = `Browse Missouri Chapter ${chapter.chapter}, ${chapter.title}. View ${chapter.sectionCount} section headings, source-version dates and links to the official Revisor.`;
    const path = `/chapters/${chapter.chapter}/`;
    const records = [...(byChapter.get(chapter.chapter) ?? [])].sort((a, b) => a.section.localeCompare(b.section, 'en', { numeric: true }) || a.effectiveFrom.localeCompare(b.effectiveFrom) || a.versionId.localeCompare(b.versionId, 'en', { numeric: true }));
    const content = `<p class="eyebrow">MISSOURI REVISED STATUTES</p><h1>Chapter ${chapter.chapter}<br><em>${escapeHtml(chapter.title)}</em></h1>
<p class="intro">${chapter.sectionCount.toLocaleString('en-US')} distinct sections · ${chapter.recordCount.toLocaleString('en-US')} source versions. Chapter index checked ${date(chapter.indexCheckedAt)}.</p>
<p>This page lists the headings and source versions in the reviewed collection. It does not reproduce the full statute text or determine legal applicability. Read the official text and notes, and check for changes after the source-check date.</p>
<p><a href="${escapeHtml(chapter.sourceIndex)}">View the official Chapter ${chapter.chapter} index ↗</a> · <a href="/#search">Search Missouri statute headings</a></p>
<p class="version">Version labels evaluated as of ${date(asOf)}. Upcoming, contingent and constitutionally flagged versions retain their source notices; dates do not mean the law was rechecked today.</p>
${chapter.chapter === '300' ? '<p class="stale-notice">Chapter 300 is Missouri’s Model Traffic Ordinance. Inclusion here does not establish which provisions a locality has adopted.</p>' : ''}
<ol class="result-list browse-records">${records.map(r => recordHtml(r, asOf)).join('\n')}</ol>
<nav class="chapter-navigation" aria-label="Adjacent chapters">${index ? `<a href="/chapters/${chapters[index - 1].chapter}/">← Chapter ${chapters[index - 1].chapter}</a>` : ''}<a href="/chapters/">All chapters</a>${index + 1 < chapters.length ? `<a href="/chapters/${chapters[index + 1].chapter}/">Chapter ${chapters[index + 1].chapter} →</a>` : ''}</nav>`;
    files[`chapters/${chapter.chapter}/index.html`] = page(title, description, path, content, stylesheet, [...rootBreadcrumb, { name: `Chapter ${chapter.chapter}`, path }]);
  }
  const urls = ['/', '/chapters/', ...chapters.map(c => `/chapters/${c.chapter}/`)];
  // No artificial lastmod dates: rebuilding is not a source-content update.
  files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${siteUrl}${path}</loc></url>`).join('\n')}</urlset>\n`;
  files['robots.txt'] = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  return files;
}
