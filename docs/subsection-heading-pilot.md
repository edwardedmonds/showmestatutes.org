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

## Second editorial accuracy review — November 15, 2026

Reviewed all 30 headings against complete archived subsection text, including subdivisions, continuation paragraphs, neighboring subsections, and source notes. Also consulted the official Revisor pages linked below. The web reader can return cached pages; this is an editorial review, not a fresh acquisition or a claim that the underlying source-check dates changed. The exact-version web fetch for 535.210 was unavailable, so its official section page was checked alongside the archived 35190 version; the displayed wording agreed. No source fingerprints were changed.

Outcome: nine headings revised to remove ambiguity; 21 retained. These are topic labels, not exhaustive summaries or conclusions about enforceability. This second pass is still a Codex review, not independent legal review.

### [535.300 — security deposits](https://revisor.mo.gov/main/OneSection.aspx?section=535.300&bid=35191)

| Subsection | Outcome and accuracy reasoning |
| --- | --- |
| 1 | Retain “Deposit limit.” Accurately identifies the subject without adding an amount or broader rule. |
| 2 | Retain “Holding deposits and interest.” Covers custody and interest; the government-landlord exception remains in the text. |
| 3 | Revise to “Deposit returns and itemized damage statements.” Describes the statement required here rather than implying this subsection supplies grounds for deductions. Includes the mailing continuation in the review. |
| 4 | Retain “Grounds and conditions for withholding.” Covers permitted reasons and their qualifications, including carpet-cleaning terms and costs, wear and tear, and mitigation. |
| 5 | Retain “Inspection notice and tenant attendance.” Fits the notice, timing, and attendance provisions without asserting an unconditional inspection procedure. |
| 6 | Retain “Damages for wrongful withholding.” A topic label rather than an unconditional remedy claim. The commercial-property annotation remains relevant and visible in source notes. |
| 7 | Revise to “Landlord damages beyond the deposit and rent obligations.” Identifies whose damages are involved, distinguishes the tenant remedy in subsection 6, and covers the separate rent restriction. |
| 8 | Retain “Meaning of security deposit.” Covers the definition and its pet-deposit exclusion without extending them beyond this section. |

### [535.210 — landlord-tenant court](https://revisor.mo.gov/main/OneSection.aspx?section=535.210)

| Subsection | Outcome and accuracy reasoning |
| --- | --- |
| 1 | Retain “Establishing the court and appointing commissioners.” Fits the authorization, prerequisites, and appointment body; Jackson County context stays in the official section heading and text. |
| 2 | Retain “Commissioners’ authority and limits.” Covers jurisdiction, relief, and the prohibition on ex parte action. |
| 3 | Retain “Commissioner qualifications, compensation, and restrictions.” Fits service, residency, pay, outside work, and employment-benefit provisions. |
| 4 | Retain “Court procedures and staffing.” Covers hearings without a jury, the commissioner's fact-finding role, and assigned personnel. |
| 5 | Retain “Requesting an associate circuit court hearing.” Does not invent the missing object of the source's mailing/service language or conflate this motion with subsection 6. |
| 6 | Retain “Recording proceedings and seeking review.” Broad enough for both trial de novo and appellate review without presenting them as identical procedures. |
| 7 | Revise to “Summons return dates and service attempts.” The source requires an attempt by a specified time, not completed service by that time. |
| 8 | Revise to “County funding to establish and operate the court.” Avoids suggesting that the county pays litigants' fees or case-specific court costs. |

### [307.178 — seat belts](https://revisor.mo.gov/main/OneSection.aspx?section=307.178&bid=47718)

| Subsection | Outcome and accuracy reasoning |
| --- | --- |
| 1 | Retain “Meaning of passenger car.” Properly identifies a section-specific definition with vehicle exclusions. |
| 2 | Retain “Belt requirements, exceptions, and enforcement limits.” Does not flatten vehicle, age, medical, postal, agricultural, or enforcement qualifications into a universal rule. |
| 3 | Retain “Restraints for children under sixteen.” Matches the age range and leaves the details to the express 307.179 cross-reference. |
| 4 | Revise to “Seat-belt evidence and reductions in damages.” Makes the monetary meaning explicit; expert-evidence conditions, comparative negligence, and limits remain in the text. |
| 5 | Retain “Vehicle product claims and seat-belt evidence.” Broad topic label for the listed design, construction, manufacture, distribution, and sale actions; it does not assert that the rule is limited to a particular legal cause of action. |
| 6 | Retain “Fines, court costs, and points.” Names subjects without implying all three are imposed; the exception, fine provision, and prohibitions remain explicit in the text. |
| 7 | Revise to “Seat-belt education, evaluation, and reporting.” Evaluation concerns the section's effectiveness, not merely the public-information program. |
| 8 | Revise to “When occupants outnumber seat belts.” The trigger counts persons, not just passengers; the following provisions concern passengers, seating, and a specified driver-license exception. |

### [610.023 — public records](https://revisor.mo.gov/main/OneSection.aspx?section=610.023&bid=30420)

| Subsection | Outcome and accuracy reasoning |
| --- | --- |
| 1 | Retain “Appointing and identifying the records custodian.” Describes the appointment and public identification; maintenance responsibility remains in the source. |
| 2 | Revise to “Record inspection, copying, removal, and exclusive access.” Avoids the overly general “access restrictions,” which could be mistaken for grounds to deny access. |
| 3 | Revise to “Response timing, record formats, and delays.” Concerns action on requests and the format of records, not a deadline or required format for submitting requests. Does not promise production within three days. |
| 4 | Retain “Written explanations for denied access.” Identifies the subject without dropping the source's requirement that the explanation be requested. |

### [79.130 — ordinance procedures, version 3732](https://revisor.mo.gov/main/OneSection.aspx?section=79.130&bid=3732)

| Subsection | Outcome and accuracy reasoning |
| --- | --- |
| 1 | Retain “Procedures for enacting ordinances” as a description of this version's text, not a statement of current enforceability. The Revisor's constitutional warning and annotation must remain displayed. |
| 2 | Retain “Exception for ordinances under 79.135.” Preserves the precise cross-reference without supplying an inferred category or suggesting the warning does not apply. |

The separately displayed reprint, version 36191, still receives no headings from version 3732. The review does not resolve the constitutional issue or convert either version into legal advice.

After the revisions, all 25 targeted tests and the opt-in build passed. All 30 emitted titles were checked; exact source headings, bodies, notes, and ordered source markup were unchanged across the five pilot versions. Source fingerprints and the heading dataset were unchanged. The refreshed local preview displayed the corrected labels.
