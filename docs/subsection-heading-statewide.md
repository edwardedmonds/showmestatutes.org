# Local statewide editorial headings

The user authorized statewide expansion and parallel drafting/review on November 15, 2026. The work was completed on `feature/statute-full-text-antigravity` and fast-forward merged into `feature/statute-full-text` and local `main` (46 commits ahead of `origin/main`). Merge status is local only: no push to `origin/main`, deployment, or changes to the live site are authorized.

The existing archive contains 30,434 exact source versions. There are 54,759 numbered subsections across 13,156 versions. Another 17,224 versions are unnumbered, and 54 have reviewed complex numbering layouts. Those versions retain their source text without invented subdivisions or headings. The existing official section headings remain available throughout.

## Acceptance process

1. A drafting agent reads the complete archived version, all subsection continuations and subdivisions, and source notes. It writes short neutral topic labels and a rationale for each label.
2. The chapter shard records the exact source identity, source and transcript fingerprints, and individual subsection fingerprints. New entries have `reviewStatus: draft` and `draftedBy`; they cannot render as headings.
3. A different agent reads the complete version and checks every proposed label for scope, ambiguity, parties, exceptions, and confusion with adjacent subsections. It corrects labels where necessary and records `reviewedBy`, `reviewSummary`, and `reviewStatus: source-checked` only after acceptance. Unresolved entries remain drafts. Both stages are AI editorial reviews, not independent legal review.
4. The build checks the exact source version, all subsection numbers, and fingerprints before displaying any labels for that version. A mismatch returns the entire version to numbered navigation. Drafts never display.
5. A generated inventory accounts for every source version and counts reviewed, draft, missing, stale, unnumbered, and complex-numbering states separately. Completion requires zero missing, draft, or stale numbered versions. Unnumbered and complex layouts are explicitly accounted for, not counted as labeled.

The five original pilot versions retain their second-pass-reviewed labels. They are seeded from the pilot registry and described accurately as a single-agent pilot with two editorial passes, not retroactively relabeled as separate-agent review. Statewide shards must not duplicate these exact versions.

The [pilot writing rules and accuracy review](subsection-heading-pilot.md) apply throughout. Source warnings, alternate enactments, reprints, contingent dates, repeals, and expired provisions require particular care. Titles describe the supplied version's topic; they do not establish current enforceability. Source discrepancies must be recorded and investigated, never silently repaired.

## Local commands

```sh
python3 scripts/editorial_inventory.py --output /tmp/editorial-heading-status.json
STATUTES_FULL_TEXT=data/full-text/statewide-4 \
STATUTES_SUBSECTION_HEADINGS=statewide npm run build
```

Use the existing localhost preview server after rebuilding. The default build does not enable full text or editorial headings. The `pilot` mode remains available for comparison.

Once the ledger is complete, require completion explicitly:

```sh
STATUTES_FULL_TEXT=data/full-text/statewide-4 \
STATUTES_SUBSECTION_HEADINGS=statewide \
STATUTES_REQUIRE_COMPLETE_HEADINGS=1 npm run build
```

This final command fails while numbered versions remain missing, draft, or stale. It is not a substitute for editorial review. Chapter shards are under `data/subsection-headings/statewide/`. Drafting and review agents own separate chapter ranges; source files and renderer code are not edited during drafting.

MiniSearch, the browser heading dataset, official text and notes, version links, and sitemap entries remain unchanged. Only reviewed reading-page labels are added. Final acceptance also requires targeted review-gate tests, source-preservation checks, and a local desktop/mobile preview.

Each opted-in build saves an ignored audit snapshot at `data/editorial-work/last-build.json`, outside the generated website. Run `python3 scripts/check_editorial_headings.py` to compare every registered version from that build with its source and labels, including proof that drafts and stale entries were withheld. This avoids comparing a finished build with chapter files that a reviewer has edited since the build began. Use `python3 scripts/check-full-text.py data/full-text/statewide-4` for the final complete source audit.

## Progress

**Statewide local editorial review is complete as of November 22, 2026.** It was completed on `feature/statute-full-text-antigravity` and fast-forward merged into `feature/statute-full-text` and local `main` (`5d280eb`, 46 commits ahead of `origin/main`). Merge status is local only: the work has not been pushed to `origin/main` or published to the live site.

- **Inventory (`scripts/editorial_inventory.py`)**: `complete: true` — **54,759 reviewed headings across 13,156 exact source versions** (437 eligible chapters), with **0 missing**, **0 draft**, and **0 stale** entries. The remaining **17,224 unnumbered versions** and **54 complex-numbering versions** are explicitly accounted for without invented subdivisions or headings (30,434 total source versions).
- **Strict build (`STATUTES_REQUIRE_COMPLETE_HEADINGS=1`)**: Passed in 19.16s (`54,759` source-matched headings across `13,156` registered versions).
- **Audits**:
  - `python3 scripts/check_editorial_headings.py`: Passed (`54,759` displayed headings, `13,156` displayed versions, `0` withheld).
  - `python3 scripts/check-full-text.py data/full-text/statewide-4`: Passed (`30,434/30,434` source versions verified, `headingDatasetUnchanged: true`, `54` navigation-review layouts intact; MiniSearch and source text unchanged).
  - `npm run seo:check`: Passed (`30,807` HTML pages, `30,807` sitemap URLs, `646,559` internal links, unique metadata, valid JSON-LD, and 1200×630 sharing image).
- **Tests**: Targeted Vitest suite passed (`4/4` files, `29/29` tests across `subsection-headings`, `subsection-headings-build`, `full-text`, and `seo`) and full Python test suite passed (`111/111` tests).
- **Local browser checks**: Verified on `http://127.0.0.1:8775/` across desktop (`1280px` on `/statutes/375.012/` and `/` MiniSearch) and mobile (`375px` and `320px` on dual-version `/statutes/376.1516/`), confirming editorial disclaimers, exact subsection jump links, zero horizontal overflow, and zero console errors.

All reviews are AI editorial checks, not independent legal review. The expansion remains local and unpublished.
