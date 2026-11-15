# Full text: local implementation

Work is isolated on `feature/statute-full-text`. Do not push or deploy this branch without a separate publication instruction. The existing heading dataset, aliases, ranking and MiniSearch index remain unchanged. Full text belongs only in generated statute pages.

## Acceptance criteria

- Account for all 30,434 exact source versions in the heading snapshot; do not substitute later or generic source responses.
- Reuse archived responses only when URL, SHA-256 and retrieval timestamp match the validated record. Preserve that timestamp.
- Preserve complete statutory text, numbering, unnumbered continuations, tables, links, emphasis, source notes and warnings. Unknown structures require investigation, not silent omission.
- Keep legislative/source notes separate from statutory text. Use neutral subsection navigation labels where the source does not supply labels.
- Use version-qualified subsection anchors on existing section pages. Keep exact existing version links working.
- Prove that neither the browser heading data nor MiniSearch index gains full-text content; avoid importing full text through the search entry point.
- Test representative source formats and deliberate truncation/corruption, then audit every generated page and the statewide coverage manifest.
- Review parsing and completeness with Astra at Extra High effort before completing the local implementation. Publication remains a separate decision.

## Current stage

The local extraction, build-time validation and reading-page integration cover the complete heading snapshot: 30,434 exact source versions for 30,346 sections. This adds reading content to existing section pages; it does not create subsection pages or add body text to MiniSearch. Source retrieval dates remain those of the archived responses.

The completeness review found and corrected omitted asterisk-marked subsection boundaries and false subsection labels inside compacts and quoted forms. Extractor version 4 recognizes leading footnote asterisks and only creates links for an uninterrupted, flat 1..N sequence starting at the beginning of the statutory body. The build independently recomputes the entire navigation plan, so an omitted trailing boundary cannot pass validation.

The final local extraction and generated-page checks passed on November 15, 2026. Earlier extraction candidates are superseded and rejected by the loader.

## Local commands

Install the existing Node and Python dependencies first. The source cache is external to Git. Set `STATUTES_ARCHIVE` to the directory containing the exact archived JSON responses for the heading snapshot.

```sh
python3 scripts/full_text.py --cache "$STATUTES_ARCHIVE" --output data/full-text/candidate
STATUTES_FULL_TEXT=data/full-text/candidate npm run build
python3 scripts/check-full-text.py data/full-text/candidate
npm run seo:check
STATUTES_FULL_TEXT=data/full-text/candidate npm run dev -- --host 127.0.0.1 --port 8773
```

An extraction always uses a new output directory. A failed candidate retains its explicit errors and cannot be loaded into the build. A pilot uses `--sections` to select section numbers, includes all their source versions, and additionally requires `STATUTES_FULL_TEXT_ALLOW_PILOT=1` when building or serving it. The default build does not load full text. Keep the preview bound to localhost; no deployment was authorized.

The manifest binds the separate chapter shards to the heading dataset checksum. The loader checks every shard checksum, source identity and retrieval date, transcript checksum and subsection anchor. The output audit compares the generated body and notes character-for-character with the extracted nodes, checks source links, table spans and emphasis, and verifies all local fragment links. It also verifies the emitted heading dataset is unchanged. Extraction checks are additional to, not substitutes for, human review of source formats and legal-source exceptions.

`navigationReview` preserves text with nonsequential or ambiguous numbering but disables inferred subsection navigation. The exact source response and reasons must match the reviewed registry before the build accepts that fallback. A new or changed exception stops the build for review.

Full-text candidates, inventories and built pages are local ignored files. The parser, safe renderer, fixtures, tests and documentation belong on this Git branch. No new source requests or automated refresh schedule are involved.

## Completeness and numbering review

The user confirmed switching to Astra / Extra High for this review. This is a source-fidelity and implementation review, not a legal opinion about applicability.

