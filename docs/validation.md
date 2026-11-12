# First taxation batch — November 12, 2026

This release adds the first Title X batch. The separate filtering-design prototypes are not included; the production interface retains its existing design.

Chapters 135–141 add **683 distinct sections and 684 source versions**. The candidate contains **9,229 sections and 9,279 versions** across **144 chapter indexes**, with headings in 142 and two reviewed empty indexes. The catalog has 468 links, leaving 324 outside this collection. Title X Chapters 142–155 remain for the next batch; Chapter 152 needs explicit empty-index review.

All 684 new pages were retrieved sequentially at no more than one request per second. All seven indexes matched a second retrieval of identities, dates and source URLs. The normal strict collector rebuilt and validated the combined candidate from the source cache. All 8,595 earlier records and all 137 earlier chapter manifest entries are unchanged as complete objects, including check dates and hashes. The change report has 684 additions, zero removals and zero changes.

The acquisition audit recorded one exception: §140.170:51501 carries a Revisor note citing Byrd. Its indexed partner, 6932, carries a section 3.066 reprint notice. Both exact dates and blank end dates are preserved; the warned 2022 version remains separate from the 2015 reprint. The combined totals are 41 warned versions, 16 reviewed reprinted pairs, 14 contingent versions and 32 scheduled future versions.

All **453 TypeScript tests and 33 Python tests** passed, along with TypeScript checks and the production build. Thirty query cases were defined from official indexes before ranking evaluation. Additional regressions cover neighboring chapter citations and the warning/reprint pair. Two compact source fixtures require each exact notice and multiple-enactment marker.

The initial test run hit the five-second limit in the test that looks up every effective section. Exact-citation lookup scanned the entire collection for each query. It now uses a map from section number to source versions, while retaining the same chapter and date checks. A later full-suite run also exposed repeated full-collection scans in the test itself. Its expected identities are now derived once before checking every effective section; all expected versions are still compared, and the timeout is unchanged. Heading ranking is unchanged.

The candidate passed the gated refresh. The built site reports 9,229 headings. Browser checks confirmed that §140.170 shows the 2015 reprint separately from the warned 2022 version with exact source URLs; a Chapter 141 filter excludes both. A scoped search for payment of current taxes under protest finds §139.031. First-degree murder still prioritizes §565.020, and ArrowDown focuses its source-heading link. No horizontal overflow was observed at 320×740, and the long tax heading remained readable. No browser warnings or errors were observed. Physical-device performance and screen-reader testing remain outstanding.

The first deployment exposed a browser-cache mismatch: the new application could receive the prior dataset from the stable data URL and reject it. Data and index assets now also have snapshot-hash filenames, and each application build requests those matching files. Stable data URLs remain available for audits; index hash validation and the rebuild fallback remain in place.

Publication uses the validated snapshot through the GitHub Pages workflow. The workflow result and public assets must be verified after pushing; a passing local build alone does not establish deployment.

---

# Election expansion validation — November 12, 2026

## Scope and source checks

Title IX adds **six chapter indexes, 508 distinct sections and 515 source versions**, covering Chapters 115, 116, 122, 127, 128 and 130. Chapter 122 lists one section; Chapter 127 lists four. The combined snapshot contains **8,546 sections and 8,595 versions** across **137 configured chapter indexes**: 135 with headings and two reviewed empty indexes. The fresh catalog contains 468 chapter links, leaving 331 outside this collection. Title X, taxation and revenue, is next.

Every new source version was retrieved sequentially at no more than one request per second. All six indexes matched an independent second retrieval of their exact identities, dates and source URLs. The change report contains 515 additions, zero removals and zero changes. All 8,080 earlier records and all 131 earlier chapter manifest entries, including retrieval dates and response hashes, are unchanged as complete objects.

## Source warnings and versions

An acquisition audit cached the new pages and recorded 16 exceptions without creating a candidate. Every flagged identity was reviewed and matched against an explicit policy. The normal strict collector then rebuilt and validated the full candidate offline from the cached responses. No unresolved exception remained.

Four Chapter 116 pairs retain an earlier reprint alongside a warned 2025 version: §§116.155, 116.160, 116.190 and 116.334. The Revisor's Nicholson notes and section 3.066 reprint notices are required separately. Both source dates and blank end dates are retained. Warned versions remain outside ordinary current and upcoming groups.

