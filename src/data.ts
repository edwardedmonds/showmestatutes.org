import coverage from '../data/coverage.json';
import {
  validDate,
  validSection,
  type ChapterView,
  type StatuteRecord,
} from './runtime';

export {
  validDate,
  validSection,
  isContingent,
  isEffective,
  isUpcoming,
  todayInMissouri,
  enactmentNotice,
  constitutionalNotice,
  standaloneReprintNotice,
  sourceDateNotice,
  effectiveDateLabel,
  type ChapterView,
  type StatuteRecord,
  type DatasetView,
} from './runtime';

const reviewedOverlaps = [...coverage.delayedEnactments, ...coverage.reprintedEnactments, ...coverage.conflictingEnactments];
export const chapterPolicy = coverage.chapters;

const chapterPolicyByChapter = new Map(chapterPolicy.map(c => [c.chapter, c]));
const expectedCoverageKey = chapterPolicy.map(c => c.chapter).join();
const headingExceptionById = new Map(coverage.indexHeadingExceptions.map(p => [p.id, p]));
const warningById = new Map(coverage.constitutionalWarnings.map(p => [p.id, p]));
const standaloneById = new Map(coverage.standaloneReprints.map(p => [p.id, p]));
const dateNoteById = new Map(coverage.sourceDateNotes.map(p => [p.id, p]));
const contingentBySection = new Map(coverage.contingentEnactments.map(c => [c.section, {
  policy: c,
  versionsById: new Map(c.versions.map(v => [v.versionId, v])),
  sortedVersionIds: c.versions.map(v => v.versionId).sort().join(),
}]));
const reviewedOverlapBySection = new Map(reviewedOverlaps.map(c => [c.section, {
  policy: c,
  versionsById: new Map(c.versions.map(v => [v.versionId, v])),
  sortedVersionIds: c.versions.map(v => v.versionId).sort().join(),
}]));
const concurrentBySection = new Map(coverage.concurrentEnactments.map(c => [c.section, {
  policy: c,
  versionIdSet: new Set(c.versionIds),
  sortedVersionIds: [...c.versionIds].sort().join(),
}]));

export interface ChapterSummary extends ChapterView {
  sourceSha256: string;
}

