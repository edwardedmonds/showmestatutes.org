/** Build-time editorial metadata, kept separate from the official-source snapshot. */
import { createHash } from 'node:crypto';
import { textContent, type FullText } from './full-text';

interface HeadingReview {
  id: string; sourceUrl: string; sourceSha256: string; textSha256: string;
  reviewStatus: 'source-checked' | 'draft'; reviewedOn: string;
  headings: { number: number; title: string; bodySha256: string; reviewNote: string }[];
}
export type HeadingRegistry = ReadonlyMap<string, HeadingReview>;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
function assert(v: unknown, message: string): asserts v {
  if (!v) throw new Error(`Editorial headings: ${message}`);
}

export function parseHeadingRegistry(value: unknown): HeadingRegistry {
  assert(object(value) && value.schemaVersion === 1 && value.scope === 'local-pilot' && Array.isArray(value.entries), 'invalid pilot registry');
  const result = new Map<string, HeadingReview>();
  for (const entry of value.entries) {
    assert(object(entry) && typeof entry.id === 'string' && !result.has(entry.id), 'missing or duplicate version');
    assert(typeof entry.sourceUrl === 'string' && entry.sourceUrl.startsWith('https://revisor.mo.gov/'), 'missing source URL');
    assert(hash(entry.sourceSha256) && hash(entry.textSha256), 'missing source fingerprints');
    assert(entry.reviewStatus === 'source-checked' || entry.reviewStatus === 'draft', 'invalid review status');
    assert(typeof entry.reviewedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.reviewedOn), 'missing review date');
    assert(Array.isArray(entry.headings) && entry.headings.length > 0, 'missing headings');
    const numbers = new Set<number>();
    for (const row of entry.headings) {
      assert(object(row) && typeof row.number === 'number' && Number.isSafeInteger(row.number) && row.number > 0 && !numbers.has(row.number), 'invalid or duplicate subsection');
      assert(typeof row.title === 'string' && row.title.trim() === row.title && row.title.length > 0 && row.title.length <= 100 && !/[\r\n\t]/.test(row.title), 'invalid title');
      assert(hash(row.bodySha256) && typeof row.reviewNote === 'string' && row.reviewNote.trim().length > 0, 'missing subsection review');
      numbers.add(row.number);
    }
    result.set(entry.id, entry as unknown as HeadingReview);
  }
  return result;
}

export function subsectionFingerprint(text: FullText, index: number): string {
  const start = text.subsections[index].block;
  const end = text.subsections[index + 1]?.block;
  const body = text.blocks.slice(start, end).map(textContent).join('').replace(/\u00ad/g, '').replace(/\s/g, '');
  return createHash('sha256').update(body).digest('hex');
}

/** A changed version, annotation, boundary, or body returns to numbered navigation. */
export function headingsFor(text: FullText, registry: HeadingRegistry): ReadonlyMap<number, string> {
  const entry = registry.get(text.id);
  const empty = new Map<number, string>();
  if (!entry || entry.reviewStatus !== 'source-checked' || entry.sourceUrl !== text.sourceUrl
    || entry.sourceSha256 !== text.sourceSha256 || entry.textSha256 !== text.textSha256
    || entry.headings.length !== text.subsections.length) return empty;
  const titles = new Map<number, string>();
  for (let i = 0; i < text.subsections.length; i++) {
    const subsection = text.subsections[i];
    const row = entry.headings.find(h => h.number === subsection.number);
    if (!row || row.bodySha256 !== subsectionFingerprint(text, i)) return empty;
    titles.set(row.number, row.title);
  }
  return titles;
}
