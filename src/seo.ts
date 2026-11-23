import aliasData from '../data/aliases.json';
import { constitutionalNotice, effectiveDateLabel, enactmentNotice, isEffective, isUpcoming, sourceDateNotice, standaloneReprintNotice, type Dataset, type Statute } from './data';
import { renderFullText, type FullText } from './full-text';
import { headingsFor, type HeadingRegistry } from './subsection-headings';
import { statutePath, statuteVersionPath } from './paths';

interface TopicPage {
  slug: string;
  title: string;
  description: string;
  intro: string;
  searchQuery?: string;
  queries: string[];
  sections: string[];
}

const sectionAliasesMap = aliasData.sections as Record<string, string[]>;
const relatedSectionsMap = aliasData.related as Record<string, string[]>;
const topicPages = aliasData.topicPages as TopicPage[];

export const siteUrl = 'https://showmestatutes.org';
export const siteTitle = 'Missouri Statute Search | Show Me Statutes';
export const siteDescription = 'Search Missouri statute headings by topic, common name, or section number. Browse chapters and read the official law on the Missouri Revisor’s website.';
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const date = (value: string) => dateFormatter.format(new Date(value));

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

function page(title: string, description: string, path: string, content: string, stylesheet: string, breadcrumb: { name: string; path: string }[], pageType = 'CollectionPage', alternateName?: string[]) {
  const pageNode: Record<string, unknown> = {
    '@type': pageType, '@id': siteUrl + path, name: title, description, url: siteUrl + path, inLanguage: 'en-US', isPartOf: { '@id': siteUrl + '/#website' },
  };
  if (alternateName?.length) pageNode.alternateName = alternateName;
  const schema = { '@context': 'https://schema.org', '@graph': [
    pageNode,
    { '@type': 'BreadcrumbList', itemListElement: breadcrumb.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: siteUrl + item.path })) },
  ] };
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title>
${metadata(title, description, path)}
<link rel="stylesheet" href="${stylesheet}">
<script type="application/ld+json">${json(schema)}</script></head><body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><a class="brand" href="/" aria-label="Show Me Statutes home"><span class="brand-mark" aria-hidden="true">§</span> Show Me Statutes</a><nav class="site-nav" aria-label="Main navigation"><a href="/#search">Search</a><a href="/topics/">Browse topics</a><a href="/chapters/">Browse chapters</a><a href="/#coverage">Coverage &amp; sources</a><a href="/about/">About &amp; accuracy</a></nav></header>
<main id="main" class="browse-main"><nav class="breadcrumbs" aria-label="Breadcrumb">${breadcrumb.map((item, index) => index === breadcrumb.length - 1 ? `<span aria-current="page">${escapeHtml(item.name)}</span>` : `<a href="${item.path}">${escapeHtml(item.name)}</a> <span aria-hidden="true">/</span>`).join(' ')}</nav>${content}</main>
<footer><span>SHOW ME STATUTES</span><p>Independent search. Links to official sources.<br>Not affiliated with the State of Missouri. Not legal advice.</p><a href="/about/">About &amp; accuracy</a><a href="/about/#report-an-error">Report an error</a><a href="/licenses.txt">MIT &amp; license notices</a><a href="https://github.com/edwardedmonds/showmestatutes.org">Project on GitHub ↗</a></footer></body></html>`;
}

function recordNotices(record: Statute): string[] {
  const notices = [sourceDateNotice(record), constitutionalNotice(record), standaloneReprintNotice(record), enactmentNotice(record)].filter((n): n is string => Boolean(n));
  if (record.headingSource === 'chapter-index') notices.push('Heading supplied by the official chapter index; this version’s source page omits its heading.');
  if (record.headingMarker) notices.push('The official source marks this section with a footnote. Read the source notes.');
  return notices;
}

function recordHtml(record: Statute, asOf: string, onStatutePage = false, fullText?: FullText, headingRegistry?: HeadingRegistry) {
  const notices = recordNotices(record);
  return `<li class="result-card${fullText ? ' reading-version' : ''}" id="version-${escapeHtml(record.id)}"><div class="card-meta"><span class="section-number">§ ${escapeHtml(record.section)}${record.headingMarker ? ' *' : ''}</span><span>Source version ${record.versionId}</span></div>
