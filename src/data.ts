import coverage from '../data/coverage.json';
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
    const contingentPolicy = coverage.contingentEnactments.find(c => c.section === r?.section);
    const delayed = coverage.delayedEnactments.find(c => c.section === r?.section)?.versions.find(v => v.versionId === r?.versionId);
    const contingent = contingentPolicy?.versions.find(v => v.versionId === r?.versionId);
    if (!r || !/^[1-9]\d{0,2}\.\d{3,4}$/.test(r.section) || !/^\d+$/.test(r.versionId)
      || r.id !== `${r.section}:${r.versionId}` || ids.has(r.id)
      || typeof r.title !== 'string' || !r.title.trim() || r.title.endsWith('...')
      || r.chapter !== r.section.split('.')[0] || !chapterPolicy.some(c => c.chapter === r.chapter && c.title === r.chapterTitle)
      || (r.multipleEnactments !== undefined && r.multipleEnactments !== true)
      || Boolean(r.multipleEnactments) !== (Boolean(delayed) || Boolean(contingent && contingentPolicy?.multipleEnactments) || coverage.concurrentEnactments.some(c => c.section === r.section && c.versionIds.includes(r.versionId)))
      || (r.effectiveDateIsPlaceholder !== undefined && r.effectiveDateIsPlaceholder !== true)
      || Boolean(r.effectiveDateIsPlaceholder) !== Boolean(contingent?.dateIsPlaceholder)
      || !validDate(r.effectiveFrom) || (r.effectiveTo !== null && (!validDate(r.effectiveTo) || r.effectiveTo <= r.effectiveFrom))
      || !Number.isFinite(Date.parse(r.sourceCheckedAt)) || !/^[a-f0-9]{64}$/.test(r.sourceSha256)
      || r.sourceUrl !== `https://revisor.mo.gov/main/OneSection.aspx?section=${r.section}&bid=${r.versionId}`) {
      throw new Error('Invalid source record');
    }
    ids.add(r.id);
    sections.set(r.section, [...(sections.get(r.section) ?? []), r]);
  }
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
          return !expected || Boolean(r.multipleEnactments) !== contingent.multipleEnactments || r.effectiveFrom !== expected.effectiveFrom || r.effectiveTo !== null
            || Boolean(r.effectiveDateIsPlaceholder) !== expected.dateIsPlaceholder;
        })) throw new Error('Unresolved contingent enactments');
      continue;
    }
    const delayed = coverage.delayedEnactments.find(c => c.section === versions[0].section);
    if (delayed) {
      if (versions.map(r => r.versionId).sort().join() !== delayed.versions.map(v => v.versionId).sort().join()
        || versions.some(r => {
          const expected = delayed.versions.find(v => v.versionId === r.versionId);
          return !expected || !r.multipleEnactments || r.effectiveFrom !== expected.effectiveFrom || r.effectiveTo !== null;
        })) throw new Error('Unresolved delayed enactments');
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
export function isEffective(record: Statute, asOf: string): boolean {
  return !record.effectiveDateIsPlaceholder && record.effectiveFrom <= asOf && (!record.effectiveTo || asOf < record.effectiveTo);
}
export function isUpcoming(record: Statute, asOf: string): boolean {
  return !record.effectiveDateIsPlaceholder && record.effectiveFrom > asOf;
}
export function todayInMissouri(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(k => parts.find(p => p.type === k)!.value).join('-');
}

export function enactmentNotice(record: Statute): string | undefined {
  if (!record.multipleEnactments) return undefined;
  return coverage.delayedEnactments.find(p => p.section === record.section)?.displayNotice
    ?? 'The Revisor prints both versions due to possible conflict. Read both official source pages.';
}
