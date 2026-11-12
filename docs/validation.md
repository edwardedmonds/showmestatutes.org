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