<h2 class="browse-heading"><a href="${escapeHtml(onStatutePage ? record.sourceUrl : statuteVersionPath(record.section, record.id))}">${escapeHtml(record.title)}</a></h2>
<p class="version">${escapeHtml(effectiveDateLabel(record, asOf, isUpcoming(record, asOf)))}</p>
${notices.map(notice => `<p class="version">${escapeHtml(notice)}</p>`).join('\n')}
<p class="version">Source checked ${date(record.sourceCheckedAt)}</p>
<a class="official-link" href="${escapeHtml(record.sourceUrl)}">Read this version at the Revisor ↗</a>${fullText ? `<button type="button" class="copy-citation" data-copy-citation="${escapeHtml(`§ ${record.section}, RSMo. Source version ${record.versionId}. ${effectiveDateLabel(record, asOf, isUpcoming(record, asOf))}. ${notices.join(' ')} ${record.sourceUrl}`)}" hidden>Copy citation</button>${renderFullText(fullText, headingRegistry ? headingsFor(fullText, headingRegistry) : undefined)}` : ''}</li>`;
}

function topicSectionHtml(record: Statute, versionCount: number, asOf: string) {
  const notices = recordNotices(record);
  return `<li class="result-card"><div class="card-meta"><span class="section-number">§ ${escapeHtml(record.section)}${record.headingMarker ? ' *' : ''}</span><a class="chapter-badge" href="/chapters/${escapeHtml(record.chapter)}/">Chapter ${escapeHtml(record.chapter)} · ${escapeHtml(record.chapterTitle)}</a>${versionCount > 1 ? `<span>${versionCount} versions</span>` : ''}</div>
<h2 class="browse-heading"><a href="${statutePath(record.section)}">${escapeHtml(record.title)}</a></h2>
<p class="version">${escapeHtml(effectiveDateLabel(record, asOf, isUpcoming(record, asOf)))}</p>
${notices.map(notice => `<p class="version">${escapeHtml(notice)}</p>`).join('\n')}
<p class="version">Source checked ${date(record.sourceCheckedAt)}</p>
<a class="official-link" href="${escapeHtml(record.sourceUrl)}">Read this version at the Revisor ↗</a></li>`;
}

export function browseAssets(dataset: Dataset, stylesheet: string, asOf: string, fullText?: Map<string, FullText>, headingRegistry?: HeadingRegistry): Record<string, string> {
  const chapters = dataset.manifest.chapters.filter(c => c.sectionCount);
  const empty = dataset.manifest.chapters.filter(c => !c.sectionCount);
  const files: Record<string, string> = {};
  const about = `<article class="about-content">
