# Roadmap progress

Based on the [original development roadmap](https://chatgpt.com/share/6af4cf71-767c-83e9-b2d1-51204450e788), recovered November 11, 2026.

## Milestone 0 — Define good results

Implemented: Chapter 565 pilot scope, 60-case pilot relevance benchmark plus an expanded cross-chapter benchmark, written ranking contract, exact-number and negative-result cases. The benchmark includes ordinary wording, abbreviations, word-order variations, misspellings, broad topics and degree distinctions. It is a development set, not an independent evaluation.

## Milestone 1 — Data foundation

Implemented: repeatable rate-limited Python collection, multi-chapter snapshot (see the dataset manifest for counts), full headings, version identity, exact source URLs, source hashes, effective intervals and separate check/build dates. Validation rejects partial data, duplicates, wrong headings/identities and overlaps. Snapshot promotion is gated and atomic. Current and future versions are retained separately.

## Milestone 2 — Relevance engine

Implemented: MiniSearch candidate retrieval with custom heading/alias ranking, exact citations, ordinal normalization, conservative spelling suggestions, offense/procedure distinction, broad-topic and related-section groups. Statutory body text is excluded. All 60 benchmark cases pass, with additional version and integrity regressions.

Outstanding validation: independent maintainer review of aliases/topic mappings and evaluation on additional held-out queries. Initial mappings have an implementation source-heading cross-check, not a legal-professional endorsement.

## Milestone 3 — Mobile interface

Implemented: responsive static interface, live heading search, separate result groups, exact-version source links, dates, coverage disclosure, upcoming-version toggle, scoped no-match state, keyboard navigation and visible focus. Desktop and 390px-wide browser checks passed.

Outstanding validation: verify accessibility with assistive technology and measure p95 search/render latency on a documented representative physical Android device. A narrow browser viewport is not a substitute for those checks.

## Milestone 4 — Expand and release

Development expansion authorized after the user tried the pilot: Chapters 540–552, 556–579, 589, 590, 595 and 600, explicitly enumerated in `data/coverage.json`. Added source provenance and minimum-count checks for every chapter, a chapter selector, four-digit section lookup and expanded benchmark cases. See [coverage and exclusions](coverage.md). The user subsequently authorized GitHub Pages publishing and the custom domain on November 12, 2026. Independent review and device/accessibility checks above remain outstanding validation work; publication does not imply these were completed. Do not claim all Missouri criminal-law coverage.

The manual source-refresh path remains gated and atomic. The GitHub Pages workflow validates data, runs parser/search tests and builds before uploading or deploying; pull requests only validate, and only main can publish. A failed check leaves the last deployed site intact. Source crawling is manual and is not run in the publishing workflow. The requested canonical host is `showmestatutes.org`, with `.com` forwarding to `.org`. See [deployment documentation](deployment.md) for setup and recovery details.

## Milestone 5 — Evidence-driven enhancements

Statewide heading coverage is now authorized and proceeding in reviewed title batches. The first batch adds Title XIX, Chapters 300–307 (transportation), alongside the criminal-law collection. The next completed batch adds the 29 chapter indexes in Titles I–V, with one- and two-digit chapter citations and explicit handling of a single contingent version and a source-documented delayed-effective-date overlap. The county-government batch adds all 22 chapter indexes in Title VI, bringing coverage to 100 of the 468 catalog chapter indexes checked. The municipal batch adds all 23 chapter indexes in Title VII, bringing the configured scope to 123. Title VIII adds all eight chapter indexes from 103 through 110, bringing the scope to 131. Title IX adds six election-law chapter indexes, bringing the scope to 137. Title X adds its 21 chapter indexes in two batches, bringing the scope to 158, including the reviewed empty Chapter 152. The first Title XI batch adds Chapters 160–166, bringing the scope to 165 chapter indexes. The remaining listed chapters from 167 through 186 are next. It also preserves the Revisor’s constitutional-warning banners and reviewed reprinted-version pairs, keeping warned versions outside ordinary current and upcoming results. The expansion also adds explicit handling of source-placeholder effective dates, keeping contingent versions separate from current and scheduled future results. See [the coverage plan](full-coverage-plan.md) for remaining scope and release gates.

Deferred: separate full-text mode, reviewed related-section expansion, bookmarks and version comparison. Historical date search needs sufficiently complete history. Offline support needs a snapshot/refresh policy. AI or semantic search requires evidence of improved relevance without invented statutory text or citations.
