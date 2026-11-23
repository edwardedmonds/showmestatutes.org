import citationRules from '../data/citation-rules.json';
import { runtimeCoverage } from './coverage-runtime';

export interface ChapterView {
  chapter: string;
  title: string;
  sourceIndex: string;
  indexCheckedAt: string;
  sourceSha256?: string;
  recordCount: number;
  sectionCount: number;
}

export interface StatuteRecord {
  id: string;
  section: string;
  versionId: string;
  title: string;
  chapter: string;
  chapterTitle: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceUrl: string;
  sourceCheckedAt: string;
  sourceSha256?: string;
  headingMarker?: string;
  multipleEnactments?: true;
  effectiveDateIsPlaceholder?: true;
  effectiveEndDateIsPlaceholder?: true;
  hasConstitutionalWarning?: true;
  hasContingentEffectiveDate?: true;
  contingentUntil?: string;
  effectiveFromFootnote?: string;
  headingSource?: 'chapter-index';
}

export interface DatasetView {
  manifest: {
    schemaVersion: 2;
    datasetHash?: string;
    coverageDescription: string;
    chapters: ChapterView[];
    indexCheckedAt: string;
    collectedAt: string;
    recordCount: number;
    sectionCount: number;
  };
  records: StatuteRecord[];
}

export interface ClientChapterSummary {
  chapter: string;
  title: string;
  indexCheckedAt: string;
  recordCount: number;
  sectionCount: number;
}

export interface ClientStatuteRecord {
  section: string;
  versionId: string;
  title: string;
  effectiveFrom: string;
  sourceCheckedAt: string;
  effectiveTo?: string;
  headingMarker?: string;
  multipleEnactments?: true;
  effectiveDateIsPlaceholder?: true;
  effectiveEndDateIsPlaceholder?: true;
  hasConstitutionalWarning?: true;
  hasContingentEffectiveDate?: true;
  contingentUntil?: string;
  effectiveFromFootnote?: string;
  headingSource?: 'chapter-index';
}

export interface ClientDataset {
  manifest: {
    schemaVersion: 2;
    datasetHash: string;
    coverageDescription: string;
    chapters: ClientChapterSummary[];
    indexCheckedAt: string;
    collectedAt: string;
    recordCount: number;
    sectionCount: number;
  };
  records: ClientStatuteRecord[];
}

export const procedureChapters = new Set(runtimeCoverage.procedureChapters);

const reviewedOverlapNoticeMap = new Map(Object.entries(runtimeCoverage.reviewedOverlapNotices));
const contingentNoticeMap = new Map(Object.entries(runtimeCoverage.contingentNotices));
const constitutionalNoticeMap = new Map(Object.entries(runtimeCoverage.constitutionalNotices));
const standaloneReprintNoticeMap = new Map(Object.entries(runtimeCoverage.standaloneReprintNotices));
const sourceDateNoticeMap = new Map(Object.entries(runtimeCoverage.sourceDateNotices));

const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function validDate(s: unknown): s is string {
  if (typeof s !== 'string' || s.length !== 10) return false;
  if (s.charCodeAt(4) !== 45 || s.charCodeAt(7) !== 45) return false;
  const y0 = s.charCodeAt(0) - 48;
  const y1 = s.charCodeAt(1) - 48;
  const y2 = s.charCodeAt(2) - 48;
  const y3 = s.charCodeAt(3) - 48;
  const m0 = s.charCodeAt(5) - 48;
  const m1 = s.charCodeAt(6) - 48;
  const d0 = s.charCodeAt(8) - 48;
  const d1 = s.charCodeAt(9) - 48;
  if ((y0 | y1 | y2 | y3 | m0 | m1 | d0 | d1) < 0
    || y0 > 9 || y1 > 9 || y2 > 9 || y3 > 9
    || m0 > 9 || m1 > 9 || d0 > 9 || d1 > 9) return false;
  const year = y0 * 1000 + y1 * 100 + y2 * 10 + y3;
  const month = m0 * 10 + m1;
  const day = d0 * 10 + d1;
  if (month < 1 || month > 12 || day < 1) return false;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const maxDay = month === 2 && isLeap ? 29 : DAYS_IN_MONTH[month];
  return day <= maxDay;
}

export const revisorOrigin = citationRules.revisorOrigin;
export const versionIdPattern = new RegExp(`^(?:${citationRules.versionIdPattern})$`);
export const sha256Pattern = new RegExp(`^(?:${citationRules.sha256Pattern})$`);
export const sectionQueryPattern = new RegExp(citationRules.sectionQueryPattern, 'i');

const chapterPattern = new RegExp(`^(?:${citationRules.chapterPattern})$`);
const standardSectionSuffixPattern = new RegExp(`^(?:${citationRules.standardSectionSuffixPattern})$`);
const chapterSectionRules = new Map(
  Object.entries(citationRules.chapterSectionRules).map(([chapter, rule]) => [
    chapter,
    {
      allowStandard: rule.allowStandard,
      extraPatterns: rule.extraPatterns.map(pattern => new RegExp(`^(?:${pattern})$`)),
    },
  ]),
);