<p class="eyebrow">ABOUT THE PROJECT</p>
<h1>Finding the law should be easier.</h1>
<p class="intro">Show Me Statutes is an independent tool built and maintained by Edward Edmonds to help people find Missouri statutes faster.</p>
<p>I built this because knowing what you’re looking for isn’t the same as knowing the section number. The goal is straightforward: search the words you have, find the relevant heading, and read the law at its official source.</p>
<nav class="about-contents" aria-label="On this page"><a href="#sources">Sources &amp; coverage</a><a href="#checks">How records are checked</a><a href="#dates">Dates &amp; updates</a><a href="#report-an-error">Report an error</a></nav>
<section id="sources" aria-labelledby="sources-title"><h2 id="sources-title">Where the information comes from</h2>
<p>The headings and source information come from the <a href="https://revisor.mo.gov/">Missouri Revisor of Statutes</a>. Search uses official headings and a small set of documented common names. ${fullText ? "This local preview reproduces archived statute text on section pages. Search still uses headings and common names only." : "It does not search or reproduce the full text of the law, and it does not generate legal summaries."}</p>
<p>The reviewed snapshot contains ${dataset.manifest.sectionCount.toLocaleString('en-US')} distinct sections and ${dataset.manifest.recordCount.toLocaleString('en-US')} source versions across ${dataset.manifest.chapters.length} chapter indexes. Of those, ${chapters.length} contain headings and ${empty.length} have no listed sections. <a href="/chapters/">Browse the chapter directory</a> or <a href="/#coverage">see the coverage and source dates</a>.</p>
<p>Coverage means the headings and versions listed in the checked statewide catalog. It does not mean a complete historical archive or every kind of Missouri law. Court rules, regulations, constitutional provisions, federal law and local ordinances are outside this collection. A missing result does not mean no relevant law exists.</p></section>
<section id="checks" aria-labelledby="checks-title"><h2 id="checks-title">How records are checked</h2>
<p>Collection starts with the official chapter indexes, then retrieves the listed source versions. Automated checks compare section numbers, version identities, headings and dates. Duplicate records, missing records, unexpected source formatting and unexplained date overlaps stop the update for investigation.</p>
<p>Source exceptions have explicit review rules. Those rules preserve the Revisor’s constitutional warnings, contingent dates, multiple enactments and reprint notices. Every result retains a link to its exact official source version. The site does not decide which version governs a particular situation.</p>
<p>Before a release can go live, the dataset must pass validation, the automated tests must pass, and the built pages and internal links must pass an audit. These checks help catch errors; they are not a legal review or a guarantee that the source has not changed.</p>
<p>The <a href="https://github.com/edwardedmonds/showmestatutes.org/blob/main/docs/source-policy.md">source policy</a>, <a href="https://github.com/edwardedmonds/showmestatutes.org/blob/main/docs/coverage.md">coverage notes</a> and <a href="https://github.com/edwardedmonds/showmestatutes.org">project code</a> are public.</p></section>
<section id="dates" aria-labelledby="dates-title"><h2 id="dates-title">What the dates mean</h2>
<dl class="about-dates"><dt>Source checked</dt><dd>When that particular source page was retrieved successfully. It is not a promise that nothing has changed since.</dd><dt>Chapter index checked</dt><dd>When the official list of sections and versions for that chapter was retrieved.</dd><dt>Effective date</dt><dd>The date associated with a source version, with source notes retained where dates need explanation. It is different from the date we checked the page.</dd><dt>Version labels evaluated as of</dt><dd>The date used to organize the snapshot’s version dates. Rebuilding a page or evaluating its dates does not retrieve the source again.</dd></dl>
<p>This site publishes a reviewed snapshot. Source updates are a separate collection and review process; the site does not continuously monitor the Revisor or automatically refresh the law when a page is opened. Reusing a previously collected source keeps its original check date.</p>
<p>Before relying on a result, open the official source and read the text, dates and notes. Show Me Statutes is not affiliated with or endorsed by the State of Missouri and does not provide legal advice.</p></section>
<section id="report-an-error" aria-labelledby="report-title"><h2 id="report-title">Found something that looks wrong?</h2>
<p>You can <a href="https://github.com/edwardedmonds/showmestatutes.org/issues/new?template=source-error.yml">report an error on GitHub</a> (a GitHub account is required). Include the section number or page link, the search words if relevant, what looks wrong, and the official Revisor link you used to check it. Include the version or date if the section has more than one.</p>
<p>Reports are public. Please keep them to the site and public source material; do not include personal case information or confidential proceedings.</p>
<p>A report is a starting point for checking the source. Corrections need to preserve the section’s identity, dates and notices and pass the same release checks. Changes are recorded in the <a href="https://github.com/edwardedmonds/showmestatutes.org/commits/main/">public project history</a>.</p></section>
<section aria-labelledby="independence-title"><h2 id="independence-title">An independent, open-source project</h2>
<p>The project’s code and documentation use the <a href="/licenses.txt">MIT License</a>. Official statute content keeps its source attribution. The project does not claim ownership of Missouri law.</p>
<p>Search runs in your browser. The site currently has no accounts, third-party analytics or advertising, and no third-party search service receives your query.</p></section>
<p class="about-return"><a href="/#search">Search Missouri statutes →</a></p>
</article>`;
  files['about/index.html'] = page('About & accuracy | Show Me Statutes', 'Who maintains Show Me Statutes, where Missouri statute headings come from, how records are checked, what source dates mean, and how to report an error.', '/about/', about, stylesheet, [{ name: 'Home', path: '/' }, { name: 'About & accuracy', path: '/about/' }], 'AboutPage');
  const rootBreadcrumb = [{ name: 'Home', path: '/' }, { name: 'Chapters', path: '/chapters/' }];
  const directory = `<h1>Browse Missouri statutes by chapter</h1>
