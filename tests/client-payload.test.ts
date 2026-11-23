import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import coverage from '../data/coverage.json';
import {
  assertDataset,
  constitutionalNotice,
  effectiveDateLabel,
  enactmentNotice,
  isContingent,
  isEffective,
  isUpcoming,
  sourceDateNotice,
  standaloneReprintNotice,
  type Dataset,
} from '../src/data';
import { extractRuntimeCoverage, runtimeCoverage } from '../src/coverage-runtime';
import {
  hydrateClientDataset,
  procedureChapters,
  projectClientDataset,
  type ClientDataset,
} from '../src/runtime';
import { buildIndex, createSearch, extractIndexTerms, loadIndex } from '../src/search';

const sourcePath = process.env.STATUTES_DATASET ?? 'public/data/statutes.json';
const sourceRaw = readFileSync(sourcePath, 'utf8');
const datasetHash = createHash('sha256').update(sourceRaw).digest('hex');
const dataset: Dataset = JSON.parse(sourceRaw);
assertDataset(dataset);

const asOf = '2026-11-11';
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

describe('projectClientDataset and hydrateClientDataset round-trip parity', () => {
  const projected = projectClientDataset(dataset, datasetHash);
  // Round-trip through JSON to mirror real network transport.
  const wire: unknown = JSON.parse(JSON.stringify(projected));
  const hydrated = hydrateClientDataset(wire, datasetHash);

  it('preserves manifest fields and all 468 chapters', () => {
    expect(hydrated.manifest.schemaVersion).toBe(2);
    expect(hydrated.manifest.datasetHash).toBe(datasetHash);
    expect(hydrated.manifest.coverageDescription).toBe(dataset.manifest.coverageDescription);
    expect(hydrated.manifest.indexCheckedAt).toBe(dataset.manifest.indexCheckedAt);
    expect(hydrated.manifest.collectedAt).toBe(dataset.manifest.collectedAt);
    expect(hydrated.manifest.recordCount).toBe(dataset.manifest.recordCount);
    expect(hydrated.manifest.sectionCount).toBe(dataset.manifest.sectionCount);
    expect(hydrated.manifest.chapters).toHaveLength(dataset.manifest.chapters.length);

    for (let i = 0; i < dataset.manifest.chapters.length; i++) {
      const expected = dataset.manifest.chapters[i];
      const actual = hydrated.manifest.chapters[i];
      expect(actual).toEqual({
        chapter: expected.chapter,
        title: expected.title,
        sourceIndex: expected.sourceIndex,
        indexCheckedAt: expected.indexCheckedAt,
        recordCount: expected.recordCount,
        sectionCount: expected.sectionCount,
      });
    }
  });

  it('preserves all 30,434 records field-for-field, UTC medium sourceCheckedAt, and all 4 notices', () => {
    expect(hydrated.records).toHaveLength(dataset.records.length);

    for (let i = 0; i < dataset.records.length; i++) {
      const expected = dataset.records[i];
      const actual = hydrated.records[i];

      expect(actual.id).toBe(expected.id);
      expect(actual.section).toBe(expected.section);
      expect(actual.versionId).toBe(expected.versionId);
      expect(actual.title).toBe(expected.title);
      expect(actual.chapter).toBe(expected.chapter);
      expect(actual.chapterTitle).toBe(expected.chapterTitle);
      expect(actual.effectiveFrom).toBe(expected.effectiveFrom);
      expect(actual.effectiveTo).toBe(expected.effectiveTo);
      expect(actual.sourceUrl).toBe(expected.sourceUrl);
      expect(actual.headingMarker).toBe(expected.headingMarker ?? '');
      expect(actual.multipleEnactments).toBe(expected.multipleEnactments);
      expect(actual.effectiveDateIsPlaceholder).toBe(expected.effectiveDateIsPlaceholder);
      expect(actual.effectiveEndDateIsPlaceholder).toBe(expected.effectiveEndDateIsPlaceholder);
      expect(actual.hasConstitutionalWarning).toBe(expected.hasConstitutionalWarning);
      expect(actual.hasContingentEffectiveDate).toBe(expected.hasContingentEffectiveDate);
      expect(actual.contingentUntil).toBe(expected.contingentUntil);
      expect(actual.effectiveFromFootnote).toBe(expected.effectiveFromFootnote);
      expect(actual.headingSource).toBe(expected.headingSource);
      expect(actual.sourceSha256).toBeUndefined();

      expect(actual.sourceCheckedAt).toBe(new Date(expected.sourceCheckedAt).toISOString().slice(0, 10));
      expect(dateFormatter.format(new Date(actual.sourceCheckedAt))).toBe(
        dateFormatter.format(new Date(expected.sourceCheckedAt)),
      );

      expect(enactmentNotice(actual)).toBe(enactmentNotice(expected));
      expect(constitutionalNotice(actual)).toBe(constitutionalNotice(expected));
      expect(standaloneReprintNotice(actual)).toBe(standaloneReprintNotice(expected));
      expect(sourceDateNotice(actual)).toBe(sourceDateNotice(expected));
      expect(isEffective(actual, asOf)).toBe(isEffective(expected, asOf));
      expect(isUpcoming(actual, asOf)).toBe(isUpcoming(expected, asOf));
      expect(isContingent(actual, asOf)).toBe(isContingent(expected, asOf));
      expect(effectiveDateLabel(actual, asOf, false)).toBe(effectiveDateLabel(expected, asOf, false));
    }
  });
});

