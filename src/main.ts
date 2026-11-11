import MiniSearch from 'minisearch';
import './style.css';

interface Statute {
  id: string;
  section: string;
  title: string;
  text: string;
  sourceUrl: string;
  retrievedAt: string;
}

const form = document.querySelector<HTMLFormElement>('#search-form')!;
const input = document.querySelector<HTMLInputElement>('#query')!;
const button = document.querySelector<HTMLButtonElement>('#search-button')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const results = document.querySelector<HTMLOListElement>('#results')!;
const index = new MiniSearch<Statute>({
  fields: ['section', 'title', 'text'],
  searchOptions: { boost: { section: 5, title: 2 }, prefix: true },
});
let statutes = new Map<string, Statute>();

function validStatute(value: unknown): value is Statute {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  if (!['id', 'section', 'title', 'text', 'sourceUrl', 'retrievedAt'].every(
    (key) => typeof entry[key] === 'string' && (entry[key] as string).trim().length > 0,
  )) return false;
  try {
    const url = new URL(entry.sourceUrl as string);
    return url.protocol === 'https:' && url.hostname === 'revisor.mo.gov'
      && !Number.isNaN(Date.parse(entry.retrievedAt as string));
  } catch { return false; }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  results.replaceChildren();
  const query = input.value.trim();
  if (!query) {
    status.textContent = 'Enter a keyword or section number to search.';
    return;
  }
  const matches = index.search(query);
  status.textContent = matches.length
    ? `${matches.length} result${matches.length === 1 ? '' : 's'} found.${matches.length > 50 ? ' Showing the first 50.' : ''}`
    : 'No matches in the loaded collection. Try another keyword or check the official source.';
  for (const match of matches.slice(0, 50)) {
    const statute = statutes.get(String(match.id))!;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = statute.sourceUrl;
    link.textContent = `§ ${statute.section} — ${statute.title}`;
    const excerpt = document.createElement('p');
    excerpt.textContent = statute.text.slice(0, 280) + (statute.text.length > 280 ? '…' : '');
    const source = document.createElement('small');
    source.textContent = `Retrieved ${statute.retrievedAt}. Verify current text at the official source.`;
    item.append(link, excerpt, source);
    results.append(item);
  }
});

async function loadStatutes() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/statutes.json`);
    if (!response.ok) throw new Error('Unable to load collection');
    const data: unknown = await response.json();
    if (!Array.isArray(data) || !data.every(validStatute)) throw new Error('Invalid collection');
    statutes = new Map(data.map((statute) => [statute.id, statute]));
    if (statutes.size !== data.length) throw new Error('Duplicate statute IDs');
    index.addAll(data);
    if (!data.length) {
      status.textContent = 'Search will be available once verified statute data is added. Use the official source below for now.';
      return;
    }
    document.querySelector('.notice')!.textContent = 'Search covers the loaded collection only. Check source dates and official text.';
    input.disabled = false;
    button.disabled = false;
    status.textContent = `${data.length} sections available to search.`;
  } catch {
    status.textContent = 'The statute collection could not be loaded. Please use the official source below.';
  }
}

void loadStatutes();
