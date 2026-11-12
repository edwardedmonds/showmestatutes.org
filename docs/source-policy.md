# Source access and provenance

The primary source is the [Missouri Revisor of Statutes](https://revisor.mo.gov/). The [explicit chapter policy](coverage.md) covers Titles I–VII, XIX, XXXVII and XXXVIII. This collection does not depend on a third-party compilation. It stores statutory headings and source metadata, not generated summaries or interpretations.

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

The existing cached response for §1.410 also carries the constitutional-warning banner. This release adds its previously omitted marker while retaining the original source-check date, response hash and all other record fields. This is a correction from the archived source, not a fresh retrieval of the earlier government collection.

The municipal batch adds five reviewed reprinted pairs: §79.130 (`3732` and `36191`), §94.270 (`4884` and `36196`), §99.825 (`51497` and `33552`), §99.830 (`51498` and `5146`), and §99.865 (`51499` and `33554`). The first version listed in each pair has the source warning; the second has the section 3.066 reprint notice. The Chapter 99 warnings are explicit Revisor's notes, without a constitutional-warning banner. The same strict policy and separate warning group apply.
