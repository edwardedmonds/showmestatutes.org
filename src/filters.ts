import type { SearchResults } from './search';

const groups = ['best', 'related', 'upcoming', 'contingent', 'constitutional'] as const;

export function chapterFacets(results: SearchResults) {
  const chapters = new Map<string, { chapter: string; title: string; count: number }>();
  const seen = new Set<string>();
  for (const group of groups) for (const { record } of results[group]) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    const facet = chapters.get(record.chapter) ?? { chapter: record.chapter, title: record.chapterTitle, count: 0 };
    facet.count++;
    chapters.set(record.chapter, facet);
  }
  return [...chapters.values()].sort((a, b) => b.count - a.count || Number(a.chapter) - Number(b.chapter));
}

// Narrow the existing results without reranking, losing warnings, or changing related-section selection.
export function filterByChapter(results: SearchResults, chapter: string): SearchResults {
  const filtered = { ...results };
  for (const group of groups) filtered[group] = results[group].filter(m => !chapter || m.record.chapter === chapter);
  return filtered;
}

export function resultCount(results: SearchResults) {
  return chapterFacets(results).reduce((total, chapter) => total + chapter.count, 0);
}