Twelve Chapter 128 versions explicitly use 2099 placeholder dates: §§128.345, 128.346, 128.348 and 128.471–128.479. The first three are paired with 2022 versions; the rest are single indexed versions. The source's referendum notices differ between the paired versions, so the collector now supports a reviewed notice for each contingent version. Existing shared-notice policies remain supported. The UI uses a referendum explanation for these pairs, rather than the existing possible-conflict explanation for §301.287. No source condition is treated as fulfilled merely because a calendar date passes.

The combined snapshot has **40 warned versions, 15 reviewed reprinted pairs, 32 scheduled future versions and 14 contingent versions**. These are source classifications, not determinations of legal applicability.

## Tests and performance

All **421 TypeScript tests and 32 Python tests** passed, along with TypeScript checks and the production build. The 24 new query cases were defined from official indexes before ranking evaluation. Four additional search regressions cover neighboring citations, all four warning/reprint pairs, all twelve placeholder versions in 2026, 2099 and 2100 with upcoming versions enabled and disabled, chapter isolation, and the referendum explanation. Three Python tests use five compact source fixtures to require exact warning/reprint notices, version-specific referendum conditions, placeholder labels and the correct single/paired status. No ranking change was needed. These are development tests, not an independent legal-search evaluation.

The built dataset matches the promoted snapshot byte for byte, and the prebuilt index references its SHA-256 hash. The serialized index is **1,005,754 bytes**, up from 948,275. On local Linux with Node 22.22.2, construction took about 129 ms and loading plus search setup about 97 ms. Across the same 16 queries, with three warm-up passes and 25 measured runs each, p95 search times ranged from 0.21 to 16.67 ms; the earlier snapshot ranged from 0.59 to 17.47 ms in the comparison run. These timings exclude download, JSON parsing, validation and rendering; they are not physical mobile measurements.

## Browser checks and publication

The built site reports 8,546 section headings. Scoped searches find §115.279 for absentee-ballot applications, §127.030 for the redistricting comment portal and §130.057 for campaign-finance electronic reporting. Exact §116.155 shows the earlier reprint and separately warned 2025 version with their correct official URLs. Exact §128.345 shows its dated and contingent versions with the referendum notice; §128.471 appears only as contingent, without an invented multiple-enactments label. A Chapter 130 filter excludes that Chapter 128 result. First-degree murder still prioritizes §565.020, and ArrowDown focuses its source-heading link.

No horizontal overflow was observed at 320×740 or 390×740. The long congressional-district label and referendum notices remained readable. No browser warnings or errors were observed. Physical Android timing, screen-reader testing and independent alias/legal review remain outstanding.

Publication uses the validated snapshot through the GitHub Pages workflow. A passing local build alone does not verify deployment; the workflow result and public dataset must be checked after pushing.

---

# Public officers, bonds and records validation — November 12, 2026

## Scope and source checks

Title VIII adds **eight chapter indexes, 607 distinct sections and 607 source versions**, covering Chapters 103–110. The official title listing includes employee health plans and retirement in Chapters 103–104; this corrects the earlier roadmap's proposed starting point at Chapter 105. The combined snapshot contains **8,038 sections and 8,080 versions** across **131 configured chapter indexes**: 129 with headings and two reviewed empty indexes. The fresh catalog contains 468 chapter links, leaving 337 outside this collection. Title IX is next.

Every new source version was retrieved sequentially at no more than one request per second. All eight indexes matched an independent second retrieval of their exact identities, dates and source URLs. The change report contains 607 additions, zero removals and zero changes. All 7,473 earlier records, including retrieval dates and response hashes, are unchanged as complete objects.

## Source warnings and versions

Strict collection stopped at an unreviewed constitutional warning. A separate acquisition audit cached the remaining pages and recorded exceptions without creating a candidate. All 21 flagged identities were reviewed, added to the source policy and then passed through the normal strict collector in a full offline rebuild from the cached responses. No unresolved source exception remained.

Nineteen Chapter 105 versions dated August 28, 2018 carry a warning banner and a Revisor note citing Missouri National Education Association v. Missouri Department of Labor and Industrial Relations. Section 105.1415:5715 separately has a warning banner and Calzone note. Section 105.1155:51508 has a Byrd note without the banner. Each requires its exact identity, date and source notice. All remain outside ordinary current and upcoming results, with their official links available in the warning group. Historical rows on individual pages are not treated as indexed reprinted replacements.

The combined snapshot has **36 warned versions**, 32 scheduled future versions and two contingent versions. No new future or contingent versions were added. The 11 previously reviewed reprinted pairs are unchanged. These classifications preserve source evidence without deciding legal applicability.