<p class="intro">A directory of Missouri Revised Statutes (RSMo) section headings, organized by chapter. Choose a chapter to see its headings, version dates and links to the official Missouri Revisor.</p>
<p>${dataset.manifest.sectionCount.toLocaleString('en-US')} distinct sections · ${chapters.length} chapters with headings · earliest chapter-index check ${date(dataset.manifest.indexCheckedAt)}.</p>
<p>These are headings and source references, not the full text of the law. <a href="/#search">Search by topic or section number</a>, <a href="/topics/">browse curated topic guides</a>, or use your browser’s Find command to locate a chapter below.</p>
<ul class="browse-chapters">${chapters.map(c => `<li><a href="/chapters/${c.chapter}/"><span>Chapter ${c.chapter}</span> ${escapeHtml(c.title)}</a><small>${c.sectionCount.toLocaleString('en-US')} sections</small></li>`).join('\n')}</ul>
<h2>Chapter indexes with no listed sections</h2><p>These ${empty.length} additional indexes were checked and contain no section headings in this snapshot.</p><ul>${empty.map(c => `<li><a href="${escapeHtml(c.sourceIndex)}">Chapter ${c.chapter}: ${escapeHtml(c.title)} — official index</a></li>`).join('')}</ul>`;
  files['chapters/index.html'] = page('Missouri Statutes by Chapter | Show Me Statutes', 'Browse Missouri Revised Statutes by chapter. Find section headings, effective dates and exact source links in the statewide statute-heading directory.', '/chapters/', directory, stylesheet, rootBreadcrumb);
  const byChapter = new Map<string, Statute[]>();
  const bySection = new Map<string, Statute[]>();
  for (const record of dataset.records) {
    const rows = byChapter.get(record.chapter) ?? [];
    rows.push(record); byChapter.set(record.chapter, rows);
    const versions = bySection.get(record.section) ?? [];
    versions.push(record); bySection.set(record.section, versions);
  }
  const sortedSectionVersions = (versions: Statute[]) => [...versions].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.versionId.localeCompare(b.versionId, 'en', { numeric: true }));
  const primaryRecord = (versions: Statute[]) => versions.find(r => isEffective(r, asOf)) ?? versions[0];

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

  for (const [section, versions] of bySection) {
    const records = sortedSectionVersions(versions);
    const primary = primaryRecord(records);
    const chapter = chapters.find(c => c.chapter === records[0].chapter)!;
    const path = statutePath(section);
    const sectionAliases = sectionAliasesMap[section];
    const title = records.length === 1
      ? `Missouri § ${section}: ${primary.title} | Show Me Statutes`
      : `Missouri § ${section}: ${primary.title} (${records.length} versions) | Show Me Statutes`;
    const aliasPreview = sectionAliases?.slice(0, 3).join(', ');
    const description = aliasPreview
      ? `Missouri statute ${section} (${aliasPreview}), Chapter ${chapter.chapter}: ${chapter.title}. View official headings, version dates and links to the Missouri Revisor.`
      : `Missouri statute ${section}, Chapter ${chapter.chapter}: ${chapter.title}. View official headings, version dates and source notices, then read the law at the Missouri Revisor.`;
    const relatedSections = (relatedSectionsMap[section] ?? []).filter(rel => rel !== section && bySection.has(rel));
    const aliasHtml = sectionAliases?.length
      ? `<p class="alias-note"><strong>Commonly searched as:</strong> ${escapeHtml(sectionAliases.join(', '))} <span class="alias-disclaimer">(plain-English search terms, not official legal names)</span></p>`
      : '';
    const relatedHtml = relatedSections.length
      ? `<section class="related-statutes" aria-labelledby="related-heading"><h2 id="related-heading">Related Missouri statutes</h2><ul>${relatedSections.map(rel => {
          const relPrimary = primaryRecord(sortedSectionVersions(bySection.get(rel)!));
          return `<li><a href="${statutePath(rel)}"><strong>§ ${escapeHtml(rel)}</strong> — ${escapeHtml(relPrimary.title)}</a></li>`;
        }).join('\n')}</ul></section>`
      : '';
    const content = `<p class="eyebrow">MISSOURI REVISED STATUTES</p>
<h1>Section ${escapeHtml(section)}</h1>
<p class="intro"><a href="/chapters/${chapter.chapter}/">Chapter ${chapter.chapter} · ${escapeHtml(chapter.title)}</a></p>
${aliasHtml}
<p>${records.length} source version${records.length === 1 ? '' : 's'} in the reviewed collection. The official heading${records.length === 1 ? ' and source link are' : 's and source links are'} below.</p>
${fullText?.has(records[0].id) ? '<p class="statute-note">Local reading preview · Archived source text appears below. Source-check dates are preserved; open the Revisor to check for changes.</p>' : '<p class="statute-note">This page provides headings and source references, not the full text of the law. Open the official source to read the statute and its notes.</p>'}
${chapter.chapter === '300' ? '<p class="stale-notice">Chapter 300 is Missouri’s Model Traffic Ordinance. Inclusion here does not establish which provisions a locality has adopted.</p>' : ''}
${records.length > 1 ? `<nav class="version-navigation" aria-label="Source versions">${records.map(r => `<a href="#version-${escapeHtml(r.id)}">Source version ${escapeHtml(r.versionId)}</a>`).join('')}</nav>` : ''}
<ol class="result-list browse-records statute-versions">${records.map(r => recordHtml(r, asOf, true, fullText?.get(r.id), headingRegistry)).join('\n')}</ol>
${fullText?.has(records[0].id) ? '<p id="copy-status" role="status" aria-live="polite"></p><script src="/statute-reading.js" defer></script>' : ''}
${relatedHtml}
<p class="version">Version labels evaluated as of ${date(asOf)}. Source-check dates are shown on each version; rebuilding this page does not recheck the law.</p>
<nav class="chapter-navigation" aria-label="Continue browsing"><a href="/chapters/${chapter.chapter}/">← All Chapter ${chapter.chapter} sections</a><a href="/#search">Search another statute</a></nav>`;
    files[`statutes/${encodeURIComponent(section)}/index.html`] = page(
      title,
      description,
      path,
      content,
      stylesheet,
      [...rootBreadcrumb, { name: `Chapter ${chapter.chapter}`, path: `/chapters/${chapter.chapter}/` }, { name: `§ ${section}`, path }],
      'WebPage',
      sectionAliases,
    );
  }

  const topicsBreadcrumb = [{ name: 'Home', path: '/' }, { name: 'Topics', path: '/topics/' }];
  const topicsDirectory = `<p class="eyebrow">MISSOURI STATUTE TOPIC GUIDES</p>
