import './style.css';
import './browse.css';
import {
  hydrateClientDataset,
  effectiveDateLabel,
  isContingent,
  sourceDateNotice,
  constitutionalNotice,
  standaloneReprintNotice,
  enactmentNotice,
  todayInMissouri,
  type DatasetView,
} from './runtime';
import { createSearch, extractIndexTerms, findMatchingChapters, loadIndex, type Match, type SearchResults } from './search';
import { chapterFacets, filterByChapter, resultCount } from './filters';
import { statuteVersionPath } from './paths';

const form = document.querySelector<HTMLFormElement>('#search-form')!;
const input = document.querySelector<HTMLInputElement>('#query')!;
const button = document.querySelector<HTMLButtonElement>('#search-button')!;
const chapterFilters = document.querySelector<HTMLElement>('#chapter-filters')!;
const chapterChoices = document.querySelector<HTMLDivElement>('#chapter-choices')!;
const moreChapters = document.querySelector<HTMLButtonElement>('#more-chapters')!;
const activeFilter = document.querySelector<HTMLDivElement>('#active-filter')!;
const clearChapter = document.querySelector<HTMLButtonElement>('#clear-chapter')!;
const matchingChaptersSection = document.querySelector<HTMLElement>('#matching-chapters')!;
const matchingChapterList = document.querySelector<HTMLDivElement>('#matching-chapter-list')!;
const resultsHeading = document.querySelector<HTMLHeadingElement>('#results-heading')!;
const upcoming = document.querySelector<HTMLInputElement>('#upcoming')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const results = document.querySelector<HTMLDivElement>('#results')!;
let selectedChapter = '';
let previousQuery = '';
let expandedChapters = false;
let cached: { key: string; found: SearchResults } | undefined;
let search: ReturnType<typeof createSearch> | null = null;
let dataset: DatasetView;
let chapterTitles = new Map<string, string>();
let timer: ReturnType<typeof setTimeout>;
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const formatDate = (value: string) => dateFormatter.format(new Date(value));
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
  link.href = statuteVersionPath(r.section, r.id);
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
  const PAGE_SIZE = 50;
  let visibleCount = Math.min(matches.length, 8);
  const initialFragment = document.createDocumentFragment();
  for (let i = 0; i < visibleCount; i++) initialFragment.append(card(matches[i], future, asOf));
  list.append(initialFragment);
  section.append(list);
  if (matches.length > visibleCount) {
    const moreLabel = () => {
      const remaining = matches.length - visibleCount;
      return remaining > PAGE_SIZE
        ? `Show ${PAGE_SIZE} more of ${remaining} remaining headings`
        : `Show remaining ${remaining} heading${remaining === 1 ? '' : 's'}`;
    };
    const more = element('button', moreLabel(), 'show-more');
    more.type = 'button';
    more.addEventListener('click', () => {
      const firstNew = visibleCount;
      const nextCount = Math.min(matches.length, visibleCount + PAGE_SIZE);
      const fragment = document.createDocumentFragment();
      for (let i = visibleCount; i < nextCount; i++) fragment.append(card(matches[i], future, asOf));
      list.append(fragment);
      visibleCount = nextCount;
      if (visibleCount >= matches.length) more.remove();
      else more.textContent = moreLabel();
      list.children[firstNew]?.querySelector('a')?.focus();
    });
    section.append(more);
  }
  results.append(section);
}
function renderChapterFilters(found: SearchResults) {
  const facets = chapterFacets(found);
  chapterFilters.hidden = !facets.length && !selectedChapter;
  chapterChoices.replaceChildren();
  const addChoice = (value: string, label: string, count: number) => {
    const choice = element('button', undefined, 'chapter-choice');
    choice.type = 'button';
    choice.dataset.chapter = value;
    choice.setAttribute('aria-pressed', String(selectedChapter === value));
    choice.setAttribute('aria-label', `${label}, ${count} matching source version${count === 1 ? '' : 's'}`);
    choice.append(element('span', label), element('span', String(count), 'chapter-count'));
    chapterChoices.append(choice);
  };
  addChoice('', 'All chapters', resultCount(found));
  for (const facet of facets.filter((f, i) => expandedChapters || i < 12 || f.chapter === selectedChapter)) {
    addChoice(facet.chapter, `Ch. ${facet.chapter} · ${facet.title}`, facet.count);
  }
  // Keep a selected future-only chapter removable if upcoming versions are switched off.
  if (selectedChapter && !facets.some(f => f.chapter === selectedChapter)) {
    addChoice(selectedChapter, `Ch. ${selectedChapter} · ${chapterTitles.get(selectedChapter)!}`, 0);
  }
  moreChapters.hidden = facets.length <= 12;
  moreChapters.textContent = expandedChapters ? 'Show fewer chapters' : `Show all ${facets.length} matching chapters`;
  moreChapters.setAttribute('aria-expanded', String(expandedChapters));
  activeFilter.hidden = !selectedChapter;
  document.querySelector('#filter-description')!.textContent = selectedChapter
    ? `Showing only Chapter ${selectedChapter}: ${chapterTitles.get(selectedChapter)!}` : '';
}
function syncUrl() {
  const params = new URLSearchParams();
  const q = input.value.trim();
  if (q) params.set('q', q);
  if (q && selectedChapter) params.set('chapter', selectedChapter);
  if (upcoming.checked) params.set('upcoming', '1');
  const qs = params.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    try {
      history.replaceState(null, '', next);
    } catch {
      /* Ignore SecurityError from browser history rate limits so search rendering is never aborted. */
    }
  }
}
function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const q = (params.get('q') ?? '').trim().slice(0, 200);
  const ch = params.get('chapter') ?? '';
  input.value = q;
  previousQuery = q;
  selectedChapter = q && ch && chapterTitles.has(ch) ? ch : '';
  expandedChapters = false;
  upcoming.checked = params.get('upcoming') === '1';
}
function renderMatchingChapters(query: string, exact: boolean) {
  const matched = exact ? [] : findMatchingChapters(dataset.manifest.chapters, query);
  matchingChaptersSection.hidden = !matched.length;
  matchingChapterList.replaceChildren();
  for (const c of matched) {
    const chip = element('div', undefined, 'matching-chapter-chip');
    const filterBtn = element('button', undefined, 'matching-chapter-filter');
    filterBtn.type = 'button';
    filterBtn.dataset.chapter = c.chapter;
    filterBtn.setAttribute('aria-pressed', String(selectedChapter === c.chapter));
    filterBtn.setAttribute('aria-label', `Filter results to Chapter ${c.chapter}: ${c.title}`);
    filterBtn.append(element('span', `Ch. ${c.chapter} · ${c.title}`));
    const browseLink = element('a', 'Browse →', 'matching-chapter-browse');
    browseLink.href = `/chapters/${c.chapter}/`;
    browseLink.setAttribute('aria-label', `Browse Chapter ${c.chapter}: ${c.title}`);
    chip.append(filterBtn, browseLink);
    matchingChapterList.append(chip);
  }
}
function runSearch(shouldSyncUrl = true) {
  if (!search) return;
  clearTimeout(timer);
  const query = input.value.trim();
  const asOf = todayInMissouri();
  results.replaceChildren();
  if (query !== previousQuery) { selectedChapter = ''; expandedChapters = false; previousQuery = query; }
  resultsHeading.hidden = !query;
  resultsHeading.textContent = query ? `Results for “${query}”` : '';
  if (!query) {
    chapterFilters.hidden = true;
    activeFilter.hidden = true;
    matchingChaptersSection.hidden = true;
    status.textContent = `Ready to search ${dataset.manifest.sectionCount.toLocaleString()} section headings. Enter a topic or section number above.`;
    if (shouldSyncUrl) syncUrl();
    return;
  }
  const key = JSON.stringify([query, asOf, upcoming.checked]);
  if (cached?.key !== key) cached = { key, found: search(query, asOf, upcoming.checked) };
  const all = cached.found;
  renderChapterFilters(all);
  renderMatchingChapters(query, all.exact);
  const found = filterByChapter(all, selectedChapter);
  const count = resultCount(found);
  const total = resultCount(all);
  status.textContent = `${selectedChapter ? `${count} of ${total}` : count} matching source version${total === 1 ? '' : 's'} · ${selectedChapter ? `Chapter ${selectedChapter}` : 'All chapters'}.${found.correction ? ` Spelling suggestion: ${found.correction}.` : ''}`;
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
  if (shouldSyncUrl) syncUrl();
}
form.addEventListener('submit', event => {
  event.preventDefault();
  runSearch();
  if (!search || !input.value.trim()) return;
  const firstResult = results.querySelector<HTMLElement>('.result-card, .empty-state');
  if (!firstResult) return;
  // Move keyboard focus with the viewport, also dismissing the mobile keyboard.
  const destination = firstResult.querySelector<HTMLElement>('h3 a, h2')!;
  if (destination.tagName === 'H2') destination.tabIndex = -1;
  destination.focus({ preventScroll: true });
  firstResult.scrollIntoView({ block: 'start', behavior: 'instant' });
});
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => runSearch(), 80); });
upcoming.addEventListener('change', () => runSearch());
matchingChapterList.addEventListener('click', event => {
  const choice = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-chapter]');
  if (!choice) return;
  const ch = choice.dataset.chapter!;
  selectedChapter = selectedChapter === ch ? '' : ch;
  runSearch();
  matchingChapterList.querySelector<HTMLButtonElement>(`button[data-chapter="${ch}"]`)?.focus({ preventScroll: true });
});
window.addEventListener('popstate', () => {
  if (!search) return;
  hydrateFromUrl();
  runSearch(false);
});
chapterChoices.addEventListener('click', event => {
  const choice = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-chapter]');
  if (!choice) return;
  selectedChapter = choice.dataset.chapter!;
  runSearch();
  chapterChoices.querySelector<HTMLButtonElement>(`button[data-chapter="${selectedChapter}"]`)?.focus({ preventScroll: true });
});
moreChapters.addEventListener('click', () => { expandedChapters = !expandedChapters; runSearch(); });
clearChapter.addEventListener('click', () => {
  selectedChapter = '';
  runSearch();
  chapterChoices.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
});
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
  example.addEventListener('click', () => { selectedChapter = ''; input.value = example.dataset.query!; runSearch(); input.focus(); });
}
async function initialize() {
  try {
    const datasetPromise = fetch(`${import.meta.env.BASE_URL}data/statutes-client-${import.meta.env.CLIENT_DATASET_HASH}.json`);
    const indexPromise = fetch(`${import.meta.env.BASE_URL}data/search-index-${import.meta.env.SEARCH_INDEX_HASH}.json`).catch(() => null);
    const response = await datasetPromise;
    if (!response.ok) throw new Error('Dataset unavailable');
    const parsed: unknown = await response.json();
    dataset = hydrateClientDataset(parsed, import.meta.env.DATASET_HASH);
    chapterTitles = new Map(dataset.manifest.chapters.map(c => [c.chapter, c.title]));
    // Fail safely to an in-browser rebuild if a generated index is absent/stale.
    let index;
    let indexTerms: string[] | undefined;
    let builtAt: string | undefined;
    try {
      const indexResponse = await indexPromise;
      if (!indexResponse || !indexResponse.ok) throw new Error('Index unavailable');
      const stored = await indexResponse.json();
      if (stored?.datasetHash !== import.meta.env.DATASET_HASH || !stored.index || typeof stored.index !== 'object') {
        throw new Error('Index mismatch');
      }
      index = loadIndex(stored.index);
      indexTerms = extractIndexTerms(stored.index);
      if (Number.isFinite(Date.parse(stored.builtAt))) builtAt = stored.builtAt;
    } catch { /* Rebuild from the validated local dataset, never another source. */ }
    search = createSearch(dataset.records, index, indexTerms);
    input.disabled = false;
    button.disabled = false;
    document.querySelectorAll<HTMLButtonElement>('[data-query]').forEach(b => { b.disabled = false; });
    const asOf = todayInMissouri();
    document.querySelector('#as-of')!.textContent = `Effective dates checked against ${formatDate(asOf)}`;
    document.querySelector('#coverage-stats')!.textContent = `${dataset.manifest.sectionCount.toLocaleString('en-US')} distinct sections · ${dataset.manifest.recordCount.toLocaleString('en-US')} source versions · ${dataset.manifest.chapters.filter(c => c.sectionCount).length} chapters with headings`;
    document.querySelector('#build-date')!.textContent = builtAt ? `Search index built ${formatDate(builtAt)}.` : 'Search index rebuilt in your browser from the validated snapshot.';
    const age = (Date.parse(asOf) - Date.parse(dataset.manifest.indexCheckedAt)) / 86400000;
    if (age > 30) {
      const notice = element('p', `This source snapshot is more than 30 days old. Check the official source for changes. Last index check: ${formatDate(dataset.manifest.indexCheckedAt)}.`, 'stale-notice');
      document.querySelector('.search-panel')!.after(notice);
    }
    hydrateFromUrl();
    runSearch(false);
  } catch {
    status.textContent = 'The verified heading collection could not be loaded. Please use the official source.';
    const link = element('a', 'Browse Missouri statutes at the Revisor ↗');
    link.href = 'https://revisor.mo.gov/';
    results.append(link);
  }
}
void initialize();