## Tests and performance

All **393 TypeScript tests and 29 Python tests** passed, along with TypeScript checks and the production build. The 26 new query cases were defined from the official indexes before evaluating rankings. Three additional search regressions cover neighboring citations, chapter isolation, and all 21 warned versions with upcoming results both enabled and disabled. Two Python tests cover warning banners, exact case notices and a note-only warning, using three minimal source fixtures. No production parser or ranking changes were needed. These are development checks, not an independent legal-search evaluation.

The built dataset matches the promoted snapshot byte for byte, and the prebuilt index references its SHA-256 hash. The serialized index is **948,275 bytes**, up from 875,593. On local Linux with Node 22.22.2, construction took about 124 ms and loading plus search setup about 105 ms. Across the same 16 queries, with three warm-up passes and 25 measured runs each, p95 search times ranged from 0.18 to 12.66 ms; the earlier snapshot ranged from 0.52 to 12.33 ms in the comparison run. These timings exclude download, JSON parsing, validation and rendering; they are not physical mobile measurements.

## Browser checks and publication

The built site reports 8,038 section headings. Scoped searches find §103.005 for consolidated health care plans, §104.081 for highway patrol retirement age, and §109.180 for public-record inspection. Exact §§105.503, 105.1155 and 105.1415 appear only in the warning group with the expected official URLs. A Chapter 106 filter excludes the Chapter 105 warning. First-degree murder still prioritizes §565.020, and ArrowDown focuses its source-heading link.

No horizontal overflow was observed with 320×740 and 390×740 viewport overrides. No browser warnings or errors were observed. Physical Android timing, screen-reader testing and independent alias/legal review remain outstanding.

Publication uses the validated snapshot through the GitHub Pages workflow. A passing local build alone does not verify deployment; the workflow result and public dataset must be checked after pushing.

---

# Municipal expansion validation — November 12, 2026

## Scope and source checks

Title VII adds **23 chapter indexes, 1,808 distinct sections and 1,813 source versions**. The combined snapshot contains **7,431 sections and 7,473 versions** across **123 configured chapter indexes**: 121 with headings and two reviewed empty indexes. The fresh catalog contains 468 chapter links, leaving 345 outside this collection. Title VIII is next.

Every new source version was retrieved sequentially at no more than one request per second. All 23 new indexes matched an independent second retrieval of their exact version identities, dates and URLs. The change report contains 1,813 additions, zero removals and zero changes. All 5,660 earlier records, including source-check dates and hashes, are unchanged as complete objects.

## Source warnings and versions

Five newly reviewed reprinted pairs preserve both official versions and their blank end dates: §§79.130, 94.270, 99.825, 99.830 and 99.865. The first two have warning banners; the three Chapter 99 versions instead have explicit Revisor notes declaring the section unconstitutional. The exact identities, dates and notices are required by the source policy. Section 79.135 has a warning but no indexed reprint; it remains a warning-only result without an invented replacement.

Strict collection initially stopped at unreviewed source exceptions. After review, the normal collector rebuilt and validated the full candidate offline from the cached responses with no unresolved exceptions. The combined snapshot contains 15 warned versions, 11 reviewed reprinted pairs, 32 scheduled future versions and two contingent versions. These distinctions preserve source evidence without deciding legal applicability.

## Checks and performance

All **364 TypeScript tests and 27 Python tests** passed, together with TypeScript checks and the production build. The 34 municipal query cases were defined from official indexes before ranking evaluation. Four additional search/data regressions cover exact citations, chapter isolation, all five reprinted pairs and the warning-only section. Two new Python tests cover the source warning and reprint notices. No search ranking or production parser changes were needed. These remain development checks, not independent legal-search evaluation.

The production dataset matches the promoted snapshot byte for byte, and the prebuilt index references its SHA-256 hash. The serialized index is 875,593 bytes, up from 686,643 bytes. On local Linux with Node 22.22.2, construction took about 155 ms and loading plus search setup about 174 ms. Across 16 queries with three warm-up passes and 25 measured runs each, p95 search times ranged from 0.23 to 10.23 ms; the earlier snapshot ranged from 0.14 to 8.70 ms in the same benchmark. These measurements exclude download, JSON parsing, validation and rendering and are not physical mobile results.

## Browser checks and publication

