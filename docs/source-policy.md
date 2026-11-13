# Source access and provenance

The primary source is the [Missouri Revisor of Statutes](https://revisor.mo.gov/). The [explicit chapter policy](coverage.md) covers Titles I–XXIII, XXXVII and XXXVIII. This collection does not depend on a third-party compilation. It stores statutory headings and source metadata, not generated summaries or interpretations.

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

## Pupils, personnel and school operations batch

Chapters 167–171 were enumerated from the official catalog and Title XI page. Their 341 listed versions were checked against their exact source pages; independent second index retrievals matched identities, dates and URLs. No new source exceptions required policy changes. Earlier record and chapter provenance remains unchanged. Reusing cached pages does not advance their source-check dates.

## Completion of Title XI

Chapters 172–178 and 180–186 were enumerated from the official catalog and Title XI page. The checked title lists exactly Chapters 160–186 excluding 179; all 26 are now represented. The 685 new source versions were checked against their exact official pages, and all fourteen new indexes matched independent second retrievals. Twelve initial section responses had a wrong heading, date, selected version, or missing content. Existing strict checks rejected them; a retry of each exact URL supplied a valid response. Both the rejected and accepted responses are preserved with their actual retrieval times. No new warning, contingent or scheduled-future policies were needed. Prior record and chapter provenance remains unchanged.

## First Title XII batch

Chapters 188–191 were enumerated from the official title and chapter indexes. Their 422 listed source versions were collected and checked against their exact official pages. All four indexes matched independent second retrievals. Section 190.088:9437 has an explicit constitutional-warning banner and a Revisor note naming Calzone v. Koster. The reviewed policy requires that exact notice; the version stays in the separate constitutional-warning group. Earlier record and chapter provenance is preserved; expansion does not advance previous source-check dates.

## Second Title XII batch

Chapters 192–195 were enumerated from the official title and chapter indexes. Their 310 listed source versions were collected and checked against their exact official pages, and all four indexes matched independent second retrievals. The reviewed §192.310 pair requires the 2014 version's constitutional warning and Calzone notice and the 1919 version's §3.066 reprint notice. Both pages list multiple enactments and blank end dates. The policy preserves those source distinctions without inferring legal applicability. Earlier record and chapter provenance remains unchanged.

## Third Title XII batch

The official catalog and chapter indexes enumerate 442 source versions in Chapters 196–199. All pages passed strict source parsing, and each index matched an independent retrieval after that chapter's pages were collected. Two initial responses had unrelated headings: §197.425:10410 and §198.644:51225. The existing bounded exact-URL retry recovered valid source pages; rejected and accepted evidence is retained locally. No parser exceptions or new source-warning policies were needed.

A resumable acquisition process now collects remaining catalog sources independently of publication. Provisional source files never promote themselves. Every release still requires explicit source review, the strict combined collector, regression tests, README and coverage updates, and a passing deployment workflow. Unfamiliar citation formats and empty indexes must be reviewed before inclusion; they are not silently omitted from the statewide target.

## Fourth Title XII batch

Chapters 201 and 204–207 add 240 individually checked source versions. No new source warnings, contingent dates, overlaps or reprinted pairs were needed. All five populated chapter indexes matched independent second retrievals. Earlier record and chapter provenance remains unchanged.

Chapter 203 is a reviewed empty index explicitly titled Air Conservation (Transferred to Chapter 643). Both index responses have the correct chapter identity, a whole-chapter link, the Cross References shell and no section rows. The policy sets minimumVersions to zero only alongside its explicit emptyIndexReviewedAt date. The parser continues rejecting missing page structure; the transfer does not fabricate sections or mark Chapter 643 as collected.

## Final Title XII batch

All 760 source versions in Chapters 208–211 and 213–215 passed individual source checks, with independent index rechecks. Ten records form five explicitly reviewed contingent-amendment pairs. The new `hasContingentEffectiveDate` marker distinguishes the five conditional 2007 amendments without changing their dates or incorrectly describing them as placeholders. Both validators require this marker to agree with the reviewed version policy. Search excludes these records from ordinary current/upcoming results and includes them in the existing contingent group. The exact notices are required by the parser, including §210.622's reference to §210.620 rather than silently normalizing it to §210.650.

The `indexHeadingExceptions` policy covers only **210.620:11394**. Its source page begins with compact text and omits the usual section heading; two rejected responses and the accepted response preserve this observation. The parser requires the exact complete heading from the matching official index row, reviewed date, section document title, specific opening paragraph, selected-version navigation, history and source notice. It rejects a changed or truncated index heading and altered source identity. The emitted record states `headingSource: chapter-index`, and the UI discloses the alternate heading source. Ordinary missing or mismatched headings still fail. The release change report includes both new semantic fields.

## Title XIII — Corrections

Chapters 217, 219 and 221 add 241 individually checked versions. All three chapter indexes matched strict independent rechecks. The review found three scheduled transitions, §§217.362, 217.690 and 217.760, whose earlier versions have explicit 2028-01-01 end dates. Each later version begins on that date. The exact source history intervals, footnote markers and raw Revisor notes remain preserved; the ordinary interval validator handles these pairs without a policy exception. Six source fixtures and regression tests cover source dates, exact identities and the transition boundary. There were no rejected source responses in this batch. Earlier record and chapter provenance remains unchanged.

## Title XIV — Roads and waterways

All 1,009 versions from twelve indexes passed strict individual source checks and independent index rechecks. Five initial responses for §§226.420, 226.961, 227.552, 227.603 and 236.440 were mismatched or incomplete; bounded exact-URL retries recovered valid pages. The worker also retained repeated rejected responses for the two previously unreviewed Chapter 238 warnings. Accepted and rejected evidence is archived locally.

Three newly reviewed reprinted pairs preserve all exact version identities, dates, blank end dates and official notices. The warning detector additionally recognizes a Revisor note that says a law was declared unconstitutional and explicitly identifies the **other printed version of this section** as current. That wording identifies the affected 2010 version of §226.033 without marking its 2003 reprint merely because its note also discusses the ruling. Exact reviewed notices are still required by policy; an unreviewed warning is rejected. Source fixtures test both sides of each pair and reject altered notices. Previous source records and provenance remain unchanged.

## Title XV — Lands and public water supply

The 611 individually checked versions from Chapters 241–250 passed strict source validation and independent index rechecks. An initial response for §242.698, source version 12907, lacked the expected heading. A bounded exact-URL retry recovered the correct “Appeal.” heading and August 28, 1961 effective date. Both responses remain in the local evidence archive. No parser or source-policy exceptions were needed for this batch; no dates, versions or identities were inferred.

## Title XVI — Conservation

All 626 source versions passed strict individual checks and all ten indexes matched independent rechecks. Chapter 255 is explicitly reviewed empty and transferred to Chapter 625. An initial §260.392 response displayed §208.935; a bounded exact-URL retry recovered the correct source version 54065 and August 28, 2023 effective date. Both responses remain archived.

The source review distinguishes the identical-amendment note in §260.295 from an unconstitutional-version warning. It also distinguishes conditional rulemaking language and contingent expiration notes from contingent effective dates. The Revisor's banners, selected histories and footnote markers remain authoritative for the stored metadata; no end dates are inferred from program sunsets or conditional expiration text. Section 260.1092 has a marker inside its body but no heading marker; no heading marker is added. Four source fixtures cover these distinctions, exact identities and dates. No parser changes were needed.

## Title XVII — Agriculture and animals

All 814 source versions passed strict individual checks and all twenty indexes matched independent rechecks. Chapter 280 is explicitly reviewed empty, retaining its Treated Timber Products title and cross-reference to Chapter 135. No repeal or transfer is inferred from the empty index.

Initial responses for §§262.700, 267.169 and 281.265 displayed unrelated sections; §281.101 lacked its heading. Bounded exact-URL retries recovered the correct identities and dates. Accepted and rejected responses remain archived. No new parser or source-policy exceptions were required. Existing footnote markers, source dates and version identities remain intact.

## Title XVIII — Labor

All 599 source versions passed strict individual checks and all ten indexes matched independent rechecks. Initial responses for §§285.512 and 287.223 displayed unrelated sections; bounded exact-URL retries recovered the correct pages. Ten additional responses were retained when the worker first encountered the five unreviewed Chapter 288 warning pages. Those responses pass after exact warning-policy review. All twelve rejected responses remain archived.

Five reviewed warning/reprint pairs preserve their exact Pestka notices, source identities, effective dates and blank history ends. The existing parser recognizes these warning banners and notes; no parser change was needed. Eleven source fixtures cover all ten versions plus §288.501. Its source note identifies a contingent effective date in subdivision (8), whose text conditions effectiveness of the entire section. The existing conditional-version flag keeps it outside ordinary current/upcoming results without inferring whether the condition occurred. The recorded date remains an ordinary source date, not a placeholder. Altered notices fail validation.

## Titles XX and XXI — Alcoholic beverages and public safety

All 630 source versions passed strict individual checks; all thirteen indexes matched independent rechecks. Six initial responses displayed unrelated sections or a constitutional provision; bounded exact-URL retries recovered the correct pages. Four further responses were retained when the worker encountered the two unreviewed fire-district warnings. Those pass with the reviewed exact warning policy. All ten rejected responses remain archived.

The two reviewed warning/reprint pairs preserve exact notices, identities, dates and blank history ends. Six actual-source fixtures cover the four pair versions and both bingo provisions, §§313.040–313.041. The latter's source note explicitly records the voter approval and resulting effective date, so the collection does not treat the condition as unresolved. No parser changes were needed. Altered warning/reprint notices fail validation.

## Title XXII — Occupations and professions

All 1,213 source versions passed strict checks and all 23 indexes matched independent rechecks. Nine rejected responses displayed wrong or missing content; bounded exact-URL retries recovered the correct pages. Four warning responses and four conditional-repeal responses pass after exact policy review. All seventeen rejected responses remain archived.

The collector accepts a direct repeal-heading element only for the two exact reviewed identities, requiring their complete repeal text, source title, selected version, source date, history rows and conditional notice. Both validators require the reviewed end dates and explicit placeholder-end flags. The equal start/end dates on the repeal entries are accepted only through that exact policy. Unknown, missing or altered flags, dates and repeal titles fail validation. Ordinary intervals retain their existing checks.

Fourteen actual-source fixtures cover both conditional repeal pairs, their condition section, three warned/reprinted versions, source notes recording fulfilled conditions, compact dates and the empty Chapter 342 index. Search tests also check dates at and beyond 2099 to ensure placeholders do not become calendar deadlines. The release check passes the candidate snapshot to Python as well as TypeScript tests; change reports include placeholder-end metadata.

## Title XXIII — Corporations and partnerships

All 1,104 source versions passed strict checks and all fourteen indexes matched independent rechecks. Nineteen rejected responses remain archived, including initially unreviewed warning/reprint pages and three missing, date-mismatched or wrong-page responses recovered by bounded exact-URL retries.

Annotation-only warnings are recognized only for five reviewed exact identities and complete source paragraphs. The thirteen Chapter 348 warning policies require their exact source notices and additional annotation or contingent-date paragraphs. Missing or altered required evidence fails collection. The date alone does not decide applicability, and a hypothetical rulemaking clause does not establish a constitutional ruling.

The standalone §348.253 reprint requires its exact source note, identity, source date, blank end and absence of a multiple-enactments banner. Both validators require one indexed version with those dates and no invented multiple-enactment flag. Its explanatory result paragraph uses the existing design. Twenty-four actual-source fixtures cover the eight pairs, five annotation warnings, standalone reprint and two ordinary rulemaking provisions.
