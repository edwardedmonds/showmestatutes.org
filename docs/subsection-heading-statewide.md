# Local statewide editorial headings

The user authorized statewide expansion and parallel drafting/review on November 15, 2026. Everything remains on `feature/statute-full-text`; no push, deployment, or changes to the live site are authorized.

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

Expansion is in progress. The live ledger is generated from the archived source and current chapter files; a file count or a drafted heading count is not a completion claim. Run the inventory command for current totals. The local work log records the active assignments and preview/build state so drafting and review can resume without duplicate work.

The November 15 local checkpoint displays 9,098 reviewed headings across 2,283 exact source versions. Its build audit confirmed that 263 draft versions retained numbered navigation and checked the original heading, body, notes, and source structure for every registered version in that build. Chapters 99, 104, 137, and 140 have complete separately reviewed coverage of their numbered versions. Chapter 140's reprinted and constitutionally flagged versions remain distinct; ambiguous source wording is preserved rather than repaired. The search dataset remains byte-identical. Work continues toward 54,759 headings; this checkpoint is not statewide completion or publication.
