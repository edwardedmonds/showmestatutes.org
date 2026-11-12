# Expansion validation — November 12, 2026

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
