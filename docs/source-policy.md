# Source access and provenance

The primary source is the [Missouri Revisor of Statutes](https://revisor.mo.gov/). The [explicit chapter policy](coverage.md) covers Titles I–X, XIX, XXXVII and XXXVIII, plus Title XI Chapters 160–166. This collection does not depend on a third-party compilation. It stores statutory headings and source metadata, not generated summaries or interpretations.

## Acquisition

- Fresh requests ask intermediaries to revalidate cached responses with `Cache-Control: no-cache`; explicitly reused local cache entries retain their original timestamps.
- Identify requests as `ShowMeStatutes/0.1 (+https://github.com/edwardedmonds/showmestatutes.org)`.
- Fetch each configured chapter index first, then each enumerated section/version sequentially at least one second apart. Retry network failures at most twice with increasing delays.
- Check robots.txt before crawling; honor directives when present. On the initial collection that URL returned the HTML home page, not robots directives. The manifest records this observation; it is not a claim of blanket permission.
- Create a fresh cache directory by default. An explicitly supplied cache is a resumable snapshot; reused responses retain their original check time. Offline mode never fetches or advances timestamps.
- Reject unexpected hosts, non-success responses, changed/missing markup, truncated headings, wrong section IDs, incorrect version IDs or dates, duplicate index rows, duplicate dataset records, overlapping effective intervals, and record loss.
- An inconsistent index or individual response is preserved locally and retried at the exact same URL at most twice. Every replacement must pass the same checks. Persistent failures stop collection; offline validation never retries the network. Do not substitute another version to complete a scrape.

## Versions and dates

The chapter index includes multiple current/future versions for some sections. A generic OneSection link can open a future version first. Every collected link therefore includes both `section` and `bid`, and the response's navigation identity, heading and effective date must agree. When available, the source's All versions table supplies the exclusive end date.

Dated records use `effectiveFrom <= searchDate < effectiveTo` (or no upper bound if the source supplies none). Source dates explicitly marked as placeholders are retained as raw metadata with `effectiveDateIsPlaceholder: true`, excluded from date-based current/upcoming selection, and displayed in a separate contingent group. Search dates follow America/Chicago. Source intervals are source metadata, not a determination of which law governs a particular case. Historical date search is not offered because this is not a complete archive.

`sourceCheckedAt` is the retrieval time for the successful individual response. `chapters[].indexCheckedAt` is each chapter-index retrieval time; the top-level `indexCheckedAt` is the oldest index check, used for the freshness notice; `collectedAt` is the latest section or chapter-index check in the snapshot. `sourceSha256` fingerprints that exact HTML response. The generated search-index file has a separate `builtAt`; no publication timestamp is invented. Official heading footnote markers are retained separately from searchable heading text.

## Initial anomaly

One initial response for `565.030:33576` had the expected page identity and date, but its visible heading incorrectly referred to section 475.190. Collection stopped. A fresh retrieval through the source's version link and the generic section page both returned the correct trial-procedure heading, consistent with the chapter index. The rejected response was preserved as a regression fixture. It is never included in the dataset. This is why identity and heading checks cannot be replaced by HTTP success checks alone.

## Promotion and rollback

`npm run data:refresh` collects into a separate candidate, validates it, compares identities/semantic fields, runs Python and Vitest tests, and builds using the candidate via `STATUTES_DATASET`. It then replaces the single dataset/manifest file with a same-filesystem rename. Separate collection and refresh locks prevent concurrent runs within a checkout. An interrupted process cleans up its lock; after a forced termination, inspect the recorded process ID before removing a stale lock. Build output is a local artifact; the script does not publish.

Review `data/change-report.json` and the source links before committing. A vanished source record is a review event, even if it might be a legitimate repeal; promotion stops instead of guessing. Raw source caches are ignored and should be retained locally for diagnosing a failed run.

For rollback, restore `public/data/statutes.json` from a known validated Git commit, run validation/tests/build, and commit that restoration. GitHub Pages publication was authorized on November 12, 2026. Publish only a validated commit. Keep the previous hosted release in place if any new check fails. Never point hosting directly at an incomplete collection directory.

## Expansion source anomaly

The first response for `552.040:54313` carried the correct navigation identity and effective date but a heading for section 441.060. Collection stopped. A first exact-URL retry also had an unrelated heading. Three fresh requests with `Cache-Control: no-cache`—the exact URL, the same URL with the source's blank `hl` parameter, and the source's explicit version-selection link—all returned the same correct 552.040 heading and passed identity/date validation. Only that fresh exact-URL response entered the dataset. The first rejected raw response remains in the local cache, and its minimal heading/identity/date markup is a regression fixture. Neither body text nor an index snippet was substituted for the correct heading.

Additional expansion responses (including 570.150 and transportation section 302.170) had mismatched headings or navigation. Rejected HTML is retained in ignored `.rejected.json` files. Fresh, strictly validated responses replace these; apparent repeals in inconsistent responses are not imported or interpreted as law.

## Concurrent enactment exception

A source-documented pair of §590.1265 enactments has the same start date and no end date. The explicit policy records both version IDs and that date. The parser requires the official multiple-enactments and possible-conflict notices; validation requires the complete pair. The UI labels both, without deciding legal applicability. This exception does not allow arbitrary unresolved overlaps. See [coverage](coverage.md).

## Contingent enactment exception

The reviewed §301.287 pair is recorded separately in `contingentEnactments`. Source version `60471` explicitly labels 2099-01-01 as a placeholder; version `60726` carries 2026-08-28. Both pages carry the source notice about a contingent effective date and possible conflict. The parser requires those notices and the correct placeholder flag; both validators require the exact complete pair and unchanged dates. This is source metadata handling, not a determination that a condition has or has not been fulfilled. Unknown placeholder dates block collection.

Section 44.098 has a single listed contingent version rather than competing enactments. Its reviewed policy requires version `35640`, the 2099-01-01 placeholder and the official contingent-date footnote. Both validators distinguish its single-version status from the 301.287 pair; a contingent date alone does not imply multiple enactments.

## Delayed effective-date overlap

Section **27.117** lists versions `60466` (August 28, 2026) and `60727` (July 1, 2027), with no end date on either source page. The earlier page explicitly says both versions are printed due to a delayed effective date; the later page supplies its July 2027 effective-date note. The reviewed `delayedEnactments` policy requires both exact IDs, dates, notices and unchanged blank end dates.

Before July 2027, the later version appears only when upcoming versions are requested. From its source start date, both records satisfy their recorded intervals and are displayed with a delayed-effective-date notice. The application does not invent a supersession date or decide which version governs. This exception does not permit unreviewed overlaps.

## Constitutional warnings and reprinted versions

The collector preserves the Revisor's effective-date banner when it marks all or part of a version as unconstitutional, and explicit Revisor's notes stating that the section was declared unconstitutional. It does not infer this status from general discussion of court rulings in statutory text or annotations. Every such marker requires an explicitly reviewed identity, date and source notice in `constitutionalWarnings`; missing, added or changed markers stop collection. The browser validates the same policy and displays these versions in their own result group, with their official links and source dates. It does not infer whether the whole section or only part is affected, or which legal rule applies.

Six county-government section pairs in Chapters 56 and 67 have overlapping blank-ended intervals because the source reprints an earlier version after a court ruling while retaining the later, warned version. `reprintedEnactments` requires both exact versions, their dates, their multiple-enactment labels and each page's reviewed notice. No end date is invented. This policy is separate from the delayed and contingent enactment policies.

The existing cached response for §1.410 also carries the constitutional-warning banner. The county expansion added its previously omitted marker while retaining the original source-check date, response hash and all other record fields. This is a correction from the archived source, not a fresh retrieval of the earlier government collection.

The municipal batch adds five reviewed reprinted pairs: §79.130 (`3732` and `36191`), §94.270 (`4884` and `36196`), §99.825 (`51497` and `33552`), §99.830 (`51498` and `5146`), and §99.865 (`51499` and `33554`). The first version listed in each pair has the source warning; the second has the section 3.066 reprint notice. The Chapter 99 warnings are explicit Revisor's notes, without a constitutional-warning banner. The same strict policy and separate warning group apply.

The public-officer batch adds 19 warned Chapter 105 versions, all with source effective date August 28, 2018: §§105.503, 105.505, 105.525, 105.530, 105.533, 105.535, 105.537, 105.540, 105.545, 105.550, 105.555, 105.570, 105.575, 105.580, 105.583, 105.585, 105.590, 105.595 and 105.598. Every page carries the warning banner and a Revisor note citing Missouri National Education Association v. Missouri Department of Labor and Industrial Relations. The policy requires each exact identity, date and reviewed case notice. The chapter index lists only one version of each; historical rows on individual pages do not establish a reprinted replacement or expand this collection into a historical archive. These records stay in the separate warning group.

Section **105.1415:5715**, dated August 28, 2014, separately carries the source warning and a Calzone v. Koster note. It also has no reprinted partner in the chapter index and stays in the warning group.

Section **105.1155:51508**, dated August 28, 2022, carries an explicit Byrd v. State Revisor note without the warning banner. It also remains separately warned with no indexed replacement. The complete batch has **21 new warned versions**, bringing the combined total to 36 without changing the earlier 15 warned records.

## Election source exceptions

Title IX adds four reviewed reprinted pairs: §§116.155 (`57131` and `6318`), 116.160 (`57132` and `6319`), 116.190 (`57133` and `6324`), and 116.334 (`57134` and `6341`). The 2025 versions carry explicit Revisor notes citing Nicholson v. State of Missouri, et al.; the earlier versions carry section 3.066 reprint notices. All eight have blank source end dates. The four warned versions remain separate, and the earlier reprints keep their original dates. There are now 40 warned versions and 15 reviewed reprinted pairs in the combined snapshot.

Twelve Chapter 128 versions explicitly mark January 1, 2099 as a placeholder: §§128.345, 128.346, 128.348 and 128.471–128.479. Their source notes describe referendum conditions for H.B. 1, 2025. The first three have paired 2022 versions whose notices explain why both are printed; the nine remaining sections have only one version in the chapter index. The contingent policy records the exact IDs, dates and multiple-enactment status. Each version can require its own exact source notice, falling back to the shared notice only for existing policies that use one. No missing notice, unknown identity, changed date or invented end date is accepted.

The interface explains that the paired versions concern a referendum, rather than reusing the possible-conflict explanation from §301.287. All twelve placeholder versions stay outside current and upcoming groups, even for a date in or after 2099. The source notes are preserved as evidence; the application does not decide whether referendum conditions have since occurred. These additions bring the contingent total to 14.

## First taxation batch

Title X Chapters 135–141 add one reviewed reprinted pair: **140.170**, versions `51501` (August 28, 2022) and `6932` (August 28, 2015). The later page has an explicit Byrd, et al. v. State of Missouri, et al. Revisor note; the earlier page has the section 3.066 reprint notice. Both have the multiple-enactments label and blank end dates. The existing policy requires the exact identities, dates and notices, preserves both source links, and keeps the warned version outside ordinary current and upcoming groups. No parser or ranking change was needed. The combined snapshot has 41 warned versions and 16 reviewed reprinted pairs; the 14 contingent versions and 32 scheduled future versions are unchanged.

## Completing Title X

Chapters 142–155 add 622 indexed versions. Chapter 152 is explicitly reviewed as empty: the source has the correct chapter identity, whole-chapter navigation and Cross References block, but no section rows. The cross references to Chapter 137 remain navigation/context rather than imported Chapter 152 records. A source fixture verifies that the empty-index parser requires the reviewed structure. Earlier source timestamps and hashes are preserved when their cache entries are reused.

## First education batch

Chapters 160–166 were collected from explicit title and chapter indexes. The first Chapter 160 response contained 100 rows representing only 85 unique versions. The fresh replacement contained 101 unique versions, including 16 absent from the rejected response. The existing duplicate-row rejection prevented silent deduplication from hiding missing coverage. The rejected response and its retrieval time are preserved; the accepted response, not the rejected one, supplies index provenance. All seven accepted indexes were retrieved again after collection and compared by identity, date and URL. Earlier source checks retain their original timestamps and hashes.