<h1>Browse Missouri statutes by topic</h1>
<p class="intro">Curated plain-English entry points to frequently searched Missouri Revised Statutes (RSMo) sections, organized by everyday legal topic.</p>
<p class="statute-note">Curated topic index to official Missouri statute headings — not legal advice or an exhaustive list of every law that may apply.</p>
<p>${topicPages.length} curated topic guides · <a href="/#search">Search all ${dataset.manifest.sectionCount.toLocaleString('en-US')} sections</a> or <a href="/chapters/">browse by chapter</a>.</p>
<ul class="topic-directory">${topicPages.map(topic => {
    const validSections = topic.sections.filter(s => bySection.has(s));
    return `<li><a href="/topics/${escapeHtml(topic.slug)}/"><span>${escapeHtml(topic.title)}</span></a><p>${escapeHtml(topic.description)}</p><small>${validSections.length} statute section${validSections.length === 1 ? '' : 's'}</small></li>`;
  }).join('\n')}</ul>`;
  files['topics/index.html'] = page(
    'Missouri Statutes by Topic | Show Me Statutes',
    'Browse curated Missouri Revised Statutes (RSMo) topic guides covering family law, housing, traffic, criminal law, firearms, open government, employment, and probate.',
    '/topics/',
    topicsDirectory,
    stylesheet,
    topicsBreadcrumb,
  );

  for (const topic of topicPages) {
    const path = `/topics/${topic.slug}/`;
    const title = `${topic.title} | Show Me Statutes`;
    const validSections = topic.sections.filter(s => bySection.has(s));
    const searchQuery = topic.searchQuery ?? topic.queries[0] ?? topic.title;
    const topicCards = validSections.map(sec => {
      const records = sortedSectionVersions(bySection.get(sec)!);
      const primary = primaryRecord(records);
      return topicSectionHtml(primary, records.length, asOf);
    }).join('\n');
    const content = `<p class="eyebrow">MISSOURI STATUTE TOPIC GUIDE</p>
<h1>${escapeHtml(topic.title)}</h1>
<p class="intro">${escapeHtml(topic.intro)}</p>
<p class="statute-note">Curated topic index to official Missouri statute headings — not legal advice or an exhaustive list of every law that may apply.</p>
<p class="topic-actions"><a href="/?q=${encodeURIComponent(searchQuery)}">Search “${escapeHtml(searchQuery)}” interactively →</a> · <a href="/topics/">All topic guides</a></p>
<p class="version">Version labels evaluated as of ${date(asOf)}. Source-check dates are shown on each section; rebuilding this page does not recheck the law.</p>
<ol class="result-list browse-records">${topicCards}</ol>
<nav class="chapter-navigation" aria-label="Continue browsing"><a href="/topics/">← All Missouri law topics</a><a href="/chapters/">Browse by chapter</a><a href="/#search">Search all statutes</a></nav>`;
    files[`topics/${topic.slug}/index.html`] = page(
      title,
      topic.description,
      path,
      content,
      stylesheet,
      [...topicsBreadcrumb, { name: topic.title, path }],
    );
  }

  const urls = [
    '/',
    '/about/',
    '/chapters/',
    '/topics/',
    ...topicPages.map(t => `/topics/${t.slug}/`),
    ...chapters.map(c => `/chapters/${c.chapter}/`),
    ...[...bySection.keys()].map(statutePath),
  ];
  // No artificial lastmod dates: rebuilding is not a source-content update.
  files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${siteUrl}${path}</loc></url>`).join('\n')}</urlset>\n`;
  files['robots.txt'] = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  return files;
}
