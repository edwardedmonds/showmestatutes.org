# Roadmap progress

Based on the [original development roadmap](https://chatgpt.com/share/6af4cf71-767c-83e9-b2d1-51204450e788), recovered November 11, 2026.

## Milestone 0 — Define good results

Implemented: Chapter 565 pilot scope, 60-case relevance benchmark, written ranking contract, exact-number and negative-result cases. The benchmark includes ordinary wording, abbreviations, word-order variations, misspellings, broad topics and degree distinctions. It is a development set, not an independent evaluation.

## Milestone 1 — Data foundation

Implemented: repeatable rate-limited Python collection, 59-section/72-version snapshot, full headings, version identity, exact source URLs, source hashes, effective intervals and separate check/build dates. Validation rejects partial data, duplicates, wrong headings/identities and overlaps. Snapshot promotion is gated and atomic. Current and future versions are retained separately.

## Milestone 2 — Relevance engine

Implemented: MiniSearch candidate retrieval with custom heading/alias ranking, exact citations, ordinal normalization, conservative spelling suggestions, offense/procedure distinction, broad-topic and related-section groups. Statutory body text is excluded. All 60 benchmark cases pass, with additional version and integrity regressions.

Remaining release gate: independent maintainer review of aliases/topic mappings and evaluation on additional held-out queries. Initial mappings have an implementation source-heading cross-check, not a legal-professional endorsement.

## Milestone 3 — Mobile interface

Implemented: responsive static interface, live heading search, separate result groups, exact-version source links, dates, coverage disclosure, upcoming-version toggle, scoped no-match state, keyboard navigation and visible focus. Desktop and 390px-wide browser checks passed.

Remaining release gate: verify accessibility with assistive technology and measure p95 search/render latency on a documented representative physical Android device. A narrow browser viewport is not a substitute for those checks.

## Milestone 4 — Expand and release

Not released. Do not claim all criminal-law coverage. Once pilot review gates pass, choose and explicitly enumerate the next core criminal-code chapters, add benchmark cases before importing them, and include selected procedure/cross-chapter provisions as reviewed expansions.

Offline CI validation/build is in place; a manual refresh path is implemented. Scheduled source updates, deployment, GitHub Pages, custom domains and DNS remain unconfigured. The user explicitly deferred publishing and DNS. A future publishing workflow must preserve the last validated release on fetch, validation, test or build failure and expose source freshness and a manual recovery path.

## Milestone 5 — Evidence-driven enhancements

Deferred: statewide heading coverage, separate full-text mode, reviewed related-section expansion, bookmarks and version comparison. Historical date search needs sufficiently complete history. Offline support needs a snapshot/refresh policy. AI or semantic search requires evidence of improved relevance without invented statutory text or citations.
