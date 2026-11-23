# Show Me Statutes

A statute can be public and still be difficult to find. If you know the situation but don't know the section number, you need a way from the words you have to the text you're looking for.

That's the problem I want Show Me Statutes to solve. Type a phrase, inspect the matching headings, and open the exact version at the [Missouri Revisor](https://revisor.mo.gov/). The section number, source date, and version stay attached to the result so you can check where it came from.

Finding a heading is the beginning of the work. You still need to read the statute and its notes to understand what it says and whether it applies.

## How the search works

The search starts with official section headings and a documented statewide set of everyday common names and topics (199 section alias sets, 71 topic queries, and 44 related-section links). “First degree murder,” “murder 1,” and “frist degree murdr” lead to § 565.020; “DWI,” “DUI,” and “DUIs” lead to § 577.010; “child custody” surfaces Chapter 452 family-law headings in Best Matches alongside Chapter 565 criminal-interference sections in Related. Adding “trial procedure” moves § 565.030 to the front. Conservative singular/plural matching connects queries like “pets” to “pet” headings while preserving legal plural distinctions (such as “damages” vs. “damage,” “arms” vs. “arm,” and “goods” vs. “good”). An exact citation such as `1.010` or `456.4-411A` stays exact; the search won't silently turn it into another number.

This choice gives heading matches priority over passing mentions buried in a statute's body, using a bounded MiniSearch BM25/IDF tie-breaker so rarer distinguishing words outweigh generic statutory boilerplate within each match tier. It also sets a real limit: a concept that appears only in the body may not turn up here. Search first, then use the visible chapter buttons or **Matching chapters** shortcuts beneath the results heading to narrow your matches. Each button counts matching source versions, including any displayed upcoming or warning groups. Removing a chapter filter keeps your query; changing the query starts across all chapters again. Broad searches show twelve matching chapters first and paginate extra headings in bounded 50-item chunks so large queries stay responsive on mobile. Active search text, chapter filters, and the upcoming toggle stay synced in the URL (`/?q=...&chapter=...`) so browser Back navigation and shared search links restore your exact view. Every result links back to its official source version.

Dates need more care than simply choosing the newest record. Upcoming versions have their own group. Contingent versions stay separate when the Revisor uses a placeholder date or states an unresolved condition. An explicit latest-start deadline ends that separation on the stated day; the site does not assume the condition was met earlier. When a reviewed source footnote gives a different effective date, the search uses that date and shows the original header date too. Versions carrying the Revisor's constitutional warning appear in a labeled group, outside ordinary current and upcoming results. Placeholder end dates are preserved without presenting them as scheduled expirations. Where the source reprints an earlier version after a court ruling, the indexed source links remain available with an explanation. A reprint note does not imply that the chapter index lists two versions. The site preserves those distinctions without deciding legal applicability for you.

Search runs in your browser using TypeScript, Vite, and MiniSearch. There are no accounts, analytics, paid search backend, or AI service, and pages set `Referrer-Policy: no-referrer` plus a strict Content Security Policy so searches stay private in your browser. Each build emits a lean, content-addressed client dataset (`~5.7 MB raw / 0.97 MB gzip`) fetched in parallel with the prebuilt MiniSearch index (`MiniSearch.loadJS`) to keep startup fast and prevent mixing cached releases; the browser can still rebuild the index from the validated snapshot if the prebuilt file is missing or mismatched.

The site name and headings use Cormorant Garamond, paired with Source Sans 3 for body text and controls. Both fonts are served locally, with Georgia and Arial/Helvetica as fallbacks if the browser cannot load or use them. Text stays visible while fonts load. The § mark retains Georgia. An 18px default text size and larger instructions, controls and supporting labels keep the interface readable on desktop and mobile. Font license notices are included with the site’s other licenses. The page introduces the heading collection before “Know the topic? Find the section.” The three-step guide uses green cards with light text and rounded corners above the search input, with step numbers in the same sans-serif font as the card text; field instructions also appear before the input. There is one search box; chapter filters appear only after a search returns results. Pressing Enter or the Search button moves to the first result, or to the no-results message when nothing matches. Results update as you type without moving the page. Example buttons start with seat belts and include the state bird, security deposits, minimum wage, public records and voter registration.

## Individual statute pages

The site generates one permanent page per distinct section under `/statutes/{section}/`, bringing the complete generated site (including `/`, `/about/`, `/coverage/`, `/chapters/`, `/topics/`, 27 topic hub pages, and 458 populated chapter pages) to **30,836 HTML pages**. All source versions of a section share that page, with exact version anchors, original headings, dates, notices, archived full text, clearly labeled editorial subsection headings, copy-citation controls, reviewed common-name labels, related-statute links, and direct links to the Missouri Revisor. Multi-version statute pages use the primary effective version's heading in `<title>`.

