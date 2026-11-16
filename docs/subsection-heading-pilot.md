# Local subsection heading pilot

This is a local editorial experiment on `feature/statute-full-text`. It adds 30 descriptive headings to five exact source versions across five sections. The source transcript, statutory numbering, source notes, version notices, and permanent links remain the reference material.

The headings were drafted and checked by Codex against the complete archived sections and their notes on November 15, 2026. They have not received independent legal review or user editorial approval. `source-checked` records that pilot review; it is not a certification of legal accuracy or a fresh retrieval of the source. The existing source-check dates remain visible.

## Pilot scope

| Section and source version | Headings | Review focus |
| --- | ---: | --- |
| 535.300:35191 | 8 | Deposit limits, conditional deductions, continuation paragraphs, and the commercial-property annotation |
| 535.210:35190 | 8 | Court administration, separate hearing/review procedures, and source wording that must not be completed by inference |
| 307.178:47718 | 8 | Coverage exceptions, distinct evidence rules, cross-references, and qualified penalties |
| 610.023:30420 | 4 | Acting on a request versus producing records, delay explanations, and requested denial statements |
| 79.130:3732 | 2 | An alternate version with a constitutional warning and a cross-referenced exception |

Section 79.130 also displays reprinted version 36191, which has no flat numbered subsection navigation. It receives no pilot headings. Titles from version 3732 must never carry across to that version. Both versions retain their source notices and annotations.

## Writing rules

- Use short, neutral topic descriptions, generally three to eight words.
- Read the whole section and its source notes before titling individual subsections.
- Account for every topic within the subsection, including continuation paragraphs and subdivisions. A heading is a navigation aid rather than an exhaustive summary.
- Avoid turning a qualified rule into an unconditional command, entitlement, deadline, penalty, or outcome.
- Preserve meaningful distinctions between neighboring subsections and exact cross-references when they define the topic.
- Keep the subsection number visible and label added headings as editorial.
- Retain numbered navigation wherever there is no reviewed, matching heading.

The registry in `data/subsection-headings-pilot.json` records each title and its review rationale separately from the source dataset. The source body and official section heading are never edited to insert editorial text.

## Matching and fallback

An entry identifies one source-version ID, official source URL, archived response checksum, and complete transcript checksum. Each heading also has a fingerprint of its subsection text, including continuation paragraphs and subdivisions. Every number and fingerprint must match before any heading for that version appears.

A changed response, transcript, source identity, subsection boundary, or subsection count returns the entire version to numbered navigation. Draft entries also stay numbered. A build reports registered versions that fall back so they can be reviewed; core reading pages remain available. Changed notes invalidate the complete transcript fingerprint during the full-text validation that precedes rendering.

The registry parser rejects malformed entries and duplicate version or subsection reviews. Tests cover changed sources and boundaries, draft entries, alternate versions, safe escaping, and explicit opt-in. Rechecking a changed version requires a fresh editorial review and refreshed fingerprints; never update fingerprints alone to make old titles appear again.

## Preview locally

Use the previously validated full-text candidate:

```sh
STATUTES_FULL_TEXT=data/full-text/statewide-4 \
STATUTES_SUBSECTION_HEADINGS=pilot npm run build
python3 -m http.server 8774 --bind 127.0.0.1 --directory dist
```

Reuse the preview server if it is already running. The heading pilot is disabled unless `STATUTES_SUBSECTION_HEADINGS=pilot` is explicitly supplied. It also requires `STATUTES_FULL_TEXT`.

Labeled versions use numbered title links in the desktop guide and full-width title rows on mobile. Other versions retain the existing numbered buttons on mobile. Each added heading is marked “Editorial heading” above the original subsection text, and the reading guide explains the labels' origin.

Headings are build-time section-page content only. They are not added to MiniSearch, the heading dataset, chapter listings, page metadata, or sitemap entries. This pilot does not add subsection URLs beyond the existing version-qualified fragments.

```sh
npm test -- tests/subsection-headings.test.ts tests/full-text.test.ts tests/seo.test.ts
python3 scripts/check-full-text.py data/full-text/statewide-4
```

The full-text audit compares every emitted source heading, body, note, and retained source structure with its validated extraction. Editorial headings are outside those source containers. This guards preservation of the source, while the editorial review remains a separate judgment task.

## Local validation — November 15, 2026

- TypeScript checking, the pilot production build, and all 25 targeted tests passed.
- The full source-preservation audit passed for all 30,434 versions.
- All 30 expected editorial headings appeared only in their intended versions, outside official-source containers.
- The emitted heading dataset was byte-identical to its input. The serialized MiniSearch index and dataset checksum matched the pre-pilot build.
- Desktop navigation and mobile title links selected the correct version-qualified fragments. Mobile layouts at 375px and 320px viewport settings wrapped long titles without horizontal overflow.

This validation applies to the local branch and preview only. Nothing from this pilot has been pushed or deployed.
