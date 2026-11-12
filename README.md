# Show Me Statutes

Find Missouri statutes without knowing the section number. Independent, heading-first search with links to official sources.

## Criminal, procedure and transportation coverage

The collection covers the chapter indexes in Missouri Revisor **Titles XIX, XXXVII and XXXVIII**: Chapters **300–307, 540–552, 556–579, 589, 590, 595 and 600**. The transportation expansion was collected November 12, 2026; the earlier criminal-law source responses retain their original check dates. It contains **2,187 distinct sections and 2,217 source versions** across 47 chapters with headings, plus two explicitly empty indexes. The dataset manifest contains each chapter's source-check date. It preserves complete official headings, source IDs, effective intervals and response hashes, and separates upcoming versions from those effective on the search date.

The chapter selector searches across the collection or narrows to one chapter. Chapters 560 and 564 currently have empty source indexes; the coverage disclosure records them explicitly. [Detailed coverage and exclusions](docs/coverage.md) explains the scope and source-specific handling.

- “first degree murder,” “1st degree murder,” “murder 1,” and “frist degree murdr” lead to § 565.020.
- “first degree murder trial procedure” prioritizes § 565.030.
- “DWI,” “theft,” and “self defense” use documented common-name aliases.
- Transportation headings cover traffic, registration, licensing, financial responsibility, equipment, watercraft and aviation. Chapter 300 is the Model Traffic Ordinance, not a collection of adopted local ordinances.
- Exact section lookup supports three- and four-digit suffixes and never silently corrects a section number.
- A source-placeholder effective date is labeled as contingent, never treated as a scheduled future start.
- Every result shows its actual chapter, and the chapter filter applies to all result groups.
- Related procedures and broader topics have their own result group.
- Body-text mentions do not participate in heading search.
- Search runs in the browser; no accounts, analytics, paid backend, or AI service.

**This is a development collection.** It does not yet cover all Missouri statutes or all historical versions. [Statewide heading coverage](docs/full-coverage-plan.md) is proceeding in reviewed batches. Independent alias review and performance testing on a representative physical Android device remain outstanding validation work. The transportation release was deployed to GitHub Pages on November 12, 2026; see the dated status below and [deployment setup](docs/deployment.md).

## Release and validation status

As checked on **November 12, 2026**:

- The [transportation release](https://github.com/deths74r/show-me-statutes/actions/runs/43175324277) passed validation and deployed successfully. It added **954 sections**, bringing the collection to **2,187 sections**.
- **241 TypeScript tests and 15 Python tests** passed, along with TypeScript checks and the production build. [Validation notes](docs/validation.md) record source checks, browser checks and remaining limitations.
- The deployed HTML, dataset and application assets at `showmestatutes.org` matched the release over HTTP. HTTPS still returned a certificate hostname mismatch at that check; secure-domain readiness remains unverified. See [deployment setup and recovery](docs/deployment.md).
- Next: continue the [statewide heading coverage plan](docs/full-coverage-plan.md) in reviewed batches, preserving source provenance and checking search relevance after each expansion.

Update this README alongside changes to coverage, setup, validation, deployment status and licensing. Keep status checks dated and distinguish a successful application deployment from working public HTTPS.

## Run locally

Use Node.js 22.12+ in the 22.x series (tested with 22.22.2).

```sh
npm ci
npm run dev
```

```sh
npm test         # Pilot and expanded relevance benchmarks, version and integrity regressions
npm run check    # TypeScript checks
npm run build    # Validate data, prebuild MiniSearch index, and build dist/
npm run preview  # Preview the static production build
```

The Vite development server serves a prebuilt heading index. If a browser receives a missing or mismatched index, it can rebuild from the validated snapshot. Relative asset paths keep the build portable to static hosts and project subpaths.

## Data preparation

Python 3.11+ and Beautiful Soup are needed only for collection and source validation; website users need only a browser.

```sh
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r requirements.txt
npm run data:validate
python3 -m unittest discover -s tests -p 'test_*.py'
npm run data:refresh
```

Refresh creates a new source cache, collects sequentially at no more than one request per second, validates all versions, writes a change report, runs Python and search tests, and builds the candidate. Only then does it atomically replace the local dataset. It does not commit, push, schedule, or publish anything. A failure leaves the previously validated source dataset intact.

For collection-only review or resuming an interrupted run:

```sh
python3 scripts/collect.py --cache data/raw/my-review
# Reparse the exact cached responses, retaining their original check timestamps:
python3 scripts/collect.py --cache data/raw/my-review --offline
# Promote the candidate only after tests/build pass:
npm run data:refresh -- --candidate data/candidate.json
```

Inspect `data/change-report.json` before committing updates. Record loss always blocks promotion and requires investigating the source and explicitly updating the coverage policy. Raw responses and temporary candidates are ignored by Git.

## Structure

- `src/search.ts`: MiniSearch candidates, normalization, conservative spelling suggestions and ranking
- `src/data.ts`: schema/interval checks and version selection
- `src/main.ts`, `src/style.css`: accessible responsive search interface
- `data/coverage.json`: explicit chapter policy and minimum-count validation
- `data/aliases.json`: source-checked aliases, separate topic mappings and related sections
- `public/data/statutes.json`: versioned source records plus dataset manifest
- `scripts/collect.py`: rate-limited collection and strict source validation
- `scripts/refresh.mjs`: validation/build gate and atomic snapshot promotion
- `tests/queries.json`, `tests/expansion-queries.json`, `tests/transportation-queries.json`: pilot and expanded development relevance benchmarks
- `tests/fixtures/`: source-format regression fixtures
- `docs/`: roadmap progress, relevance contract, source policy and validation notes

GitHub Actions runs the offline dataset checks, tests and production build on pushes and pull requests. Only a successful main-branch build deploys to GitHub Pages. Pull requests only validate; the workflow does not scrape the source. Only the deployment job has Pages write permissions.

## Documentation

- [Roadmap and next gates](docs/roadmap.md)
- [Statewide heading coverage plan](docs/full-coverage-plan.md)
- [Relevance specification](docs/relevance-spec.md)
- [Source access, provenance and rollback](docs/source-policy.md)
- [Validation results and limitations](docs/validation.md)
- [Coverage and exclusions](docs/coverage.md)
- [Official Missouri Revisor](https://revisor.mo.gov/)

This project is independent of the State of Missouri and is not legal advice. Always verify the source text, effective dates and applicability. No software license has been selected yet.
