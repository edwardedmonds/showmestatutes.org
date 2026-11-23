import coverage from '../data/coverage.json';

export interface RuntimeCoverage {
  procedureChapters: string[];
  reviewedOverlapNotices: Record<string, string>;
  contingentNotices: Record<string, string>;
  constitutionalNotices: Record<string, string>;
  standaloneReprintNotices: Record<string, string>;
  sourceDateNotices: Record<string, string>;
}

export interface CoverageSource {
  chapters: ReadonlyArray<{ chapter: string; category: string }>;
  delayedEnactments: ReadonlyArray<{ section: string; displayNotice?: string }>;
  reprintedEnactments: ReadonlyArray<{ section: string; displayNotice?: string }>;
  conflictingEnactments: ReadonlyArray<{ section: string; displayNotice?: string }>;
  contingentEnactments: ReadonlyArray<{ section: string; displayNotice?: string }>;
  constitutionalWarnings: ReadonlyArray<{ id: string; displayNotice?: string }>;
  standaloneReprints: ReadonlyArray<{ id: string; displayNotice?: string }>;
  sourceDateNotes: ReadonlyArray<{ id: string; displayNotice?: string }>;
}

function indexBy<T>(items: ReadonlyArray<T>, key: (item: T) => string, value: (item: T) => string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of items) {
    const v = value(item);
    if (v !== undefined) out[key(item)] = v;
  }
  return out;
}

export function extractRuntimeCoverage(source: CoverageSource): RuntimeCoverage {
  const reviewedOverlaps = [
    ...source.delayedEnactments,
    ...source.reprintedEnactments,
    ...source.conflictingEnactments,
  ];
  return {
    procedureChapters: source.chapters.filter(c => c.category === 'procedure').map(c => c.chapter),
    reviewedOverlapNotices: indexBy(reviewedOverlaps, p => p.section, p => p.displayNotice),
    contingentNotices: indexBy(source.contingentEnactments, p => p.section, p => p.displayNotice),
    constitutionalNotices: indexBy(source.constitutionalWarnings, p => p.id, p => p.displayNotice),
    standaloneReprintNotices: indexBy(source.standaloneReprints, p => p.id, p => p.displayNotice),
    sourceDateNotices: indexBy(source.sourceDateNotes, p => p.id, p => p.displayNotice),
  };
}

export const runtimeCoverage: RuntimeCoverage = extractRuntimeCoverage(coverage);
