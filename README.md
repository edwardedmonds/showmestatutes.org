# Show Me Statutes

A statute can be public and still be difficult to find. If you know the situation but don't know the section number, you need a way from the words you have to the text you're looking for.

That's the problem I want Show Me Statutes to solve. Type a phrase, inspect the matching headings, and open the exact version at the [Missouri Revisor](https://revisor.mo.gov/). The section number, source date, and version stay attached to the result so you can check where it came from.

Finding a heading is the beginning of the work. You still need to read the statute and its notes to understand what it says and whether it applies.

## How the search works

The search starts with official section headings and a small set of documented common names. “First degree murder,” “murder 1,” and “frist degree murdr” lead to § 565.020. Adding “trial procedure” moves § 565.030 to the front. An exact citation such as `1.010` stays exact; the search won't silently turn it into another number.

This choice gives heading matches priority over passing mentions buried in a statute's body. It also sets a real limit: a concept that appears only in the body may not turn up here. The chapter selector helps narrow a broad search, and every result links back to its official source version.

Dates need more care than simply choosing the newest record. Upcoming versions have their own group. Contingent versions stay separate when the Revisor uses a placeholder date. Versions carrying the Revisor's constitutional warning appear in a labeled group, outside ordinary current and upcoming results. Where the source reprints an earlier version after a court ruling, both source links remain available with an explanation. The site preserves those distinctions without deciding legal applicability for you.

Search runs in your browser using TypeScript, Vite, and MiniSearch. There are no accounts, analytics, paid search backend, or AI service. Each build requests data files named for its snapshot to avoid mixing cached releases. The build includes a prebuilt index; the browser can rebuild it from the validated snapshot if that index is missing or mismatched.

## What's covered

**Statewide heading coverage is the goal. It isn't finished.**

The November 13, 2026 collection contains **14,821 distinct sections and 14,883 source versions** across **224 chapter indexes**. Two hundred twenty have headings; Chapters 152, 203, 560 and 564 currently list no sections. The official catalog contains 468 chapter links, leaving **244** outside this collection at this check.

| Area | Imported scope |
| --- | --- |
| State government, laws, emblems, military affairs and police | Titles I–V |
| County, township and political subdivision government | Title VI: Chapters 46–61, 64–68 and 70 |
| Cities, towns and villages | Title VII: Chapters 71–72, 77–82, 84–92, 94–96 and 98–100 |
| Public officers, employee benefits, bonds and records | Title VIII: Chapters 103–110 |
| Suffrage and elections | Title IX: Chapters 115, 116, 122, 127, 128 and 130 |
| Taxation and revenue | Title X: Chapters 135–155 |
| Education, libraries and related cultural institutions | Title XI: Chapters 160–178 and 180–186 |
| Public health and welfare, child protection, civil rights, cemeteries and housing | Title XII: Chapters 188–199, 201, 203–211 and 213–215 |
| Correctional and penal institutions | Title XIII: Chapters 217, 219 and 221 |
| Roads and waterways | Title XIV: Chapters 226–231 and 233–238 |
| Motor vehicles, watercraft and aviation | Title XIX: Chapters 300–307 |
| Criminal procedure | Title XXXVII: Chapters 540–552 |
| Crimes, punishment, peace officers and public defenders | Title XXXVIII: Chapters 556–579, 589, 590, 595 and 600 |

The latest batch adds **1,006 sections and 1,009 source versions**, completing Title XIV's twelve listed chapters. It covers highways, local roads, bridges, street lighting, dams, ferries and transportation districts. Three sections retain both a version carrying a constitutional warning and the earlier version reprinted by the Revisor. Title XV—lands, levees, drainage, sewers and public water supply—is next. [The coverage plan](docs/full-coverage-plan.md) records the remaining work; [the coverage notes](docs/coverage.md) list the exact chapters and source exceptions.

These are state statute headings. The collection doesn't include local ordinances, court rules, regulations, constitutional provisions, federal law, or a complete historical archive. Chapter 300 is the state's Model Traffic Ordinance; its presence doesn't establish what a particular city has adopted.

Each chapter and source version keeps its retrieval date and response hash. Adding a batch doesn't make the earlier records newly checked. A result's source date tells you when that particular source was retrieved.

