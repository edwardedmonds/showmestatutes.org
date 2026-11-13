import coverage from '../data/coverage.json';
const reviewedOverlaps = [...coverage.delayedEnactments, ...coverage.reprintedEnactments, ...coverage.conflictingEnactments];
export const chapterPolicy = coverage.chapters;
export interface ChapterSummary {
  chapter: string; title: string; sourceIndex: string; indexCheckedAt: string;
  sourceSha256: string; recordCount: number; sectionCount: number;
}
export interface Statute {
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
  sourceSha256: string;
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
export interface Dataset {
  manifest: {
    schemaVersion: 2;
    coverage: string[];
    coverageDescription: string;
    chapters: ChapterSummary[];
    indexCheckedAt: string;
    collectedAt: string;
    recordCount: number;
    sectionCount: number;
  };
  records: Statute[];
}
export const validDate = (s: unknown): s is string => typeof s === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
  && new Date(s).toISOString().slice(0, 10) === s;

export function validSection(section: string): boolean {
  if (section.startsWith('400.')) return /^400\.(?:[1-9]|1[01]|[24]A)-[0-9]{3}$/.test(section);
  return /^[1-9]\d{0,2}\.[0-9]{3,4}$/.test(section) || /^409\.[1-7]-[0-9]{3}$/.test(section) || /^448\.[1-4]-[0-9]{3}$/.test(section)
    || /^456\.(?:[1-8]-[0-9]{3}|4-411[AB]|1[01]-[0-9]{4})$/.test(section);
}

export function assertDataset(value: unknown): asserts value is Dataset {
  if (!value || typeof value !== 'object') throw new Error('Missing dataset');
  const d = value as Dataset;
  if (d.manifest?.schemaVersion !== 2 || d.manifest.coverage?.join() !== chapterPolicy.map(c => c.chapter).join()
    || d.manifest.coverageDescription !== coverage.coverageDescription
    || !Array.isArray(d.records) || d.records.length < 50
    || d.manifest.recordCount !== d.records.length
    || !Number.isFinite(Date.parse(d.manifest.collectedAt))) throw new Error('Invalid manifest');
  const ids = new Set<string>();
  const sections = new Map<string, Statute[]>();
  for (const r of d.records) {
    const headingException = coverage.indexHeadingExceptions.find(p => p.id === r?.id);
    const warning = coverage.constitutionalWarnings.find(p => p.id === r?.id);
    const standalone = coverage.standaloneReprints.find(p => p.id === r?.id);
    const dateNote = coverage.sourceDateNotes.find(p => p.id === r?.id);
    const contingentPolicy = coverage.contingentEnactments.find(c => c.section === r?.section);
    const delayed = reviewedOverlaps.find(c => c.section === r?.section)?.versions.find(v => v.versionId === r?.versionId);
    const contingent = contingentPolicy?.versions.find(v => v.versionId === r?.versionId);
    if (!r || typeof r.section !== 'string' || !validSection(r.section) || !/^\d+$/.test(r.versionId)
      || r.id !== `${r.section}:${r.versionId}` || ids.has(r.id)
      || typeof r.title !== 'string' || !r.title.trim() || r.title.endsWith('...')
      || r.chapter !== r.section.split('.')[0] || !chapterPolicy.some(c => c.chapter === r.chapter && c.title === r.chapterTitle)
      || (r.multipleEnactments !== undefined && r.multipleEnactments !== true)
      || Boolean(r.multipleEnactments) !== (Boolean(delayed) || Boolean(contingent && contingentPolicy?.multipleEnactments) || coverage.concurrentEnactments.some(c => c.section === r.section && c.versionIds.includes(r.versionId)))
      || (r.effectiveDateIsPlaceholder !== undefined && r.effectiveDateIsPlaceholder !== true)
      || Boolean(r.effectiveDateIsPlaceholder) !== Boolean(contingent?.dateIsPlaceholder)
      || (r.effectiveEndDateIsPlaceholder !== undefined && r.effectiveEndDateIsPlaceholder !== true)
      || Boolean(r.effectiveEndDateIsPlaceholder) !== Boolean(contingent && 'endDateIsPlaceholder' in contingent && contingent.endDateIsPlaceholder)
      || (contingent && 'repealHeading' in contingent && r.title !== contingent.repealHeading)
      || (r.hasContingentEffectiveDate !== undefined && r.hasContingentEffectiveDate !== true)
      || Boolean(r.hasContingentEffectiveDate) !== Boolean(contingent && 'conditionPending' in contingent && contingent.conditionPending)
      || r.contingentUntil !== (contingent && 'contingentUntil' in contingent ? contingent.contingentUntil : undefined)
      || (r.contingentUntil !== undefined && (!validDate(r.contingentUntil) || !r.hasContingentEffectiveDate || r.effectiveDateIsPlaceholder || r.contingentUntil < r.effectiveFrom))
      || r.effectiveFromFootnote !== dateNote?.effectiveFromFootnote
      || (dateNote && (r.effectiveFrom !== dateNote.effectiveFrom || !validDate(r.effectiveFromFootnote)))
      || r.headingSource !== (headingException ? 'chapter-index' : undefined)
      || (headingException && (r.title !== headingException.title || r.effectiveFrom !== headingException.effectiveFrom))
      || (r.hasConstitutionalWarning !== undefined && r.hasConstitutionalWarning !== true)
      || Boolean(r.hasConstitutionalWarning) !== Boolean(warning)
      || (warning && r.effectiveFrom !== warning.effectiveFrom)
      || (standalone && (r.effectiveFrom !== standalone.effectiveFrom || r.effectiveTo !== standalone.effectiveTo || r.multipleEnactments || r.hasConstitutionalWarning))
      || !validDate(r.effectiveFrom) || (r.effectiveTo !== null && (!validDate(r.effectiveTo) || (r.effectiveTo <= r.effectiveFrom && !r.effectiveEndDateIsPlaceholder)))
      || !Number.isFinite(Date.parse(r.sourceCheckedAt)) || !/^[a-f0-9]{64}$/.test(r.sourceSha256)
      || r.sourceUrl !== `https://revisor.mo.gov/main/OneSection.aspx?section=${r.section}&bid=${r.versionId}`) {
      throw new Error('Invalid source record');
    }
    ids.add(r.id);
    sections.set(r.section, [...(sections.get(r.section) ?? []), r]);
  }
  if (coverage.constitutionalWarnings.some(p => !ids.has(p.id))) throw new Error('Missing reviewed constitutional warning');
  if (coverage.standaloneReprints.some(p => !ids.has(p.id) || sections.get(p.section)?.length !== 1)) throw new Error('Missing or duplicated standalone reprint');
  if (!Array.isArray(d.manifest.chapters) || d.manifest.chapters.map(c => c.chapter).join() !== d.manifest.coverage.join()) throw new Error('Missing chapter provenance');
  for (const c of d.manifest.chapters) {
    const policy = chapterPolicy.find(p => p.chapter === c.chapter)!;
    const records = d.records.filter(r => r.chapter === c.chapter);
    if (c.title !== policy.title || c.recordCount !== records.length || records.length < policy.minimumVersions
      || c.sectionCount !== new Set(records.map(r => r.section)).size
      || c.sourceIndex !== `https://revisor.mo.gov/main/OneChapter.aspx?chapter=${c.chapter}`
      || !Number.isFinite(Date.parse(c.indexCheckedAt)) || !/^[a-f0-9]{64}$/.test(c.sourceSha256)) throw new Error('Invalid chapter provenance');
  }
  if (d.manifest.indexCheckedAt !== d.manifest.chapters.map(c => c.indexCheckedAt).sort()[0]
    || d.manifest.collectedAt !== [...d.records.map(r => r.sourceCheckedAt), ...d.manifest.chapters.map(c => c.indexCheckedAt)].sort().at(-1)) throw new Error('Invalid collection dates');
  if (sections.size !== d.manifest.sectionCount) throw new Error('Section count mismatch');
  for (const versions of sections.values()) {
    versions.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    const contingent = coverage.contingentEnactments.find(c => c.section === versions[0].section);
    if (contingent) {
      if (versions.map(r => r.versionId).sort().join() !== contingent.versions.map(v => v.versionId).sort().join()
        || versions.some(r => {
          const expected = contingent.versions.find(v => v.versionId === r.versionId);
          return !expected || Boolean(r.multipleEnactments) !== contingent.multipleEnactments || r.effectiveFrom !== expected.effectiveFrom || r.effectiveTo !== ('effectiveTo' in expected ? expected.effectiveTo : null)
            || Boolean(r.effectiveDateIsPlaceholder) !== expected.dateIsPlaceholder;
        })) throw new Error('Unresolved contingent enactments');
      continue;
    }
    const delayed = reviewedOverlaps.find(c => c.section === versions[0].section);
    if (delayed) {
      if (versions.map(r => r.versionId).sort().join() !== delayed.versions.map(v => v.versionId).sort().join()
        || versions.some(r => {
          const expected = delayed.versions.find(v => v.versionId === r.versionId);
          return !expected || !r.multipleEnactments || r.effectiveFrom !== expected.effectiveFrom || r.effectiveTo !== null;
        })) throw new Error('Unresolved delayed/reprinted/conflicting enactments');
      continue;
    }
    const concurrent = coverage.concurrentEnactments.find(c => c.section === versions[0].section);
    if (concurrent) {
      if (versions.map(r => r.versionId).sort().join() !== [...concurrent.versionIds].sort().join()
        || versions.some(r => !r.multipleEnactments || r.effectiveFrom !== concurrent.effectiveFrom || r.effectiveTo !== null)) throw new Error('Unresolved concurrent enactments');
      continue;
    }
    for (let i = 1; i < versions.length; i++) {
      const prior = versions[i - 1];
      if (!prior.effectiveTo || prior.effectiveTo > versions[i].effectiveFrom) throw new Error('Unresolved version overlap');
    }
  }
}
export function isContingent(record: Statute, asOf: string): boolean {
  return Boolean(record.effectiveDateIsPlaceholder || (record.hasContingentEffectiveDate && (!record.contingentUntil || asOf < record.contingentUntil)));
}
export function isEffective(record: Statute, asOf: string): boolean {
  return !record.hasConstitutionalWarning && !isContingent(record, asOf) && (record.effectiveFromFootnote ?? record.effectiveFrom) <= asOf && (!record.effectiveTo || record.effectiveEndDateIsPlaceholder === true || asOf < record.effectiveTo);
}
export function isUpcoming(record: Statute, asOf: string): boolean {
  return !record.hasConstitutionalWarning && !isContingent(record, asOf) && (record.effectiveFromFootnote ?? record.effectiveFrom) > asOf;
}
export function todayInMissouri(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(k => parts.find(p => p.type === k)!.value).join('-');
}

export function enactmentNotice(record: Statute): string | undefined {
  if (!record.multipleEnactments) return undefined;
  return reviewedOverlaps.find(p => p.section === record.section)?.displayNotice
    ?? coverage.contingentEnactments.find(p => p.section === record.section)?.displayNotice
    ?? 'The Revisor prints both versions due to possible conflict. Read both official source pages.';
}

export function constitutionalNotice(record: Statute): string | undefined {
  return coverage.constitutionalWarnings.find(p => p.id === record.id)?.displayNotice;
}

export function standaloneReprintNotice(record: Statute): string | undefined {
  return coverage.standaloneReprints.find(p => p.id === record.id)?.displayNotice;
}

export function sourceDateNotice(record: Statute): string | undefined {
  return coverage.sourceDateNotes.find(p => p.id === record.id)?.displayNotice
    ?? (record.contingentUntil ? coverage.contingentEnactments.find(p => p.section === record.section)?.displayNotice : undefined);
}

export function effectiveDateLabel(r: Statute, asOf: string, future: boolean): string {
  const format = (value: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
  if (r.hasConstitutionalWarning) return `Source effective date ${format(r.effectiveFrom)} · The Revisor flags all or part as unconstitutional. Read the official notes before relying on this version.`;
  if (r.effectiveDateIsPlaceholder) return 'Contingent effective date · the source date is a placeholder, not a scheduled start. Read the official conditions.';
  if (isContingent(r, asOf)) return `Contingent effective date · source date ${format(r.effectiveFrom)}. Read the official conditions before relying on this version.`;
  if (r.contingentUntil) return `Effective no later than ${format(r.contingentUntil)} · source date ${format(r.effectiveFrom)}. Read the official conditions.`;
  return `${future ? 'Upcoming · effective' : 'Effective'} ${format(r.effectiveFromFootnote ?? r.effectiveFrom)}${r.effectiveFromFootnote ? ` (source footnote) · header date ${format(r.effectiveFrom)}` : ''}${r.effectiveEndDateIsPlaceholder ? ' · end date is contingent; read the source conditions' : r.effectiveTo ? ` · ends ${format(r.effectiveTo)}` : ''}`;
}