export function validSection(section: string): boolean {
  const dot = section.indexOf('.');
  if (dot <= 0) return false;
  const chapter = section.slice(0, dot);
  if (!chapterPattern.test(chapter)) return false;
  const rule = chapterSectionRules.get(chapter);
  if (rule) {
    if (rule.extraPatterns.some(pattern => pattern.test(section))) return true;
    if (!rule.allowStandard) return false;
  }
  return standardSectionSuffixPattern.test(section.slice(dot + 1));
}

export function isContingent(record: StatuteRecord, asOf: string): boolean {
  return Boolean(record.effectiveDateIsPlaceholder || (record.hasContingentEffectiveDate && (!record.contingentUntil || asOf < record.contingentUntil)));
}

export function isEffective(record: StatuteRecord, asOf: string): boolean {
  return !record.hasConstitutionalWarning && !isContingent(record, asOf) && (record.effectiveFromFootnote ?? record.effectiveFrom) <= asOf && (!record.effectiveTo || record.effectiveEndDateIsPlaceholder === true || asOf < record.effectiveTo);
}

export function isUpcoming(record: StatuteRecord, asOf: string): boolean {
  return !record.hasConstitutionalWarning && !isContingent(record, asOf) && (record.effectiveFromFootnote ?? record.effectiveFrom) > asOf;
}

export function todayInMissouri(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(k => parts.find(p => p.type === k)!.value).join('-');
}

export function enactmentNotice(record: StatuteRecord): string | undefined {
  if (!record.multipleEnactments) return undefined;
  return reviewedOverlapNoticeMap.get(record.section)
    ?? contingentNoticeMap.get(record.section)
    ?? 'The Revisor prints both versions due to possible conflict. Read both official source pages.';
}

export function constitutionalNotice(record: StatuteRecord): string | undefined {
  return constitutionalNoticeMap.get(record.id);
}

export function standaloneReprintNotice(record: StatuteRecord): string | undefined {
  return standaloneReprintNoticeMap.get(record.id);
}

export function sourceDateNotice(record: StatuteRecord): string | undefined {
  return sourceDateNoticeMap.get(record.id)
    ?? (record.contingentUntil ? contingentNoticeMap.get(record.section) : undefined);
}

const effectiveDateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

export function effectiveDateLabel(r: StatuteRecord, asOf: string, future: boolean): string {
  const format = (value: string) => effectiveDateFormatter.format(new Date(value));
  if (r.hasConstitutionalWarning) return `Source effective date ${format(r.effectiveFrom)} · The Revisor flags all or part as unconstitutional. Read the official notes before relying on this version.`;
  if (r.effectiveDateIsPlaceholder) return 'Contingent effective date · the source date is a placeholder, not a scheduled start. Read the official conditions.';
  if (isContingent(r, asOf)) return `Contingent effective date · source date ${format(r.effectiveFrom)}. Read the official conditions before relying on this version.`;
  if (r.contingentUntil) return `Effective no later than ${format(r.contingentUntil)} · source date ${format(r.effectiveFrom)}. Read the official conditions.`;
  return `${future ? 'Upcoming · effective' : 'Effective'} ${format(r.effectiveFromFootnote ?? r.effectiveFrom)}${r.effectiveFromFootnote ? ` (source footnote) · header date ${format(r.effectiveFrom)}` : ''}${r.effectiveEndDateIsPlaceholder ? ' · end date is contingent; read the source conditions' : r.effectiveTo ? ` · ends ${format(r.effectiveTo)}` : ''}`;
}

export function projectClientDataset(dataset: DatasetView, datasetHash: string): ClientDataset {
  const chapters: ClientChapterSummary[] = dataset.manifest.chapters.map(c => ({
    chapter: c.chapter,
    title: c.title,
    indexCheckedAt: c.indexCheckedAt,
    recordCount: c.recordCount,
    sectionCount: c.sectionCount,
  }));
  const records: ClientStatuteRecord[] = dataset.records.map(r => {
    const projected: ClientStatuteRecord = {
      section: r.section,
      versionId: r.versionId,
      title: r.title,
      effectiveFrom: r.effectiveFrom,
      sourceCheckedAt: new Date(r.sourceCheckedAt).toISOString().slice(0, 10),
    };
    if (r.effectiveTo !== null) projected.effectiveTo = r.effectiveTo;
    if (r.headingMarker) projected.headingMarker = r.headingMarker;
    if (r.multipleEnactments) projected.multipleEnactments = true;
    if (r.effectiveDateIsPlaceholder) projected.effectiveDateIsPlaceholder = true;
    if (r.effectiveEndDateIsPlaceholder) projected.effectiveEndDateIsPlaceholder = true;
    if (r.hasConstitutionalWarning) projected.hasConstitutionalWarning = true;
    if (r.hasContingentEffectiveDate) projected.hasContingentEffectiveDate = true;
    if (r.contingentUntil !== undefined) projected.contingentUntil = r.contingentUntil;
    if (r.effectiveFromFootnote !== undefined) projected.effectiveFromFootnote = r.effectiveFromFootnote;
    if (r.headingSource !== undefined) projected.headingSource = r.headingSource;
    return projected;
  });
  return {
    manifest: {
      schemaVersion: 2,
      datasetHash,
      coverageDescription: dataset.manifest.coverageDescription,
      chapters,
      indexCheckedAt: dataset.manifest.indexCheckedAt,
      collectedAt: dataset.manifest.collectedAt,
      recordCount: dataset.manifest.recordCount,
      sectionCount: dataset.manifest.sectionCount,
    },
    records,
  };
}

