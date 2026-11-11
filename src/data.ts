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
}
export interface Dataset {
  manifest: {
    schemaVersion: 1;
    coverage: string[];
    coverageDescription: string;
    sourceIndex: string;
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
  if (d.manifest?.schemaVersion !== 1 || d.manifest.coverage?.join() !== '565'
    || !Array.isArray(d.records) || d.records.length < 50
    || d.manifest.recordCount !== d.records.length
    || !Number.isFinite(Date.parse(d.manifest.collectedAt))) throw new Error('Invalid manifest');
  const ids = new Set<string>();
  const sections = new Map<string, Statute[]>();
  for (const r of d.records) {
    if (!r || !/^565\.\d{3}$/.test(r.section) || !/^\d+$/.test(r.versionId)
      || r.id !== `${r.section}:${r.versionId}` || ids.has(r.id)
      || typeof r.title !== 'string' || !r.title.trim() || r.title.endsWith('...')
      || r.chapter !== '565' || typeof r.chapterTitle !== 'string'
      || !validDate(r.effectiveFrom) || (r.effectiveTo !== null && (!validDate(r.effectiveTo) || r.effectiveTo <= r.effectiveFrom))
      || !Number.isFinite(Date.parse(r.sourceCheckedAt)) || !/^[a-f0-9]{64}$/.test(r.sourceSha256)
      || r.sourceUrl !== `https://revisor.mo.gov/main/OneSection.aspx?section=${r.section}&bid=${r.versionId}`) {
      throw new Error('Invalid source record');
    }
    ids.add(r.id);
    sections.set(r.section, [...(sections.get(r.section) ?? []), r]);
  }
  if (sections.size !== d.manifest.sectionCount) throw new Error('Section count mismatch');
  for (const versions of sections.values()) {
    versions.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    for (let i = 1; i < versions.length; i++) {
      const prior = versions[i - 1];
      if (!prior.effectiveTo || prior.effectiveTo > versions[i].effectiveFrom) throw new Error('Unresolved version overlap');
    }
  }
}
export function isEffective(record: Statute, asOf: string): boolean {
  return record.effectiveFrom <= asOf && (!record.effectiveTo || asOf < record.effectiveTo);
}
export function todayInMissouri(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(k => parts.find(p => p.type === k)!.value).join('-');
}