describe('hydrateClientDataset negative validation', () => {
  const validProjected = projectClientDataset(dataset, datasetHash);
  const cloneBase = (): ClientDataset => ({
    manifest: {
      ...validProjected.manifest,
      chapters: validProjected.manifest.chapters.map(c => ({ ...c })),
    },
    records: validProjected.records.map(r => ({ ...r })),
  });

  it('rejects null or non-object payloads', () => {
    expect(() => hydrateClientDataset(null, datasetHash)).toThrow('Missing dataset');
    expect(() => hydrateClientDataset('not-an-object', datasetHash)).toThrow('Missing dataset');
  });

  it('rejects wrong or missing datasetHash', () => {
    const base = cloneBase();
    expect(() => hydrateClientDataset(base, '0'.repeat(64))).toThrow('Invalid manifest');
    const missingHash = cloneBase();
    missingHash.manifest.datasetHash = '';
    expect(() => hydrateClientDataset(missingHash)).toThrow('Invalid manifest');
  });

  it('rejects truncated records (count mismatch and < 50)', () => {
    const mismatch = cloneBase();
    mismatch.records.pop();
    expect(() => hydrateClientDataset(mismatch, datasetHash)).toThrow('Invalid manifest');

    const tooFew = cloneBase();
    tooFew.records = tooFew.records.slice(0, 49);
    tooFew.manifest.recordCount = 49;
    expect(() => hydrateClientDataset(tooFew, datasetHash)).toThrow('Invalid manifest');
  });

  it('rejects invalid schemaVersion', () => {
    const badVersion = cloneBase();
    (badVersion.manifest as { schemaVersion: number }).schemaVersion = 1;
    expect(() => hydrateClientDataset(badVersion, datasetHash)).toThrow('Invalid manifest');
  });

  it('rejects unknown chapter in a record', () => {
    const unknownChapter = cloneBase();
    unknownChapter.records[0].section = '9999.001';
    expect(() => hydrateClientDataset(unknownChapter, datasetHash)).toThrow('Invalid source record');
  });

  it('rejects duplicate record IDs', () => {
    const duplicate = cloneBase();
    duplicate.records[1].section = duplicate.records[0].section;
    duplicate.records[1].versionId = duplicate.records[0].versionId;
    expect(() => hydrateClientDataset(duplicate, datasetHash)).toThrow('Invalid source record');
  });

  it('rejects invalid dates in records, chapters, and manifest', () => {
    const badRecordDate = cloneBase();
    badRecordDate.records[0].effectiveFrom = '2026-02-30';
    expect(() => hydrateClientDataset(badRecordDate, datasetHash)).toThrow('Invalid source record');

    const badMonthDate = cloneBase();
    badMonthDate.records[0].effectiveFrom = '2026-13-01';
    expect(() => hydrateClientDataset(badMonthDate, datasetHash)).toThrow('Invalid source record');

    const badManifestDate = cloneBase();
    badManifestDate.manifest.collectedAt = 'not-a-date';
    expect(() => hydrateClientDataset(badManifestDate, datasetHash)).toThrow('Invalid manifest');

    const badIndexDate = cloneBase();
    badIndexDate.manifest.indexCheckedAt = 'not-a-date';
    expect(() => hydrateClientDataset(badIndexDate, datasetHash)).toThrow('Invalid manifest');

    const badChapterDate = cloneBase();
    badChapterDate.manifest.chapters[0].indexCheckedAt = 'not-a-date';
    expect(() => hydrateClientDataset(badChapterDate, datasetHash)).toThrow('Invalid chapter provenance');
  });

  it('rejects sectionCount mismatch', () => {
    const badSectionCount = cloneBase();
    badSectionCount.manifest.sectionCount -= 1;
    expect(() => hydrateClientDataset(badSectionCount, datasetHash)).toThrow('Section count mismatch');
  });
});