export function hydrateClientDataset(value: unknown, expectedDatasetHash?: string): DatasetView {
  if (!value || typeof value !== 'object') throw new Error('Missing dataset');
  const d = value as ClientDataset;
  const m = d.manifest;
  if (!m || typeof m !== 'object'
    || m.schemaVersion !== 2
    || typeof m.datasetHash !== 'string' || !m.datasetHash
    || (expectedDatasetHash !== undefined && m.datasetHash !== expectedDatasetHash)
    || typeof m.coverageDescription !== 'string'
    || !Array.isArray(m.chapters) || m.chapters.length === 0
    || typeof m.indexCheckedAt !== 'string' || !Number.isFinite(Date.parse(m.indexCheckedAt))
    || typeof m.collectedAt !== 'string' || !Number.isFinite(Date.parse(m.collectedAt))
    || !Array.isArray(d.records) || d.records.length < 50
    || m.recordCount !== d.records.length
    || typeof m.sectionCount !== 'number') {
    throw new Error('Invalid manifest');
  }
  const chapterTitleByChapter = new Map<string, string>();
  const chapters: ChapterView[] = new Array(m.chapters.length);
  for (let i = 0; i < m.chapters.length; i++) {
    const c = m.chapters[i];
    if (!c || typeof c.chapter !== 'string' || !c.chapter
      || typeof c.title !== 'string'
      || typeof c.indexCheckedAt !== 'string' || !Number.isFinite(Date.parse(c.indexCheckedAt))
      || typeof c.recordCount !== 'number' || typeof c.sectionCount !== 'number'
      || chapterTitleByChapter.has(c.chapter)) {
      throw new Error('Invalid chapter provenance');
    }
    chapterTitleByChapter.set(c.chapter, c.title);
    chapters[i] = {
      chapter: c.chapter,
      title: c.title,
      sourceIndex: `${revisorOrigin}/main/OneChapter.aspx?chapter=${c.chapter}`,
      indexCheckedAt: c.indexCheckedAt,
      recordCount: c.recordCount,
      sectionCount: c.sectionCount,
    };
  }
  const ids = new Set<string>();
  const sections = new Set<string>();
  const records: StatuteRecord[] = new Array(d.records.length);
  for (let i = 0; i < d.records.length; i++) {
    const r = d.records[i];
    if (!r || typeof r.section !== 'string' || !r.section
      || typeof r.versionId !== 'string' || !r.versionId
      || typeof r.title !== 'string' || !r.title
      || !validDate(r.effectiveFrom)
      || typeof r.sourceCheckedAt !== 'string' || !r.sourceCheckedAt) {
      throw new Error('Invalid source record');
    }
    const dot = r.section.indexOf('.');
    if (dot <= 0) throw new Error('Invalid source record');
    const chapter = r.section.slice(0, dot);
    const chapterTitle = chapterTitleByChapter.get(chapter);
    if (chapterTitle === undefined) throw new Error('Invalid source record');
    const id = `${r.section}:${r.versionId}`;
    if (ids.has(id)) throw new Error('Invalid source record');
    ids.add(id);
    sections.add(r.section);
    const record: StatuteRecord = {
      id,
      section: r.section,
      versionId: r.versionId,
      title: r.title,
      chapter,
      chapterTitle,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo ?? null,
      sourceUrl: `${revisorOrigin}/main/OneSection.aspx?section=${r.section}&bid=${r.versionId}`,
      sourceCheckedAt: r.sourceCheckedAt,
      headingMarker: r.headingMarker ?? '',
    };
    if (r.multipleEnactments) record.multipleEnactments = true;
    if (r.effectiveDateIsPlaceholder) record.effectiveDateIsPlaceholder = true;
    if (r.effectiveEndDateIsPlaceholder) record.effectiveEndDateIsPlaceholder = true;
    if (r.hasConstitutionalWarning) record.hasConstitutionalWarning = true;
    if (r.hasContingentEffectiveDate) record.hasContingentEffectiveDate = true;
    if (r.contingentUntil !== undefined) record.contingentUntil = r.contingentUntil;
    if (r.effectiveFromFootnote !== undefined) record.effectiveFromFootnote = r.effectiveFromFootnote;
    if (r.headingSource !== undefined) record.headingSource = r.headingSource;
    records[i] = record;
  }
  if (sections.size !== m.sectionCount) throw new Error('Section count mismatch');
  return {
    manifest: {
      schemaVersion: 2,
      datasetHash: m.datasetHash,
      coverageDescription: m.coverageDescription,
      chapters,
      indexCheckedAt: m.indexCheckedAt,
      collectedAt: m.collectedAt,
      recordCount: m.recordCount,
      sectionCount: m.sectionCount,
    },
    records,
  };
}
