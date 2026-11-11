# Show Me Statutes

Find Missouri statutes without knowing the section number. Independent, heading-first search with links to official sources.

## Chapter 565 pilot

The pilot indexes **59 sections / 72 source versions** from Chapter 565, *Offenses Against the Person*, checked November 11, 2026. It preserves complete official headings, source IDs, effective intervals, source-check timestamps and hashes. It distinguishes the 16 future versions in this snapshot from versions effective on the search date.

- “first degree murder,” “1st degree murder,” “murder 1,” and “frist degree murdr” lead to § 565.020.
- “first degree murder trial procedure” prioritizes § 565.030.
- Exact section lookup never silently corrects a section number.
- Related procedures and broader topics have their own result group.
- Body-text mentions do not participate in heading search.
- Search runs in the browser; no accounts, analytics, paid backend, or AI service.

**This is a development pilot.** It does not cover all Missouri criminal law or all historical versions. Independent alias review and performance testing on a representative physical Android device remain release gates. No DNS, GitHub Pages deployment, custom domain, or publishing workflow has been configured.

## Run locally

Use Node.js 22.12+ in the 22.x series (tested with 22.22.2).

```sh
npm ci
npm run dev
```

```sh
npm test         # 60-query relevance benchmark and version/integrity regression tests
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
- `data/aliases.json`: source-checked aliases, separate topic mappings and related sections
- `public/data/statutes.json`: versioned source records plus dataset manifest
- `scripts/collect.py`: rate-limited collection and strict source validation
- `scripts/refresh.mjs`: validation/build gate and atomic snapshot promotion
- `tests/queries.json`: 60-case development relevance benchmark
- `tests/fixtures/`: source-format regression fixtures
- `docs/`: roadmap progress, relevance contract, source policy and validation notes

GitHub Actions runs the offline dataset checks, tests and production build on pushes and pull requests. It has read-only repository permissions, does not scrape the source, and does not deploy.

## Documentation

- [Roadmap and next gates](docs/roadmap.md)
- [Relevance specification](docs/relevance-spec.md)
- [Source access, provenance and rollback](docs/source-policy.md)
- [Validation results and limitations](docs/validation.md)
- [Official Chapter 565](https://revisor.mo.gov/main/OneChapter.aspx?chapter=565)

This project is independent of the State of Missouri and is not legal advice. Always verify the source text, effective dates and applicability. No software license has been selected yet.
