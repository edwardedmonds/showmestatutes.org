/** Local build-only collection. Drafts never become displayed headings. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { FullText } from './full-text';
import { headingsFor, parseHeadingRegistry, type HeadingRegistry, type HeadingReview } from './subsection-headings';

export type HeadingStage = 'reviewed' | 'draft' | 'missing' | 'stale' | 'unnumbered' | 'complex-numbering';
export function loadStatewideHeadings(directory: string, texts: ReadonlyMap<string, FullText>, pilot: HeadingRegistry): HeadingRegistry {
  const entries = new Map(pilot);
  for (const file of readdirSync(directory).sort()) {
    if (!/^chapter-\d+\.json$/.test(file)) throw new Error(`Editorial headings: unexpected shard ${file}`);
    const chapter = file.slice(8, -5);
    const raw = JSON.parse(readFileSync(join(directory, file), 'utf8'));
    if (raw.scope !== 'local-statewide') throw new Error(`Editorial headings: incorrect scope in ${file}`);
    for (const [id, entry] of parseHeadingRegistry(raw)) {
      if (entries.has(id)) throw new Error(`Editorial headings: duplicate version ${id}`);
      const source = texts.get(id);
      if (!source || source.section.split('.')[0] !== chapter || !source.subsections.length)
        throw new Error(`Editorial headings: unknown, unnumbered, or wrong-chapter version ${id}`);
      if (!entry.draftedBy?.trim()) throw new Error(`Editorial headings: missing drafter ${id}`);
      if (entry.reviewStatus === 'source-checked' && (!entry.reviewedBy?.trim()
        || entry.reviewedBy === entry.draftedBy || !entry.reviewSummary?.trim()))
        throw new Error(`Editorial headings: separate source review required for ${id}`);
      entries.set(id, entry);
    }
  }
  for (const id of pilot.keys()) if (!texts.has(id)) throw new Error(`Editorial headings: missing pilot source ${id}`);
  return entries;
}

export function headingCoverage(texts: ReadonlyMap<string, FullText>, registry: HeadingRegistry) {
  const counts = Object.fromEntries(['reviewed','draft','missing','stale','unnumbered','complex-numbering']
    .map(s => [s, { versions: 0, headings: 0 }])) as Record<HeadingStage, {versions: number; headings: number}>;
  const versions: {id: string; stage: HeadingStage; headings: number}[] = [];
  for (const [id, source] of texts) {
    const entry = registry.get(id);
    let stage: HeadingStage;
    if (!source.subsections.length) stage = source.navigationReview ? 'complex-numbering' : 'unnumbered';
    else if (!entry) stage = 'missing';
    else {
      // Check draft provenance too, without making its labels renderable.
      const checked = new Map<string, HeadingReview>([[id, {...entry, reviewStatus: 'source-checked'}]]);
      stage = headingsFor(source, checked).size !== source.subsections.length ? 'stale'
        : entry.reviewStatus === 'draft' ? 'draft' : 'reviewed';
    }
    counts[stage].versions++;
    counts[stage].headings += source.subsections.length;
    versions.push({id, stage, headings: source.subsections.length});
  }
  return { complete: counts.missing.versions + counts.draft.versions + counts.stale.versions === 0,
    totalVersions: texts.size, totalHeadings: versions.reduce((n, v) => n + v.headings, 0), counts, versions };
}
