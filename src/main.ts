import './style.css';
import { assertDataset, todayInMissouri, type Dataset } from './data';
import { createSearch, loadIndex, type Match } from './search';

const form = document.querySelector<HTMLFormElement>('#search-form')!;
const input = document.querySelector<HTMLInputElement>('#query')!;
const button = document.querySelector<HTMLButtonElement>('#search-button')!;
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
function card(match: Match, future: boolean) {
  const r = match.record;
  const item = element('li', undefined, 'result-card');
  const meta = element('div', undefined, 'card-meta');
  meta.append(element('span', `§ ${r.section}${r.headingMarker ? " *" : ""}`, 'section-number'), element('span', 'CHAPTER 565 · OFFENSES AGAINST THE PERSON'));
  const title = element('h3');
  const link = element('a', r.title);
  link.href = r.sourceUrl;
  title.append(link);
  const dates = element('p', `${future ? 'Upcoming · effective' : 'Effective'} ${formatDate(r.effectiveFrom)}${r.effectiveTo ? ` · ends ${formatDate(r.effectiveTo)}` : ''}`, future ? 'version future' : 'version');
  const bottom = element('div', undefined, 'card-bottom');
  bottom.append(element('span', match.reason, 'match-reason'), element('small', `Source checked ${formatDate(r.sourceCheckedAt)}`));
  item.append(meta, title, dates, bottom);
  if (r.headingMarker) item.append(element('p', 'The official source marks this section with a footnote. Read the source notes.', 'version'));
  const official = element('a', 'Read this version at the Revisor ↗', 'official-link');
  official.href = r.sourceUrl;
  item.append(official);
  return item;
}
function group(title: string, matches: Match[], future = false) {
  if (!matches.length) return;
  const section = element('section', undefined, 'result-group');
  const heading = element('h2', title);
  heading.append(element('span', String(matches.length), 'result-count'));
  section.append(heading);
  const list = element('ol', undefined, 'result-list');
  let visibleCount = Math.min(matches.length, 8);
  matches.slice(0, visibleCount).forEach(m => list.append(card(m, future)));
  section.append(list);
  if (matches.length > visibleCount) {
    const more = element('button', `Show ${matches.length - visibleCount} more headings`, 'show-more');
    more.type = 'button';
    more.addEventListener('click', () => {
      const firstNew = visibleCount;
      matches.slice(visibleCount).forEach(m => list.append(card(m, future)));
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
    status.textContent = `Ready to search ${dataset.manifest.sectionCount} section headings.`;
    return;
  }
  const found = search(query, asOf, upcoming.checked);
  const count = found.best.length + found.related.length + found.upcoming.length;
  status.textContent = count ? `${count} matching version${count === 1 ? '' : 's'} within Chapter 565.${found.correction ? ` Spelling suggestion: ${found.correction}.` : ''}` : 'No close heading found within Chapter 565.';
  group('Best heading matches', found.best);
  group('Related sections', found.related);
  group('Upcoming versions', found.upcoming, true);
  if (!count) {
    const empty = element('section', undefined, 'empty-state');
    empty.append(element('h2', 'Try another name or a broader topic.'), element('p', 'This pilot searches Chapter 565 only. Other chapters may contain relevant law. Upcoming versions are hidden unless you include them.'));
    const source = element('a', 'Search the official Missouri statutes ↗');
    source.href = 'https://revisor.mo.gov/';
    empty.append(source);
    results.append(empty);
  }
}
form.addEventListener('submit', event => { event.preventDefault(); runSearch(); });
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(runSearch, 80); });
upcoming.addEventListener('change', runSearch);
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
  example.addEventListener('click', () => { input.value = example.dataset.query!; runSearch(); input.focus(); });
}
async function initialize() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/statutes.json`);
    if (!response.ok) throw new Error('Dataset unavailable');
    const source = await response.text();
    const parsed: unknown = JSON.parse(source);
    assertDataset(parsed);
    dataset = parsed;
    // Fail safely to an in-browser rebuild if a generated index is absent/stale.
    let index;
    let builtAt: string | undefined;
    try {
      const indexResponse = await fetch(`${import.meta.env.BASE_URL}data/search-index.json`);
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
    document.querySelectorAll<HTMLButtonElement>('[data-query]').forEach(b => { b.disabled = false; });
    const asOf = todayInMissouri();
    document.querySelector('#as-of')!.textContent = `Effective dates checked against ${formatDate(asOf)}`;
    document.querySelector('#coverage-stats')!.textContent = `${dataset.manifest.sectionCount} distinct sections · ${dataset.manifest.recordCount} source versions · Chapter 565`;
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
    const link = element('a', 'Browse Chapter 565 at the Missouri Revisor ↗');
    link.href = 'https://revisor.mo.gov/main/OneChapter.aspx?chapter=565';
    results.append(link);
  }
}
void initialize();