The built site shows all 7,431 section headings. Zoning districts finds §89.030 within Chapter 89; housing authority prioritizes §99.040 within Chapter 99; industrial development finds §§100.040 and 100.020 within Chapter 100. Exact §§79.130 and 99.825 show reprints and warned versions separately with the expected official URLs. Section 79.135 appears only in the warning group, and a Chapter 89 filter excludes it. Existing first-degree murder lookup still prioritizes §565.020. ArrowDown focuses the first source-heading link.

No horizontal overflow was observed with 320×740 and 390×740 viewport overrides. No browser warning or error logs were observed. Physical Android timing, screen-reader testing and independent alias/legal review remain outstanding.

Publication uses the validated snapshot through the GitHub Pages workflow. A passing local build alone does not verify deployment; the workflow result and public dataset must be checked after pushing.

---

# County expansion validation — November 12, 2026

## Scope and source checks

Title VI adds **22 chapter indexes, 1,943 distinct sections and 1,949 source versions**. The combined snapshot contains **5,623 sections and 5,660 versions** across **100 configured chapter indexes**: 98 with headings and two reviewed empty indexes. The fresh catalog contains 468 chapter links, leaving 368 outside this collection. Title VII is next.

Every new source version was retrieved sequentially at no more than one request per second. All 22 new indexes matched an independent second retrieval of their exact version identities, dates and URLs. No source responses were rejected in this batch. The change report contains 1,949 additions, zero removals and one correction: the previously omitted constitutional-warning marker on §1.410. Its original source-check date, hash and all other fields remain unchanged; the other 3,710 earlier records are unchanged as objects.

## Source warnings and versions

Nine versions have reviewed constitutional warnings. Seven carry the effective-date banner; §67.1431:51494 and §67.1471:51495 instead carry explicit Revisor's notes declaring the section unconstitutional. General mentions of court rulings in body text do not establish this marker. Each warning requires its exact identity, date and source notice, and appears outside ordinary current, related and upcoming results.

Six reprinted section pairs retain both official versions and their blank end dates. Their exact identities, dates and notices are required; the site does not invent supersession dates. Section 67.320 additionally displays the Revisor's qualification that the 2014 language from S.B. 621 remains current because that bill was not addressed in the cited case. The warning group is not a list of wholly invalid statutes.

The snapshot contains 32 scheduled future versions and two contingent versions at collection time. The initial collector had loaded the earlier parser and correctly refused the unresolved §56.067 overlap. After reviewing the source exceptions, the updated parser successfully rebuilt and validated the entire candidate offline from the exact cached responses.

## Checks and performance

All **326 TypeScript tests and 25 Python tests** passed, along with TypeScript checks and the production build. The 36 new county query cases were defined from source indexes before ranking evaluation. Seven additional search/data regressions cover chapter boundaries, warning separation, exact citations, reviewed reprints and source qualifications. The existing relevance expectations were retained without ranking changes. These are development tests, not an independent legal-search evaluation.

The production dataset matches the promoted snapshot byte for byte, and the prebuilt index references its SHA-256 hash. The serialized index is 686,643 bytes, up from 467,494 bytes. On local Linux with Node 22.22.2, index construction took about 103 ms and loading plus search setup took about 69 ms. Across 16 queries with three warm-up passes and 25 measured runs each, p95 search times ranged from 0.26 to 10.25 ms. The earlier snapshot ranged from 0.07 to 4.72 ms. These measurements exclude download, JSON parsing, validation and rendering; they are not mobile performance results.

## Browser checks and release

Home-based-work searches find both §64.008 and §65.710 and respect chapter filtering. Exact §67.1431 exposes the reprinted version and the warned version with separate source links. Sections 67.320, 67.2300 and 1.410 show source warnings; §67.320 includes its qualification. Existing murder, contingent-date and delayed-date cases still behave correctly. Upcoming versions remain optional. Padded §046.010 is rejected, and ArrowDown focuses the first source link.

No horizontal overflow was observed at 320×740 or 390×844. No browser warning or error logs were observed. Physical Android timing, screen-reader testing and independent alias/legal review remain outstanding.

