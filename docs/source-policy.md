# Source access and provenance

The primary source is the [Missouri Revisor of Statutes](https://revisor.mo.gov/main/OneChapter.aspx?chapter=565). This pilot does not depend on a third-party compilation. It stores statutory headings and source metadata, not generated summaries or interpretations.

## Acquisition

- Identify requests as `ShowMeStatutes/0.1 (+https://github.com/deths74r/show-me-statutes)`.
- Fetch the chapter index first, then each enumerated section/version sequentially at least one second apart. Retry network failures at most twice with increasing delays.
- Check robots.txt before crawling; honor directives when present. On the initial collection that URL returned the HTML home page, not robots directives. The manifest records this observation; it is not a claim of blanket permission.
- Create a fresh cache directory by default. An explicitly supplied cache is a resumable snapshot; reused responses retain their original check time. Offline mode never fetches or advances timestamps.
- Reject unexpected hosts, non-success responses, changed/missing markup, truncated headings, wrong section IDs, incorrect version IDs or dates, duplicate records, overlapping effective intervals, and record loss.
- Source validation failures stop collection. Do not substitute another version to complete a scrape.

## Versions and dates

The chapter index includes multiple current/future versions for some sections. A generic OneSection link can open a future version first. Every collected link therefore includes both `section` and `bid`, and the response's navigation identity, heading and effective date must agree. When available, the source's All versions table supplies the exclusive end date.

Records use `effectiveFrom <= searchDate < effectiveTo` (or no upper bound if the source supplies none). Search dates follow America/Chicago. Source intervals are source metadata, not a determination of which law governs a particular case. Historical date search is not offered because this is not a complete archive.

`sourceCheckedAt` is the retrieval time for the successful individual response. `indexCheckedAt` is the chapter-index retrieval time; `collectedAt` is the latest individual source check in the snapshot. `sourceSha256` fingerprints that exact HTML response. The generated search-index file has a separate `builtAt`; no publication timestamp is invented. Official heading footnote markers are retained separately from searchable heading text.

## Initial anomaly

One initial response for `565.030:33576` had the expected page identity and date, but its visible heading incorrectly referred to section 475.190. Collection stopped. A fresh retrieval through the source's version link and the generic section page both returned the correct trial-procedure heading, consistent with the chapter index. The rejected response was preserved as a regression fixture. It is never included in the dataset. This is why identity and heading checks cannot be replaced by HTTP success checks alone.

## Promotion and rollback

`npm run data:refresh` collects into a separate candidate, validates it, compares identities/semantic fields, runs Python and Vitest tests, and builds using the candidate via `STATUTES_DATASET`. It then replaces the single dataset/manifest file with a same-filesystem rename. A lock prevents concurrent refreshes. Build output is a local artifact; the script does not publish.

Review `data/change-report.json` and the source links before committing. A vanished source record is a review event, even if it might be a legitimate repeal; promotion stops instead of guessing. Raw source caches are ignored and should be retained locally for diagnosing a failed run.

For rollback, restore `public/data/statutes.json` from a known validated Git commit, run validation/tests/build, and commit that restoration. Once deployment is separately authorized, publish only that validated commit. Keep the previous hosted release in place if any new check fails. Never point hosting directly at an incomplete collection directory.