- Every source response is matched to the dataset’s exact URL, version, retrieval timestamp and HTML checksum. An independent streaming HTML parser checks the body transcript against the parsed document. Extraction then verifies that splitting the heading, statutory text and source notes did not drop, reorder or duplicate characters. Only discretionary soft hyphens are removed from reading text.
- Exact source headings are shown in the reading area, including single and double asterisk markers. Existing heading metadata, constitutional warnings, contingent dates, multiple enactments and reprint notices remain visible. One version of §210.620 lacks a source heading; its existing chapter-index heading notice remains in place.
- Leading asterisk markers occur in 65 source versions. These markers remain in the displayed text. They no longer hide the first, middle or final subsection from navigation.
- [The numbering review registry](full-text-numbering-review.json) accounts for 54 source versions whose complete layout is retained without flat subsection links. These include article and lettered hierarchies in compacts, compound numbering, and a numbered list inside a quoted notice in §408.683. The source’s lowercase `l.` in §334.230 and repeated heading before `1.` in §578.182 are preserved, not corrected or renumbered.
- The source inventory contains 607 tables. Cell spans, alignment, borders, emphasis, superscripts, subscripts and source links are retained. Wide tables have a keyboard-accessible horizontal scroll region. Source `tiny` paragraphs sometimes contain real continuation text and remain readable. Unknown elements, classes, attributes and meaningful styles stop extraction.
- The generated-page audit checks exact heading, body and notes transcripts; ordered source element nesting and attributes; unique IDs; every local fragment; and every existing source-version anchor. Source heading data and the MiniSearch index are checked separately for equality with the heading-only build.
- Native fragment links and text work without JavaScript. JavaScript adds copy links, version-qualified citations and the current navigation indicator.

Two reviewed source versions (`324.406:60569` and `324.424:60572`) contain only repeal headings and source notes, with no separate statutory body. Their exact hashes and review reasons are in `data/full-text-policy.json`. The reader explains this instead of displaying an unexplained blank text box. Contingent and placeholder dates remain unchanged; the reader does not infer that repeal is currently effective. Any other empty body requires explicit review.

## Verified local result — November 15, 2026

- Extractor version 4: 30,434 of 30,434 source versions, zero extraction errors, across all 458 populated chapters. The ten empty chapter indexes remain accounted for in the heading dataset.
- 54,759 direct subsection links across 13,156 source versions; 54 exact source versions use the reviewed conservative fallback. Other unnumbered sections retain their complete text without invented numbering.
- Independent generated-page audit: every exact heading, body and source-note transcript, ordered source element structure and retained attribute matched the extracted artifact. All existing version anchors and local fragment targets resolved.
- SEO audit: 30,807 HTML pages, 30,807 sitemap URLs and 646,559 internal links; valid unique metadata and JSON-LD. No new subsection pages were created.
- Tests: 1,525 TypeScript tests and 111 Python tests passed. Both the ordinary and full-text builds passed. The full-text build contains about 379 MiB of file content; Vite’s reported build phase took 14.76 seconds on this machine, excluding extraction and initial configuration validation.
- The heading dataset and MiniSearch index are identical between the ordinary and full-text builds. The search JavaScript bundle is unchanged.
- Browser text checks matched all 14 sampled source versions after actual browser HTML parsing, including four-table §376.380, alternate §79.130 versions, the heading-less source version of §210.620 and a repeal-only version. Desktop checks found no page overflow. At a 375px mobile viewport, wide tables scroll within their containers. Subsection 3 of §535.300 lands at the reading margin, includes its unnumbered continuation and is marked as the current guide link. Copy controls display their success status.

These checks cover the checked archive snapshot. They do not assert that the official source has remained unchanged since its recorded retrieval date.

## Publication boundary

This branch and its full-text artifacts remain local. The default build continues to generate the heading-only site. A full-text build requires `STATUTES_FULL_TEXT` explicitly. Full-text artifacts are ignored by Git and are not fetched at runtime. Publishing requires a separate instruction, a reproducible artifact supply for the deployment job, and review of the local-preview wording. No remote or deployment settings have been changed.