describe('extractRuntimeCoverage notice parity against full data/coverage.json', () => {
  const extracted = extractRuntimeCoverage(coverage);
  const reviewedOverlaps = [
    ...coverage.delayedEnactments,
    ...coverage.reprintedEnactments,
    ...coverage.conflictingEnactments,
  ];
  const expectedProcedure = new Set(coverage.chapters.filter(c => c.category === 'procedure').map(c => c.chapter));

  it('matches runtimeCoverage export and procedureChapters exactly', () => {
    expect(extracted).toEqual(runtimeCoverage);
    expect(procedureChapters).toEqual(expectedProcedure);
  });

  it('has no section key collisions across overlap and contingent policies', () => {
    const overlapSections = new Set(reviewedOverlaps.map(p => p.section));
    expect(overlapSections.size).toBe(reviewedOverlaps.length);
    for (const c of coverage.contingentEnactments) {
      expect(overlapSections.has(c.section)).toBe(false);
    }
  });

  it('produces identical notices to full data/coverage.json for every record in public/data/statutes.json', () => {
    const expectedEnactmentNotice = (r: Dataset['records'][number]) => {
      if (!r.multipleEnactments) return undefined;
      return reviewedOverlaps.find(p => p.section === r.section)?.displayNotice
        ?? coverage.contingentEnactments.find(p => p.section === r.section)?.displayNotice
        ?? 'The Revisor prints both versions due to possible conflict. Read both official source pages.';
    };
    const expectedConstitutionalNotice = (r: Dataset['records'][number]) =>
      coverage.constitutionalWarnings.find(p => p.id === r.id)?.displayNotice;
    const expectedStandaloneNotice = (r: Dataset['records'][number]) =>
      coverage.standaloneReprints.find(p => p.id === r.id)?.displayNotice;
    const expectedSourceDateNotice = (r: Dataset['records'][number]) =>
      coverage.sourceDateNotes.find(p => p.id === r.id)?.displayNotice
      ?? (r.contingentUntil ? coverage.contingentEnactments.find(p => p.section === r.section)?.displayNotice : undefined);

    for (const r of dataset.records) {
      expect(enactmentNotice(r)).toBe(expectedEnactmentNotice(r));
      expect(constitutionalNotice(r)).toBe(expectedConstitutionalNotice(r));
      expect(standaloneReprintNotice(r)).toBe(expectedStandaloneNotice(r));
      expect(sourceDateNotice(r)).toBe(expectedSourceDateNotice(r));
    }
  });
});