export interface Statute extends StatuteRecord {
  sourceSha256: string;
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

export function assertDataset(value: unknown): asserts value is Dataset {
  if (!value || typeof value !== 'object') throw new Error('Missing dataset');
  const d = value as Dataset;
  if (d.manifest?.schemaVersion !== 2 || d.manifest.coverage?.join() !== expectedCoverageKey
    || d.manifest.coverageDescription !== coverage.coverageDescription
    || !Array.isArray(d.records) || d.records.length < 50
    || d.manifest.recordCount !== d.records.length
    || !Number.isFinite(Date.parse(d.manifest.collectedAt))) throw new Error('Invalid manifest');
  const ids = new Set<string>();
  const sections = new Map<string, Statute[]>();
  const chapterRecordCounts = new Map<string, number>();
  const chapterSectionCounts = new Map<string, number>();
  let maxTimestamp = '';
  for (const r of d.records) {
    const headingException = headingExceptionById.get(r?.id);
    const warning = warningById.get(r?.id);
    const standalone = standaloneById.get(r?.id);
    const dateNote = dateNoteById.get(r?.id);
    const contingentEntry = contingentBySection.get(r?.section);
    const contingentPolicy = contingentEntry?.policy;
    const delayed = reviewedOverlapBySection.get(r?.section)?.versionsById.get(r?.versionId);
    const contingent = contingentEntry?.versionsById.get(r?.versionId);
    const concurrentEntry = concurrentBySection.get(r?.section);
    const chapterEntry = chapterPolicyByChapter.get(r?.chapter);
    const dot = typeof r?.section === 'string' ? r.section.indexOf('.') : -1;
    const sectionChapter = typeof r?.section === 'string' ? (dot >= 0 ? r.section.slice(0, dot) : r.section) : '';
    if (!r || typeof r.section !== 'string' || !validSection(r.section) || !/^\d+$/.test(r.versionId)
      || r.id !== `${r.section}:${r.versionId}` || ids.has(r.id)
      || typeof r.title !== 'string' || !r.title.trim() || r.title.endsWith('...')
      || r.chapter !== sectionChapter || !chapterEntry || chapterEntry.title !== r.chapterTitle
      || (r.multipleEnactments !== undefined && r.multipleEnactments !== true)
      || Boolean(r.multipleEnactments) !== (Boolean(delayed) || Boolean(contingent && contingentPolicy?.multipleEnactments) || Boolean(concurrentEntry?.versionIdSet.has(r.versionId)))
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
    const sectionVersions = sections.get(r.section);
    if (sectionVersions) {
      sectionVersions.push(r);
    } else {
      sections.set(r.section, [r]);
      chapterSectionCounts.set(r.chapter, (chapterSectionCounts.get(r.chapter) ?? 0) + 1);
    }
    chapterRecordCounts.set(r.chapter, (chapterRecordCounts.get(r.chapter) ?? 0) + 1);
    if (maxTimestamp === '' || r.sourceCheckedAt > maxTimestamp) maxTimestamp = r.sourceCheckedAt;
  }
  if (coverage.constitutionalWarnings.some(p => !ids.has(p.id))) throw new Error('Missing reviewed constitutional warning');
  if (coverage.standaloneReprints.some(p => !ids.has(p.id) || sections.get(p.section)?.length !== 1)) throw new Error('Missing or duplicated standalone reprint');
  if (!Array.isArray(d.manifest.chapters) || d.manifest.chapters.map(c => c.chapter).join() !== d.manifest.coverage.join()) throw new Error('Missing chapter provenance');
  let minIndexCheckedAt = '';
  for (const c of d.manifest.chapters) {
    const policy = chapterPolicyByChapter.get(c.chapter)!;
    const recordCount = chapterRecordCounts.get(c.chapter) ?? 0;
    const sectionCount = chapterSectionCounts.get(c.chapter) ?? 0;
    if (c.title !== policy.title || c.recordCount !== recordCount || recordCount < policy.minimumVersions
      || c.sectionCount !== sectionCount
      || c.sourceIndex !== `https://revisor.mo.gov/main/OneChapter.aspx?chapter=${c.chapter}`
      || !Number.isFinite(Date.parse(c.indexCheckedAt)) || !/^[a-f0-9]{64}$/.test(c.sourceSha256)) throw new Error('Invalid chapter provenance');
    if (minIndexCheckedAt === '' || c.indexCheckedAt < minIndexCheckedAt) minIndexCheckedAt = c.indexCheckedAt;
    if (maxTimestamp === '' || c.indexCheckedAt > maxTimestamp) maxTimestamp = c.indexCheckedAt;
  }
  if (d.manifest.indexCheckedAt !== minIndexCheckedAt || d.manifest.collectedAt !== maxTimestamp) throw new Error('Invalid collection dates');
  if (sections.size !== d.manifest.sectionCount) throw new Error('Section count mismatch');
  for (const versions of sections.values()) {
    const section = versions[0].section;
    const contingentEntry = contingentBySection.get(section);
    if (contingentEntry) {
      const contingent = contingentEntry.policy;
      if (versions.map(r => r.versionId).sort().join() !== contingentEntry.sortedVersionIds
        || versions.some(r => {
          const expected = contingentEntry.versionsById.get(r.versionId);
          return !expected || Boolean(r.multipleEnactments) !== contingent.multipleEnactments || r.effectiveFrom !== expected.effectiveFrom || r.effectiveTo !== ('effectiveTo' in expected ? expected.effectiveTo : null)
            || Boolean(r.effectiveDateIsPlaceholder) !== expected.dateIsPlaceholder;
        })) throw new Error('Unresolved contingent enactments');
      continue;
    }
    const delayedEntry = reviewedOverlapBySection.get(section);
    if (delayedEntry) {
      if (versions.map(r => r.versionId).sort().join() !== delayedEntry.sortedVersionIds
        || versions.some(r => {
          const expected = delayedEntry.versionsById.get(r.versionId);
          return !expected || !r.multipleEnactments || r.effectiveFrom !== expected.effectiveFrom || r.effectiveTo !== null;
        })) throw new Error('Unresolved delayed/reprinted/conflicting enactments');
      continue;
    }
    const concurrentEntry = concurrentBySection.get(section);
    if (concurrentEntry) {
      const concurrent = concurrentEntry.policy;
      if (versions.map(r => r.versionId).sort().join() !== concurrentEntry.sortedVersionIds
        || versions.some(r => !r.multipleEnactments || r.effectiveFrom !== concurrent.effectiveFrom || r.effectiveTo !== null)) throw new Error('Unresolved concurrent enactments');
      continue;
    }
    if (versions.length <= 1) continue;
    versions.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    for (let i = 1; i < versions.length; i++) {
      const prior = versions[i - 1];
      if (!prior.effectiveTo || prior.effectiveTo > versions[i].effectiveFrom) throw new Error('Unresolved version overlap');
    }
  }
}