Validation on November 23, 2026 passed all **1,611 TypeScript tests** and **126 Python tests**, verified all **30,434 full-text source versions** and **54,759 editorial subsection headings**, and audited all **30,836 HTML pages**, **6 child sitemaps**, **679,101 internal links**, and static accessibility landmarks. The complete full-text site is **392.5 MiB** uncompressed (**37.2 MiB** as a compressed GitHub Pages artifact) and builds locally in ~18 seconds.

The individual pages add no analytics or advertising. Their URLs are included in the generated Sitemap Index. To preview the complete full-text site locally, run the full build command under [Run it locally](#run-it-locally), `npm run seo:check`, then `npm run preview -- --host 127.0.0.1 --port 8770`.

## Full-text reading view & editorial subsection headings

Section pages reproduce the archived statutory text for all **30,434 source versions** across the **30,346 section pages**, keeping source versions, effective dates, tables, source notes and warnings intact alongside direct links to the Missouri Revisor. Full text is build-time page content only; MiniSearch continues searching official headings and documented common names.

Where numbering is unambiguous, the site provides **54,759 numbered subsection links** across **13,156 source versions** (54 reviewed complex-numbering layouts and 17,224 unnumbered versions remain intact without inferred subdivisions). The [statewide editorial subsection-heading registry](docs/subsection-heading-statewide.md) provides source-checked plain-English reading aids for all **54,759 numbered subsections** across all 437 eligible chapters. A drafting agent read each complete source version and its notes, and a separate agent checked the proposed labels for scope, exceptions, dates and misleading implications before acceptance. **These are AI editorial reading aids, not official statutory text and not independent legal review.**

CI builds the site with `STATUTES_FULL_TEXT=data/full-text/statewide-4`, `STATUTES_SUBSECTION_HEADINGS=statewide`, and `STATUTES_REQUIRE_COMPLETE_HEADINGS=1`, and gates deployment on full source-text preservation (`scripts/check-full-text.py`), editorial-heading fingerprint verification (`scripts/check_editorial_headings.py`), and the 30,836-page SEO/accessibility audit (`npm run seo:check`). The [implementation and review notes](docs/full-text-plan.md) explain extraction, validation, and source exceptions, and an earlier five-section [pilot registry](docs/subsection-heading-pilot.md) remains available for comparison (`STATUTES_SUBSECTION_HEADINGS=pilot`).

## Browse without searching

- The **[topic directory](https://showmestatutes.org/topics/)** groups frequently searched Missouri statutes into 27 curated plain-English topic hubs (such as divorce, child custody, eviction & security deposits, DWI, self-defense, concealed carry, expungement, Sunshine Law, and statutes of limitations).
- The **[chapter directory](https://showmestatutes.org/chapters/)** gives every populated chapter a readable page with all 30,434 collected source versions, headings, source-check dates, version labels and notices; the ten empty indexes link directly to the Revisor.
- The **[coverage & sources page](https://showmestatutes.org/coverage/)** lists snapshot totals, scope limits, and retrieval dates for all 468 official chapter indexes.

These pages work without JavaScript and are generated from the same validated snapshot as search. Each page has its own title, description, canonical URL, breadcrumbs, JSON-LD structured data, and sharing metadata. `/sitemap.xml` is a Sitemap Index referencing `sitemap-core.xml`, `sitemap-chapters.xml`, and four chunked `sitemap-statutes-*.xml` files. Scheduled GitHub Actions rebuilds (on the 1st of each month and August 28) refresh static effective-date labels offline without scraping the Revisor. [Search visibility notes](docs/seo.md) explain the checks and Search Console / Bing Webmaster Tools setup.

## About, accuracy and corrections

The public [About & accuracy page](https://showmestatutes.org/about/) identifies Edward Edmonds as the project’s creator and maintainer. It explains the official sources, snapshot coverage, validation process, date labels and limits of the collection. The page is linked from the site navigation and every page’s footer. Its coverage totals come from the same validated dataset as search.

Source collection remains a separate reviewed process; opening or rebuilding the site does not recheck the law. The About page provides a public GitHub error-report form for source discrepancies and search problems. Reports should identify the affected page or section and the official source, without personal case information or confidential proceedings. A report does not bypass validation or automatically change the published data.

## What's covered

**The checked statewide statute-heading catalog is complete.**

The November 13, 2026 collection contains **30,346 distinct sections and 30,434 source versions** across **468 chapter indexes**. Four hundred fifty-eight have headings; Chapters 152, 203, 255, 280, 312, 318, 342, 460, 560 and 564 currently list no sections. A fresh catalog check on November 13 matched all 468 chapter links across Titles I–XLI. No listed chapter remains outside this snapshot.

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
| Lands, drainage, levees, sewers and public water supply | Title XV: Chapters 241–250 |
| Conservation, resources and development | Title XVI: Chapters 251–260 |
| Agriculture and animals | Title XVII: Chapters 261–278, 280 and 281 |
| Labor and industrial relations | Title XVIII: Chapters 285–288 and 290–295 |
| Motor vehicles, watercraft and aviation | Title XIX: Chapters 300–307 |
| Alcoholic beverages | Title XX: Chapters 311–312 |
| Public safety and morals | Title XXI: Chapters 313–323 |
| Occupations and professions | Title XXII: Chapters 324–346 |
| Corporations, associations and partnerships | Title XXIII: Chapters 347–360 |
| Banking, credit, loans, development finance and insurance | Title XXIV: Chapters 361, 362, 364, 365, 367–371 and 374–385 |
| Utilities and carriers | Title XXV: Chapters 386–394 |
| Trade and commerce | Title XXVI: Chapters 400, 402–404, 407–409, 411, 413–417, 419 and 421 |
| Debtor-creditor relations | Title XXVII: Chapters 425–430 |
| Contracts and contractual relations | Title XXVIII: Chapters 431–436 |
| Ownership and conveyance of property | Title XXIX: Chapters 441–448 |
| Domestic relations | Title XXX: Chapters 451–455 |
| Trusts and estates | Title XXXI: Chapters 456, 459–461 and 469–475 |
| Courts | Title XXXII: Chapters 476–479 and 482–488 |
| Evidence, legal advertisements and juries | Titles XXXIII–XXXIV: Chapters 490–494 |
| Civil procedure | Title XXXV: Chapters 506–517 |
| Statutory actions and torts | Title XXXVI: Chapters 521–538 |
| Criminal procedure | Title XXXVII: Chapters 540–552 |
| Crimes, punishment, peace officers and public defenders | Title XXXVIII: Chapters 556–579, 589, 590, 595 and 600 |
| Public business | Title XXXIX: Chapter 610 |
| Additional executive departments | Title XL: Chapters 620–622, 625, 630–633, 640, 643–644, 650, 660 and 680 |
| Codes and standards | Title XLI: Chapters 700–701 |

The final batch adds **1,157 sections and 1,158 source versions** from the remaining 17 indexes. It includes public meetings and records, economic development, mental health, environmental protection, public safety, social services, manufactured homes and health standards. Every listed chapter is now accounted for. [The coverage record](docs/full-coverage-plan.md) explains what completion means; [the coverage notes](docs/coverage.md) list the exact chapters and source exceptions.

These are state statute headings. The collection doesn't include local ordinances, court rules, regulations, constitutional provisions, federal law, or a complete historical archive. Chapter 300 is the state's Model Traffic Ordinance; its presence doesn't establish what a particular city has adopted.

Each chapter and source version keeps its retrieval date and response hash. Adding a batch doesn't make the earlier records newly checked. A result's source date tells you when that particular source was retrieved.

## What has been checked

The v1.0.0 statewide release (November 23, 2026) passed **1,611 TypeScript tests** (47 files) and **126 Python tests**, TypeScript typechecking, dataset validation, the full-text source-preservation audit (**30,434/30,434** versions verified, `headingDatasetUnchanged: true`), the editorial-headings audit (**54,759/54,759** headings displayed, `0` withheld), and the built-site SEO & accessibility audit (**30,836 HTML pages**, **6 child sitemaps**, **679,101 internal links**, unique titles/descriptions, valid JSON-LD, and required landmarks). End-to-end Chrome verification covered desktop (`1280px`), tablet (`768px`), and mobile (`375px` and `320px`) layouts, CSP and `no-referrer` headers, adversarial search queries, pagination, URL Back-button restoration, topic hubs, `/coverage/`, and special statute layouts with zero console errors.

The collection process checks every listed version against its official page, then retrieves the new chapter indexes again to check for changes. Tests cover search relevance, exact citations (shared between Python and TypeScript via `data/citation-rules.json`), chapter boundaries, source identities, security/edge-case handling, and version transitions. A failed validation or audit blocks publication.

Those checks have limits. The query cases are development tests, not an independent evaluation of legal search accuracy, and the editorial subsection headings and common-name aliases are AI-checked rather than independently legally reviewed. Physical Android performance measurements, screen-reader testing, and independent human review of `data/aliases.json` are tracked in [docs/roadmap.md](docs/roadmap.md) and [docs/validation.md](docs/validation.md).

GitHub Pages publishes passing builds from `main` at [showmestatutes.org](https://showmestatutes.org/). HTTPS is enforced; the `.com` domains redirect to the canonical `.org` site. See [deployment setup and recovery](docs/deployment.md).

## Run it locally

The repository is [edwardedmonds/showmestatutes.org](https://github.com/edwardedmonds/showmestatutes.org). The local checkout is `~/repos/showmestatutes.org`.

Use Node.js 22.12+ in the 22.x series. Development has been checked with 22.22.2.

```sh
npm ci
npm run dev
```

```sh
npm test          # Search, version, payload, SEO and security regressions
npm run check     # TypeScript checks
npm run build     # Headings-only static site build
STATUTES_FULL_TEXT=data/full-text/statewide-4 \
STATUTES_SUBSECTION_HEADINGS=statewide \
STATUTES_REQUIRE_COMPLETE_HEADINGS=1 npm run build  # Full-text + editorial-headings release build
python3 scripts/check-full-text.py data/full-text/statewide-4
python3 scripts/check_editorial_headings.py
npm run seo:check # Audit built pages, accessibility landmarks, metadata, links and sitemap index
npm run preview   # Serve the production build locally
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

A refresh retrieves the configured sources sequentially, at no more than one request per second, over validated HTTPS `revisor.mo.gov` URLs. It checks the records, writes a change report, runs the Python tests, builds the candidate, runs the TypeScript tests, and runs `npm run seo:check` before atomically replacing the local snapshot. A failure leaves the previous snapshot in place. Collection itself doesn't commit, push, or publish.

To collect separately, resume a cache, or review a candidate before promotion:

```sh
python3 scripts/collect.py --cache data/raw/my-review
python3 scripts/collect.py --cache data/raw/my-review --offline
npm run data:refresh -- --candidate data/candidate.json
```

Review `data/change-report.json` before committing. Missing records, changed identities, and unexplained version overlaps need investigation. Raw responses and temporary candidates stay out of Git. Reusing a source cache preserves its original retrieval dates.

GitHub Actions validates pushes, pull requests, and scheduled monthly / August 28 offline freshness rebuilds. Only a passing build on `main` deploys to GitHub Pages. The publishing workflow uses the reviewed snapshot; it doesn't crawl the Revisor.

## Work on the project

The main pieces are small enough to inspect directly:

| File | Responsibility |
| --- | --- |
| `src/search.ts` | Candidate retrieval, singularization, common names, spelling suggestions, ranking and chapter discovery |
| `src/runtime.ts`, `src/data.ts` | Browser-safe client projection/hydration, shared citation rules, full build-time validation and version dates |
| `src/coverage-runtime.ts`, `src/aliases-runtime.ts` | Lean build-time runtime projections keeping scraper/SEO prose out of the browser JS bundle |
| `src/main.ts`, `src/style.css` | Interactive search interface, URL query persistence and bounded pagination |
| `src/seo.ts`, `src/browse.css` | Static `/topics/`, `/chapters/`, `/coverage/`, `/about/` and `/statutes/` pages, metadata, CSP and Sitemap Index |
| `src/full-text.ts`, `src/full-text-build.ts`, `src/full-text.css` | Archived full-text statute rendering and build-time source verification |
| `src/subsection-headings.ts`, `src/subsection-headings-build.ts` | Source-fingerprinted editorial subsection headings and strict completeness gate |
| `static/statute-reading.js` | Progressive copy-citation and subsection permalink controls on full-text statute pages |
| `scripts/check-seo.py`, `scripts/check-full-text.py`, `scripts/check_editorial_headings.py` | Built-site SEO/accessibility, full-text preservation and editorial-heading release audits |
| `data/citation-rules.json` | Single shared Python/TypeScript citation, date, version-ID and hash format spec |
| `data/coverage.json` | Reviewed chapter scope, minimum counts and source exceptions |
| `data/aliases.json` | Source-verified common-name mappings, topic queries, related links and 27 topic hub definitions |
| `public/data/statutes.json` | Collected headings and source provenance |
| `data/full-text/statewide-4/` | Validated archived statutory text shards (30,434 versions across 458 populated chapters) |
| `data/subsection-headings/statewide/` | Source-checked editorial subsection headings (54,759 headings across 437 eligible chapters) |
| `scripts/collect.py`, `scripts/full_text.py`, `scripts/refresh.mjs` | Collection, offline full-text extraction and gated snapshot promotion |
| `tests/*queries.json`, `tests/fixtures/`, `tests/*.test.ts`, `tests/test_*.py` | Search expectations, citation parity, payload, SEO, security and source-format regressions |

For a search correction, include the query, the result you expected, and the official source link. For an expansion, establish the source scope and expected results before changing the ranking. Keep the README's coverage and validation status in step with what actually ships.

The [roadmap](docs/roadmap.md), [relevance specification](docs/relevance-spec.md), and [source policy](docs/source-policy.md) explain the decisions behind the implementation.

## License and independence

The project's code and documentation use the [MIT License](LICENSE). Official statute content retains its source attribution; the software license doesn't claim ownership of it. Third-party dependencies keep their own licenses, included with the project license in the site's `licenses.txt`.

Show Me Statutes is independent of the State of Missouri and isn't legal advice. Check the official text, dates, and source notes before relying on a result.
