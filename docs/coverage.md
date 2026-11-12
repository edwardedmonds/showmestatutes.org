# Indexed chapters

The expansion follows the chapters enumerated by the Missouri Revisor under [Title XIX — Motor Vehicles, Watercraft and Aviation](https://revisor.mo.gov/main/OneTitle.aspx?title=XIX), [Title XXXVII — Criminal Procedure](https://revisor.mo.gov/main/OneTitle.aspx?title=XXXVII) and [Title XXXVIII — Crimes and Punishment; Peace Officers and Public Defenders](https://revisor.mo.gov/main/OneTitle.aspx?title=XXXVIII), checked November 12, 2026.

The machine-readable collection policy is `data/coverage.json`. Both the Python collector and the browser validator use it. Each chapter has a source-derived title and a minimum unique-version count established from the reviewed initial index. The dataset manifest separately retains each chapter's index URL, retrieval time, response hash, section count and version count. These chapter indexes define this collection; this is not a claim to cover every criminal provision elsewhere in Missouri law.

- Transportation: Chapters **300–307**, including the Model Traffic Ordinance, registration, driver licensing, financial responsibility, traffic regulations, aviation, watercraft and equipment.
- Criminal procedure: Chapters **540–552**.
- Criminal code, sentencing, defenses and offenses: Chapters **556–579**.
- Related programs and services: Chapters **589, 590, 595 and 600**.

The Revisor currently lists no section versions in Chapters **560** and **564**. Their empty indexes are recorded, including retrieval dates and hashes, and the chapter selector labels them as having no listed sections. They are not filled from an older compilation or interpreted as a statement that fines or inchoate offenses no longer exist. For example, current headings for fines and conspiracy appear in Chapters 558 and 562 respectively.

## Source-specific handling

An initial Chapter 574 response repeated six rows while omitting six different sections. A fresh response supplied 22 unique versions, including the missing §574.010. Every chapter index was retrieved again and compared before release. The importer now rejects all duplicate index rows, even identical ones, because deduplication can conceal missing coverage. A bounded fresh retry may recover a valid index; persistent duplication blocks collection.

Chapter 590 uses four-digit section suffixes, including 590.1040 and 590.1265. The importer and exact lookup preserve these citations verbatim. Shortened numbers are not padded or guessed.

All included section versions are individually retrieved and checked against their index identity and effective date. Heading-only indexes often truncate titles, so those index snippets are not used as final result headings. A generic section URL may default to an upcoming version; each result instead links to the exact collected `bid`.

## Boundaries

This collection excludes court rules, constitutional provisions, ordinances, federal law, chapters in other titles, and historical versions not enumerated by the current chapter indexes. Statewide heading coverage is the next expansion objective; remaining titles will be imported in reviewed batches with their own explicit scope and tests. Search covers headings and documented aliases, not statutory body text. Broad searches can be narrowed with the chapter selector.

The user authorized this expansion after trying the pilot. The user later authorized public GitHub Pages deployment. Independent alias review, assistive-technology checks and physical Android performance measurements remain outstanding; publishing does not constitute completion of those checks.

## Concurrent enactments

The Revisor explicitly prints two enactments of §590.1265, both dated August 28, 2021, due to possible conflict: source versions `50096` and `50165`. Both are retained with their own headings and links. Results display the source version and a multiple-enactments notice; the application does not choose which enactment applies. This narrowly reviewed pair is listed in `data/coverage.json`. Both source pages must retain the multiple-enactments and possible-conflict notices, and both IDs and dates must match the policy. Other overlapping versions still block promotion.

## Transportation expansion

Title XIX was selected as the first batch toward statewide heading coverage. Chapter 300 is the **Model Traffic Ordinance** in the state statutes; this collection does not include local ordinances or establish which model provisions a locality has adopted. Every result retains its actual chapter title, and chapter filtering distinguishes Chapter 300 from Chapter 304 traffic regulations.

Previously collected criminal-law source responses were explicitly reused, retaining their original source-check timestamps and hashes. New transportation versions were individually retrieved. Expansion does not imply every earlier source was rechecked.

## Contingent effective dates

The Revisor marks the January 1, 2099 date on §301.287 source version `60471` as a **placeholder** and prints it alongside version `60726` (August 28, 2026) because of a contingent effective date and possible conflict. The source does not supply an end date for the dated partner. The importer preserves both exact source dates, marks the placeholder explicitly, and requires the reviewed pair and official conflict notice. It does not invent an end date or resolve applicability.

Placeholder versions appear in a separate **Contingent versions** group, even when scheduled upcoming versions are hidden. They never automatically become current in 2099 or later. Results point to the source conditions instead of displaying the placeholder as a scheduled start date. An unreviewed placeholder, missing notice, changed date or incomplete pair blocks validation.