## What has been checked

The latest roads and waterways expansion passed **807 TypeScript tests and 42 Python tests**, TypeScript checks, and the production build. All twelve new chapter indexes matched a second retrieval. Browser checks covered new searches, chapter boundaries, source-warning distinctions, keyboard navigation and narrow-screen layouts. Deployment is gated by the main-branch workflow.

The collection process checks every listed version against its official page, then retrieves the new chapter indexes again to check for changes. Tests cover search relevance, exact citations, chapter boundaries, source identities, and version handling. A failed validation blocks publication.

Those checks have limits. The query cases are development tests, not an independent evaluation of legal search accuracy. Physical Android performance measurements, screen-reader testing, and independent review of the common-name mappings are still outstanding. [Validation notes](docs/validation.md) record the results and the remaining gaps.

GitHub Pages publishes passing builds from `main` at [showmestatutes.org](https://showmestatutes.org/). HTTPS is enforced; the `.com` domains redirect to the canonical `.org` site. See [deployment setup and recovery](docs/deployment.md).

## Run it locally

The repository is [edwardedmonds/showmestatutes.org](https://github.com/edwardedmonds/showmestatutes.org). The local checkout is `~/repos/showmestatutes.org`.

Use Node.js 22.12+ in the 22.x series. Development has been checked with 22.22.2.

```sh
npm ci
npm run dev
```

```sh
npm test         # Search, version and data-integrity regressions
npm run check    # TypeScript checks
npm run build    # Validate the snapshot and build the static site
npm run preview  # Serve the production build locally
```

## Collect and review data

Python 3.11+ and Beautiful Soup are needed for collection. Visitors only need a browser.

```sh
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r requirements.txt
npm run data:validate
python3 -m unittest discover -s tests -p 'test_*.py'
npm run data:refresh
```

A refresh retrieves the configured sources sequentially, at no more than one request per second. It checks the records, writes a change report, runs the tests, and builds the candidate before replacing the local snapshot. A failure leaves the previous snapshot in place. Collection itself doesn't commit, push, or publish.

To collect separately, resume a cache, or review a candidate before promotion:

```sh
python3 scripts/collect.py --cache data/raw/my-review
python3 scripts/collect.py --cache data/raw/my-review --offline
npm run data:refresh -- --candidate data/candidate.json
```

Review `data/change-report.json` before committing. Missing records, changed identities, and unexplained version overlaps need investigation. Raw responses and temporary candidates stay out of Git. Reusing a source cache preserves its original retrieval dates.

GitHub Actions validates pushes and pull requests. Only a passing build on `main` deploys to GitHub Pages. The publishing workflow uses the reviewed snapshot; it doesn't crawl the Revisor.

## Work on the project

The main pieces are small enough to inspect directly:

| File | Responsibility |
| --- | --- |
| `src/search.ts` | Candidate retrieval, common names, spelling suggestions and ranking |
| `src/data.ts` | Data validation and version selection |
| `src/main.ts`, `src/style.css` | Search interface |
| `data/coverage.json` | Reviewed chapter scope, minimum counts and source exceptions |
| `data/aliases.json` | Common-name mappings, topics and related sections |
| `public/data/statutes.json` | Collected headings and source provenance |
| `scripts/collect.py`, `scripts/refresh.mjs` | Collection and gated snapshot promotion |
| `tests/*queries.json`, `tests/fixtures/` | Search expectations and source-format regressions |

For a search correction, include the query, the result you expected, and the official source link. For an expansion, establish the source scope and expected results before changing the ranking. Keep the README's coverage and validation status in step with what actually ships.

The [roadmap](docs/roadmap.md), [relevance specification](docs/relevance-spec.md), and [source policy](docs/source-policy.md) explain the decisions behind the implementation.

## License and independence

The project's code and documentation use the [MIT License](LICENSE). Official statute content retains its source attribution; the software license doesn't claim ownership of it. Third-party dependencies keep their own licenses, included with the project license in the site's `licenses.txt`.

Show Me Statutes is independent of the State of Missouri and isn't legal advice. Check the official text, dates, and source notes before relying on a result.