The [county release workflow](https://github.com/edwardedmonds/showmestatutes.org/actions/runs/43281766740) for `67ce85d` passed checks and deployment. Public HTML, data, JavaScript, CSS and license notices matched the validated build byte for byte, and the hosted index referenced the same dataset hash. After the account rename to `edwardedmonds`, Pages retains the `showmestatutes.org` custom domain and GitHub Actions source. HTTPS certificate validation now passes and Enforce HTTPS is enabled. HTTP, `www.org`, `.com` and `www.com` resolve to the canonical HTTPS site. The `www.org` CNAME was updated to `edwardedmonds.github.io` and independently confirmed through public DNS. This resolves the certificate issue recorded in the earlier release notes below.

---

# Government expansion validation — November 12, 2026

## Scope and source checks

Titles I–V add **29 chapter indexes, 1,493 distinct sections and 1,494 source versions**. The combined snapshot contains **3,680 sections and 3,711 versions** across **78 configured chapters**: 76 with headings and two reviewed empty indexes. The fresh official catalog contains 468 distinct chapter links, leaving 390 catalog chapters outside this snapshot. This is heading coverage of the named titles, not statewide completion.

Every new version was individually retrieved, with at most one source request per second and robots checking. All 29 new indexes were fetched again after collection; their identities and dates matched. The change report has 1,494 additions, zero removals and zero changes. All 2,217 earlier record objects, including their source-check dates and hashes, are unchanged.

One response for 30.860:717 instead contained a heading for 278.150. It was rejected, retained in the ignored raw cache, and recovered by a bounded exact-URL retry. No substitute heading or version entered the dataset.

## Dates and citations

The browser validator now accepts one- and two-digit chapter numbers verbatim. Tests distinguish 1.010 from 10.010 and reject padded or shortened guesses. Every effective section in the full combined collection is checked by exact citation.

Section 44.098 has one source-placeholder version. Its explicit policy requires the exact identity, date and contingent-date footnote, without inventing competing enactments. It never automatically becomes current or scheduled future in 2099 or later.

Section 27.117 has a source-documented delayed-effective-date pair with blank end dates. Each version requires its own official notice. The earlier interval remains unchanged; the later version stays upcoming until July 1, 2027. Both are retained after that date with a delayed-version notice, rather than inventing an end date. The snapshot contains 32 scheduled future versions and two contingent versions at collection time.

## Checks

All **283 TypeScript tests and 19 Python tests** passed, together with TypeScript checks and the production build. The 38 new government query cases were defined from the official indexes before ranking evaluation; four additional regressions cover short citations, chapter separation, the single contingent version and the delayed pair. All prior relevance expectations were retained. These are development benchmarks, not an independent legal or held-out evaluation.

The production dataset exactly matches the promoted snapshot and its prebuilt index references the same dataset hash. The build includes the project MIT license and dependency notices in `licenses.txt`; the locally served file matched the built file byte for byte.

## Browser checks and limits

The State bird example prioritizes 10.010. Exact 1.010 resolves without padding; 01.010 produces no match. Section 44.098 appears in the contingent group without an invented multiple-enactments warning. Section 27.117 shows its current version and delayed-date notice, with the July 2027 version shown when upcoming versions are enabled. Chapter filtering excludes unrelated results, first-degree murder still prioritizes 565.020, and ArrowDown focuses the first source link.

No horizontal overflow was observed at 320×740 or 390×844. The footer exposes the license-notice link, and a fresh preview recorded no browser warning or error logs. The preview server was restarted after it exited during the license-link check; the license file was independently verified over local HTTP.

The [release workflow](https://github.com/edwardedmonds/showmestatutes.org/actions/runs/43272598891) for `fadfcc0` passed checks and deployment. Public HTTP responses for HTML, data, JavaScript, CSS and license notices matched the validated build; the hosted index referenced the same dataset hash. HTTPS still failed hostname validation.

Physical Android measurements, assistive-technology testing and independent alias/legal review remain outstanding. A successful application deployment does not establish working public HTTPS.

---

# Transportation expansion validation — November 12, 2026

## Scope and source checks

The combined collection covers 49 explicit chapter indexes in Titles XIX, XXXVII and XXXVIII: 47 chapters with headings and the two reviewed empty indexes (560 and 564). The transportation batch adds 954 distinct sections and 955 source versions across Chapters 300–307, bringing the totals to **2,187 sections and 2,217 source versions**. Every new source version was retrieved and parsed individually. All eight new indexes were retrieved a second time; their version identities and dates matched the collected indexes.

The change report contains 955 additions, zero removals and zero changes to earlier records. All 1,262 earlier source records, including their source-check dates and hashes, are unchanged as objects. This expansion reused their explicit source cache and does not claim a fresh source retrieval for those chapters.

Wrong-heading responses for 302.170 and 305.505 were rejected and recovered through bounded exact-URL retries. Rejected responses remain in the ignored local cache. The source-placeholder 2099 date for 301.287 is explicitly flagged as contingent, excluded from automatic date-based activation, and shown separately with the official conflict notice. Both reviewed versions remain linked. The snapshot has 31 scheduled future versions and one contingent version at the check date.

## Automated checks and relevance

All **241 TypeScript tests and 15 Python tests** passed, along with TypeScript checks and the production build. The new transportation suite includes 30 query cases plus scope, chapter-isolation and contingent-date regressions. Every effective section is checked by exact citation against the combined dataset. Prior criminal-law benchmarks continue to pass.

The first combined run caught two relevance issues: a known “speeding” topic was corrected to “seeding”, and “rent security deposit” matched unrelated vehicle-finance headings after dropping “rent”. Reviewed topic terms now participate in the spelling vocabulary. All substantive query words must occur within one heading or alias, preserving query meaning across a broader collection. The benchmark expectations were retained.

These are development benchmarks, not an independent held-out evaluation or legal review.

## Browser verification

The production build passed desktop and narrow-screen checks at 320×740 and 390×844. Seatbelt lookup prioritizes 307.178; speeding returns the two reviewed speed-limit headings; reordered “security deposit rent” has no close match in this scope. Exact 301.3183 resolves the four-digit citation, and first-degree murder still prioritizes 565.020. The 301.287 lookup shows the dated version plus a separate contingent group even with upcoming versions hidden, without presenting 2099 as a scheduled start date.

Chapter filtering excludes out-of-scope contingent records and keeps right-of-way results in Chapter 304. ArrowDown focuses the first source-heading link. Neither narrow viewport overflowed horizontally, and no browser warnings or errors were observed. The mobile scope label stacks to accommodate the broader coverage.

## Limits

Physical Android timing, assistive-technology testing and independent alias/legal review remain outstanding. This is heading coverage of the named titles, not statewide coverage, a full-text index or a historical archive. The existing domain certificate issue is separate from application validation; a successful build or deployment does not establish working public HTTPS.

---

# Earlier criminal-law expansion — November 12, 2026

## Scope and source checks

The explicit scope is 41 chapter indexes across Titles XXXVII and XXXVIII, with headings in 39 chapters and reviewed empty indexes in Chapters 560 and 564. Every included version is independently parsed from its exact official source URL. All 41 indexes were retrieved a second time and compared before release.

The search benchmark exposed an inconsistent initial Chapter 574 response: six duplicated rows replaced six other sections. The fresh index restored the missing sections, including §574.010. The collector now rejects every duplicate index row and retries the exact source URL at most twice. Persistent source inconsistencies block promotion. Rejected responses remain in the ignored local cache.

The only concurrent source intervals are the two explicit §590.1265 enactments. Both official pages state that both are printed due to possible conflict. The policy records the exact pair and date; results label both instead of resolving applicability. All other unresolved overlaps fail validation.

## Automated checks

The suite contains 206 TypeScript tests: the original 60 Chapter 565-scoped queries, 11 original regressions, 71 expanded queries, 58 unambiguous pilot expectations checked across the full collection, and 6 coverage/version/integrity tests. The Python suite contains 13 parser/collection regressions, including actual wrong-heading and wrong-version responses, complete chapter indexes, strict empty chapters, duplicate rejection, bounded retry behavior, collection locking, and the concurrent-enactment notice.

All 206 TypeScript tests and all 13 Python tests passed, as did TypeScript checks and the production build. The promoted snapshot contains 1,262 unique source versions, 1,233 sections and 31 future versions at collection time. The original benchmark is a development set; it is not an independent held-out evaluation.

## Browser verification

Production-build checks passed in the in-app browser: stealing prioritizes §570.030; the Chapter 595 filter keeps results in that chapter; exact §590.1040 resolves its four-digit citation; §590.1265 shows both enactments with their notices and distinct source links; §565.050 separates the current version from July 2027; §999.999 shows a scoped no-match message; ArrowDown moves focus to the result link. At 390×844 and 320×740, the page has no horizontal overflow. No browser warnings or errors were observed.

## Limits

No physical Android p95 timing, screen-reader audit or independent legal/alias review has been performed. Heading search excludes statutory body text and laws outside the stated titles; the collection is not a complete historical archive. Public publishing was authorized after the pilot trial. GitHub Actions and DNS/certificate readiness are separate from local test results; do not treat a successful local build as proof that the domain is live.
