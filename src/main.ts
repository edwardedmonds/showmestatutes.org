import './style.css';
import { assertDataset, effectiveDateLabel, isContingent, sourceDateNotice, constitutionalNotice, standaloneReprintNotice, enactmentNotice, todayInMissouri, type Dataset } from './data';
import { createSearch, loadIndex, type Match } from './search';

const form = document.querySelector<HTMLFormElement>('#search-form')!;
const input = document.querySelector<HTMLInputElement>('#query')!;
const button = document.querySelector<HTMLButtonElement>('#search-button')!;
const chapter = document.querySelector<HTMLSelectElement>('#chapter')!;
const upcoming = document.querySelector<HTMLInputElement>('#upcoming')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const results = document.querySelector<HTMLDivElement>('#results')!;
const welcome = document.querySelector<HTMLElement>('#welcome')!;
let search: ReturnType<typeof createSearch> | null = null;
let dataset: Dataset;
let timer: ReturnType<typeof setTimeout>;
const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function card(match: Match, future: boolean, asOf: string) {
  const r = match.record;
  const item = element('li', undefined, 'result-card');
  const meta = element('div', undefined, 'card-meta');
  meta.append(element('span', `§ ${r.section}${r.headingMarker ? " *" : ""}`, 'section-number'), element('span', `CHAPTER ${r.chapter} · ${r.chapterTitle.toUpperCase()}`));
  const title = element('h3');
  const link = element('a', r.title);
  link.href = r.sourceUrl;
  title.append(link);
  const dates = element('p', effectiveDateLabel(r, asOf, future), future || isContingent(r, asOf) || r.hasConstitutionalWarning ? 'version future' : 'version');
  const bottom = element('div', undefined, 'card-bottom');
  bottom.append(element('span', match.reason, 'match-reason'), element('small', `Source checked ${formatDate(r.sourceCheckedAt)}`));
  item.append(meta, title, dates, bottom);
  if (r.headingSource === 'chapter-index') item.append(element('p', 'Heading supplied by the official chapter index; this version’s source page omits its heading.', 'version'));
  const dateNotice = sourceDateNotice(r);
  if (dateNotice) item.append(element('p', dateNotice, 'version'));
  const sourceNotice = constitutionalNotice(r);
  if (sourceNotice) item.append(element('p', sourceNotice, 'version'));
  const reprintNotice = standaloneReprintNotice(r);
  if (reprintNotice) item.append(element('p', reprintNotice, 'version'));
  if (r.multipleEnactments) item.append(element('p', `Multiple enactments · source version ${r.versionId}. ${enactmentNotice(r)}`, 'version'));
  if (r.headingMarker) item.append(element('p', 'The official source marks this section with a footnote. Read the source notes.', 'version'));
  const official = element('a', 'Read this version at the Revisor ↗', 'official-link');
  official.href = r.sourceUrl;
  item.append(official);
  return item;
}
function group(title: string, matches: Match[], asOf: string, future = false) {
  if (!matches.length) return;
  const section = element('section', undefined, 'result-group');
  const heading = element('h2', title);
  heading.append(element('span', String(matches.length), 'result-count'));
  section.append(heading);
  const list = element('ol', undefined, 'result-list');
  let visibleCount = Math.min(matches.length, 8);
  matches.slice(0, visibleCount).forEach(m => list.append(card(m, future, asOf)));
  section.append(list);
  if (matches.length > visibleCount) {
    const more = element('button', `Show ${matches.length - visibleCount} more headings`, 'show-more');
    more.type = 'button';
    more.addEventListener('click', () => {
      const firstNew = visibleCount;
      matches.slice(visibleCount).forEach(m => list.append(card(m, future, asOf)));
      visibleCount = matches.length;
      more.remove();
      list.children[firstNew]?.querySelector('a')?.focus();
    });
    section.append(more);
  }
  results.append(section);
}
function runSearch() {
  if (!search) return;
  clearTimeout(timer);
  const query = input.value.trim();
  const asOf = todayInMissouri();
  results.replaceChildren();
  welcome.hidden = Boolean(query);
  document.body.classList.toggle('has-query', Boolean(query));
  if (!query) {
    const count = chapter.value ? dataset.manifest.chapters.find(c => c.chapter === chapter.value)!.sectionCount : dataset.manifest.sectionCount;
    status.textContent = `Ready to search ${count} section headings${chapter.value ? ` in Chapter ${chapter.value}` : ''}.`;
    return;
  }
  const found = search(query, asOf, upcoming.checked, chapter.value);
  const scope = chapter.value ? `Chapter ${chapter.value}` : 'the indexed chapters';
  const count = found.best.length + found.related.length + found.upcoming.length + found.contingent.length + found.constitutional.length;
  status.textContent = count ? `${count} matching version${count === 1 ? '' : 's'} within ${scope}.${found.correction ? ` Spelling suggestion: ${found.correction}.` : ''}` : `No close heading found within ${scope}.`;
  group('Best heading matches', found.best, asOf);
  group('Related sections', found.related, asOf);
  group('Upcoming versions', found.upcoming, asOf, true);
  group('Versions with constitutional warnings', found.constitutional, asOf);
  group('Contingent versions — check the source conditions', found.contingent, asOf);
  if (!count) {
    const empty = element('section', undefined, 'empty-state');
    empty.append(element('h2', 'Try another name or a broader topic.'), element('p', 'Try all indexed chapters if a chapter filter is selected. Laws outside this collection may also be relevant. Upcoming versions are hidden unless you include them.'));
    const source = element('a', 'Search the official Missouri statutes ↗');
    source.href = 'https://revisor.mo.gov/';
    empty.append(source);
    results.append(empty);
  }
}
form.addEventListener('submit', event => { event.preventDefault(); runSearch(); });
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(runSearch, 80); });
upcoming.addEventListener('change', runSearch);
chapter.addEventListener('change', runSearch);
input.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') { event.preventDefault(); runSearch(); results.querySelector<HTMLAnchorElement>('h3 a')?.focus(); }
  if (event.key === 'Escape') { input.value = ''; runSearch(); }
});
results.addEventListener('keydown', event => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const links = [...results.querySelectorAll<HTMLAnchorElement>('h3 a')];
  const current = links.indexOf(document.activeElement as HTMLAnchorElement);
  if (current < 0) return;
  event.preventDefault();
  const next = current + (event.key === 'ArrowDown' ? 1 : -1);
  if (next < 0) input.focus(); else links[next]?.focus();
});
for (const example of document.querySelectorAll<HTMLButtonElement>('[data-query]')) {
  example.disabled = true;
  example.addEventListener('click', () => { chapter.value = ''; input.value = example.dataset.query!; runSearch(); input.focus(); });
}
async function initialize() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/statutes-${import.meta.env.DATASET_HASH}.json`);
    if (!response.ok) throw new Error('Dataset unavailable');
    const source = await response.text();
    const parsed: unknown = JSON.parse(source);
    assertDataset(parsed);
    dataset = parsed;
    // Fail safely to an in-browser rebuild if a generated index is absent/stale.
    let index;
    let builtAt: string | undefined;
    try {
      const indexResponse = await fetch(`${import.meta.env.BASE_URL}data/search-index-${import.meta.env.DATASET_HASH}.json`);
      if (!indexResponse.ok) throw new Error('Index unavailable');
      const stored = await indexResponse.json();
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source)))].map(x => x.toString(16).padStart(2, '0')).join('');
      if (stored.datasetHash !== hash) throw new Error('Index mismatch');
      index = loadIndex(JSON.stringify(stored.index));
      if (Number.isFinite(Date.parse(stored.builtAt))) builtAt = stored.builtAt;
    } catch { /* Rebuild from the validated local dataset, never another source. */ }
    search = createSearch(dataset.records, index);
    input.disabled = false;
    button.disabled = false;
    chapter.disabled = false;
    const coverageList = document.querySelector('#chapter-coverage')!;
    for (const c of dataset.manifest.chapters) {
      const option = element('option', `${c.chapter} · ${c.title}${c.sectionCount ? '' : ' (no sections listed)'}`);
      option.value = c.chapter;
      option.disabled = !c.sectionCount;
      chapter.append(option);
      const item = element('li');
      const link = element('a', `Chapter ${c.chapter}: ${c.title}`);
      link.href = c.sourceIndex;
      item.append(link, element('span', ` — ${c.sectionCount} sections · index checked ${formatDate(c.indexCheckedAt)}`));
      coverageList.append(item);
    }
    document.querySelectorAll<HTMLButtonElement>('[data-query]').forEach(b => { b.disabled = false; });
    const asOf = todayInMissouri();
    document.querySelector('#as-of')!.textContent = `Effective dates checked against ${formatDate(asOf)}`;
    document.querySelector('#coverage-stats')!.textContent = `${dataset.manifest.sectionCount} distinct sections · ${dataset.manifest.recordCount} source versions · ${dataset.manifest.chapters.filter(c => c.sectionCount).length} chapters with headings`;
    document.querySelector('#coverage-description')!.textContent = dataset.manifest.coverageDescription;
    document.querySelector('#source-date')!.textContent = `Source collection completed ${formatDate(dataset.manifest.collectedAt)}. Individual source-check dates appear on each result.`;
    document.querySelector('#build-date')!.textContent = builtAt ? `Search index built ${formatDate(builtAt)}.` : 'Search index rebuilt in your browser from the validated snapshot.';
    const age = (Date.parse(asOf) - Date.parse(dataset.manifest.indexCheckedAt)) / 86400000;
    if (age > 30) {
      const notice = element('p', `This source snapshot is more than 30 days old. Check the official source for changes. Last index check: ${formatDate(dataset.manifest.indexCheckedAt)}.`, 'stale-notice');
      document.querySelector('.search-panel')!.after(notice);
    }
    runSearch();
  } catch {
    status.textContent = 'The verified heading collection could not be loaded. Please use the official source.';
    const link = element('a', 'Browse Missouri statutes at the Revisor ↗');
    link.href = 'https://revisor.mo.gov/';
    results.append(link);
  }
}
void initialize();
