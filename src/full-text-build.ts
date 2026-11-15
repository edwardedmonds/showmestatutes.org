import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import policy from '../data/full-text-policy.json';
import numberingReviews from '../docs/full-text-numbering-review.json';
import type { Dataset, Statute } from './data';
import { textContent, navigationFor, type FullText, type TextNode } from './full-text';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const compact = (s: string) => s.replace(/\u00ad/g, '').replace(/\s/g, '');
const tags = new Set('p div span strong b em i u s sup sub br hr table thead tbody tfoot tr th td caption colgroup col ul ol li blockquote pre a'.split(' '));
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Full text: ${message}`); }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const styleEnums: Record<string, string[]> = {
  'text-align': ['left','right','center','justify'], 'vertical-align': ['top','middle','bottom','baseline'],
  'font-weight': ['normal','bold','100','200','300','400','500','600','700','800','900'],
  'font-style': ['normal','italic','oblique'], 'text-decoration': ['none','underline','line-through'],
  'white-space': ['normal','nowrap','pre','pre-wrap','pre-line'],
};
function safeStyle(style: string) {
  return style.split(';').every(declaration => {
    const parts = declaration.split(':');
    if (parts.length !== 2) return false;
    const [key, value] = parts;
    if (styleEnums[key]?.includes(value)) return true;
    if (/^border-(top|right|bottom|left)-style$/.test(key)) return ['none','solid','dashed','dotted','double'].includes(value);
    if (/^border-(top|right|bottom|left)-width$/.test(key)) return ['thin','medium','thick'].includes(value) || /^[0-9.]+(pt|px|in|em)?$/.test(value);
    return ['width','height','margin-left','margin-right','text-indent'].includes(key) && /^-?[0-9.]+(pt|px|in|em|%)?$/.test(value);
  });
}

function validateNode(n: unknown): asserts n is TextNode {
  if (typeof n === 'string') return;
  assert(object(n) && typeof n.tag === 'string' && tags.has(n.tag) && object(n.attrs) && Array.isArray(n.children), 'unrecognized text node');
  for (const [k, v] of Object.entries(n.attrs)) {
    assert(typeof v === 'string', 'invalid attribute');
    if (k === 'href' && n.tag === 'a') {
      const url = new URL(v);
      assert(url.protocol === 'https:' && url.hostname === 'revisor.mo.gov' && !url.username && !url.password, 'unsafe source link');
    } else if (['colspan', 'rowspan'].includes(k) && ['td', 'th'].includes(n.tag)) {
      assert(/^\d+$/.test(v) && +v >= 1 && +v <= 100, 'invalid table span');
    } else if (k === 'class') {
      assert(v.split(' ').every(c => ['source-bold','source-italic','source-indent','source-indentblk','source-center'].includes(c)), 'unrecognized semantic class');
    } else if (k === 'style') {
      assert(safeStyle(v), 'unsafe source style');
    } else if (k === 'start' && n.tag === 'ol') {
      assert(/^-?\d+$/.test(v), 'invalid list start');
    } else throw new Error(`Full text: unrecognized attribute ${k}`);
  }
  assert(!['br', 'hr', 'col'].includes(n.tag) || n.children.length === 0, 'void element contains text');
  n.children.forEach(validateNode);
}

export function validateText(value: unknown, record: Statute): asserts value is FullText {
  assert(object(value), 'missing record');
  for (const key of ['id', 'section', 'versionId', 'sourceUrl', 'sourceCheckedAt', 'sourceSha256'] as const) {
    assert(value[key] === record[key], `${record.id}: mismatched ${key}`);
  }
  assert(typeof value.headingText === 'string' && typeof value.textSha256 === 'string' && typeof value.navigationReview === 'boolean', 'missing transcript provenance');
  assert(Array.isArray(value.blocks) && Array.isArray(value.notes) && Array.isArray(value.subsections), 'missing text arrays');
  [...value.blocks, ...value.notes].forEach(validateNode);
  const nodes = [...value.blocks, ...value.notes] as TextNode[];
  if (!compact((value.blocks as TextNode[]).map(textContent).join(''))) {
    assert(policy.emptyBodies.some(r => r.id === record.id && r.sourceSha256 === record.sourceSha256), 'unreviewed empty statutory body');
  }
  assert(sha(compact(value.headingText + nodes.map(textContent).join(''))) === value.textSha256, `${record.id}: transcript checksum mismatch`);
  const expected = navigationFor(value.blocks as TextNode[]);
  assert(JSON.stringify(value.subsections) === JSON.stringify(expected.subsections)
    && value.navigationReview === expected.navigationReview, 'incomplete or ambiguous subsection navigation');
  if (expected.navigationReview) {
    assert(numberingReviews.some(r => r.id === record.id && r.sourceSha256 === record.sourceSha256
      && r.navigationDisabled && JSON.stringify(r.reasons) === JSON.stringify(expected.reasons)), 'unreviewed source numbering');
  }
}

export function loadFullText(directory: string, dataset: Dataset, datasetHash: string, allowPilot = false): Map<string, FullText> {
  const m = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  assert(m.schemaVersion === 1 && m.extractorVersion === 4 && m.datasetSha256 === datasetHash, 'candidate belongs to another heading snapshot or extractor version');
  assert(m.complete === true && Array.isArray(m.errors) && m.errors.length === 0, 'candidate contains extraction failures');
  assert(m.scope === 'statewide' || (m.scope === 'pilot' && allowPilot), 'pilot requires explicit local opt-in');
  assert(Number.isInteger(m.expectedVersions) && m.expectedVersions > 0 && m.expectedVersions === m.recordCount && Array.isArray(m.chapters), 'invalid manifest counts');
  if (m.scope === 'statewide') assert(m.expectedVersions === dataset.records.length, 'statewide version count differs');
  const source = new Map(dataset.records.map(r => [r.id, r]));
  const output = new Map<string, FullText>();
  const chapters = new Set<string>();
  for (const shard of m.chapters) {
    assert(typeof shard.chapter === 'string' && /^\d+$/.test(shard.chapter) && shard.file === `chapter-${shard.chapter}.json` && !chapters.has(shard.chapter), 'invalid or duplicate shard');
    chapters.add(shard.chapter);
    const raw = readFileSync(join(directory, shard.file), 'utf8');
    assert(sha(raw) === shard.sha256, `${shard.file}: shard checksum mismatch`);
    const rows: unknown = JSON.parse(raw);
    assert(Array.isArray(rows) && rows.length === shard.recordCount, 'shard count mismatch');
    for (const row of rows) {
      assert(object(row) && typeof row.id === 'string' && !output.has(row.id), 'duplicate or invalid version');
      const r = source.get(row.id);
      assert(r && r.chapter === shard.chapter, 'unrecognized source version or chapter');
      validateText(row, r);
      output.set(row.id, row);
    }
  }
  assert(output.size === m.recordCount, 'manifest count mismatch');
  if (m.scope === 'statewide') assert(dataset.records.every(r => output.has(r.id)), 'missing statewide versions');
  // A pilot includes every version of each selected section, never a misleading subset.
  const selected = new Set([...output.values()].map(t => t.section));
  assert(dataset.records.every(r => !selected.has(r.section) || output.has(r.id)), 'pilot omits an alternate version');
  return output;
}