describe('loadIndex(AsPlainObject) + extractIndexTerms search parity', () => {
  const builtIndex = buildIndex(dataset.records);
  const plainIndex = builtIndex.toJSON();
  const jsonIndex = JSON.stringify(plainIndex);

  const searchFromBuilt = createSearch(dataset.records, builtIndex);
  const searchFromJson = createSearch(dataset.records, loadIndex(jsonIndex));
  const searchFromPlain = createSearch(dataset.records, loadIndex(plainIndex), extractIndexTerms(plainIndex));

  const queries = [
    // Typo corrections
    'murdr',
    'assult',
    'murdre',
    'first degree murdr',
    'assult second degree',
    'kidnaping',
    // Prefix queries
    'homic',
    'assau',
    'landlor',
    'burgl',
    // Exact section queries
    '565.020',
    '§ 565.050',
    'RSMo 400.2-314',
    '565.400',
    // Topic & relatedMatches ordering
    'homicide',
    'first degree murder',
    'second degree assault',
    'security deposit',
    'driving while intoxicated',
    'child custody',
    'statute of limitations',
    'probate',
  ];

  it('produces identical search results and relatedMatches ordering across all 3 index paths', () => {
    for (const query of queries) {
      const expected = searchFromBuilt(query, asOf, true);
      const fromJson = searchFromJson(query, asOf, true);
      const fromPlain = searchFromPlain(query, asOf, true);

      expect(fromPlain).toEqual(expected);
      expect(fromJson).toEqual(expected);
    }
  });

  it('applies expected single-edit typo corrections', () => {
    expect(searchFromPlain('murdr', asOf).correction).toBe('murder');
    expect(searchFromPlain('assult', asOf).correction).toBe('assault');
    expect(searchFromPlain('murdre', asOf).correction).toBe('murder');
  });

  it('extracts non-empty index terms from AsPlainObject', () => {
    const terms = extractIndexTerms(plainIndex);
    expect(terms.length).toBeGreaterThan(5000);
    expect(terms).toContain('murder');
    expect(terms).toContain('assault');
  });
});

describe.skipIf(!existsSync('dist/assets') || !existsSync('dist/data/statutes.json'))('built dist/ artifact verification', () => {
  it('excludes editorial coverage fields from dist/assets/index-*.js', () => {
    const assetFiles = readdirSync('dist/assets').filter(f => /^index-.*\.js$/.test(f));
    expect(assetFiles.length).toBeGreaterThanOrEqual(1);
    for (const file of assetFiles) {
      const js = readFileSync(join('dist/assets', file), 'utf8');
      expect(js).not.toContain('sourceNotice');
      expect(js).not.toContain('requiredSourceNotices');
      expect(js).not.toContain('sourceOpening');
      expect(js).not.toContain('minimumVersions');
    }
  });

  it('keeps dist/data/statutes.json byte-for-byte identical to public/data/statutes.json', () => {
    const publicBytes = readFileSync('public/data/statutes.json');
    const distBytes = readFileSync('dist/data/statutes.json');
    expect(Buffer.compare(publicBytes, distBytes)).toBe(0);
  });

  it('emits a valid dist/data/statutes-client-*.json that hydrates cleanly', () => {
    const clientFiles = readdirSync('dist/data').filter(f => /^statutes-client-.*\.json$/.test(f));
    expect(clientFiles).toHaveLength(1);
    const parsed: unknown = JSON.parse(readFileSync(join('dist/data', clientFiles[0]), 'utf8'));
    const hydrated = hydrateClientDataset(parsed, datasetHash);
    expect(hydrated.records).toHaveLength(dataset.records.length);
    expect(hydrated.manifest.chapters).toHaveLength(dataset.manifest.chapters.length);
  });
});
