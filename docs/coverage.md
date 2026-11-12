# Indexed chapters

The collection follows the Missouri Revisor catalog: Titles I–V (laws and statutes, sovereignty and emblems, the legislative and executive branches, and military affairs and police), [Title VI — County, Township and Political Subdivision Government](https://revisor.mo.gov/main/OneTitle.aspx?title=VI), [Title VII — Cities, Towns and Villages](https://revisor.mo.gov/main/OneTitle.aspx?title=VII), [Title VIII — Public Officers and Employees, Bonds and Records](https://revisor.mo.gov/main/OneTitle.aspx?title=VIII), [Title IX — Suffrage and Elections](https://revisor.mo.gov/main/OneTitle.aspx?title=IX), alongside [Title XIX — Motor Vehicles, Watercraft and Aviation](https://revisor.mo.gov/main/OneTitle.aspx?title=XIX), [Title XXXVII — Criminal Procedure](https://revisor.mo.gov/main/OneTitle.aspx?title=XXXVII) and [Title XXXVIII — Crimes and Punishment; Peace Officers and Public Defenders](https://revisor.mo.gov/main/OneTitle.aspx?title=XXXVIII), checked November 12, 2026.

The machine-readable collection policy is `data/coverage.json`. Both the Python collector and the browser validator use it. Each chapter has a source-derived title and a minimum unique-version count established from the reviewed initial index. The dataset manifest separately retains each chapter's index URL, retrieval time, response hash, section count and version count. These chapter indexes define this collection; this is not a claim to cover every criminal provision elsewhere in Missouri law.

- Laws and statutes: Chapters **1–3**.
- Sovereignty, jurisdiction and emblems: Chapters **7–12 and 14**.
- Legislative branch: Chapters **18, 21 and 23**.
- Executive branch: Chapters **26–34, 36 and 37**.
- Military affairs and police: Chapters **40–44**.
- County, township and political subdivision government: Chapters **46–61, 64–68 and 70**.
- Cities, towns and villages: Chapters **71–72, 77–82, 84–92, 94–96 and 98–100**.
- Public officers and employees, bonds and records: Chapters **103–110**, including state employee health plans and retirement.
- Suffrage and elections: Chapters **115, 116, 122, 127, 128 and 130**.
- Transportation: Chapters **300–307**, including the Model Traffic Ordinance, registration, driver licensing, financial responsibility, traffic regulations, aviation, watercraft and equipment.
- Criminal procedure: Chapters **540–552**.
- Criminal code, sentencing, defenses and offenses: Chapters **556–579**.
- Related programs and services: Chapters **589, 590, 595 and 600**.

The Revisor currently lists no section versions in Chapters **560** and **564**. Their empty indexes are recorded, including retrieval dates and hashes, and the chapter selector labels them as having no listed sections. They are not filled from an older compilation or interpreted as a statement that fines or inchoate offenses no longer exist. For example, current headings for fines and conspiracy appear in Chapters 558 and 562 respectively.

## Source-specific handling

An initial Chapter 574 response repeated six rows while omitting six different sections. A fresh response supplied 22 unique versions, including the missing §574.010. Every chapter index was retrieved again and compared before release. The importer now rejects all duplicate index rows, even identical ones, because deduplication can conceal missing coverage. A bounded fresh retry may recover a valid index; persistent duplication blocks collection.

Chapter numbers retain their original width: 1.010 and 10.010 are different citations, and leading zeroes are not added. Chapters 1 and 590 include four-digit section suffixes, such as 1.1002, 590.1040 and 590.1265. The importer and exact lookup preserve these citations verbatim. Shortened numbers are not padded or guessed.

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

## Government expansion

Titles I–V add 29 chapter indexes. The individually retrieved headings include state government, emblems and holidays, military justice, veterans, the highway patrol and emergency management. Earlier criminal-law and transportation records retain their original check dates and hashes.

Section **44.098** lists one contingent version (`35640`), with a 2099 placeholder and a contingent-effective-date footnote. The reviewed policy retains that exact version and date, requires the placeholder label and footnote, and does not attach a multiple-enactments warning. It stays in the contingent group even after 2099; the site does not decide whether the source conditions have been fulfilled.

## Delayed effective-date overlap

Section **27.117** lists versions `60466` (August 28, 2026) and `60727` (July 1, 2027), with no end date on either source page. The earlier page explicitly says both versions are printed due to a delayed effective date; the later page supplies its July 2027 effective-date note. The reviewed `delayedEnactments` policy requires both exact IDs, dates, notices and unchanged blank end dates.

Before July 2027, the later version appears only when upcoming versions are requested. From its source start date, both records satisfy their recorded intervals and are displayed with a delayed-effective-date notice. The application does not invent a supersession date or decide which version governs. This exception does not permit unreviewed overlaps.

## County-government expansion

Title VI adds 22 chapter indexes, covering county boundaries and classification, finances, county offices, sheriffs, coroners, records, land surveys, zoning, township government, political subdivisions, port authorities and intergovernmental cooperation. These are state statutes concerning local government, not a collection of local ordinances.

The Revisor reprints earlier versions of **56.067, 56.816, 67.457, 67.461, 67.1431 and 67.1471** following court rulings, while retaining the later versions and leaving both source end dates blank. Both versions remain indexed. The reviewed reprint policy requires each exact identity, effective date and source notice; it neither invents a supersession date nor selects a governing legal rule.

Versions bearing the Revisor's “all or part is unconstitutional” banner or an explicit Revisor's note declaring the section unconstitutional appear in **Versions with constitutional warnings**, including through exact-citation search. They do not enter ordinary current, related or upcoming result groups. Chapter filters apply to the warning group, and hiding upcoming versions does not hide warnings. The wording preserves the source's qualification; it does not declare every flagged section invalid in its entirety. See [source policy](source-policy.md).

Section **67.320:2753** retains the source warning while displaying its additional qualification: the Revisor says the 2014 language from S.B. 621 remains current because that bill was not addressed in the cited case. The warning group is not a list of wholly invalid statutes.

## Municipal expansion

Title VII adds 23 chapter indexes covering state statutes for city classifications, municipal powers, police and fire departments, pension systems, public works, zoning, parks, utilities, taxation, debt, municipal health, housing and industrial development. These are state laws concerning municipalities, not a collection of local ordinances. Earlier records retain their original retrieval dates and source hashes.

The source lists reprinted pairs for **79.130, 94.270, 99.825, 99.830 and 99.865**. Each earlier reprint remains separately linked alongside its later version carrying a constitutional warning. The warnings for the three Chapter 99 versions appear in explicit Revisor's notes rather than the effective-date banner. The reviewed policy requires the exact notices, identities and source dates, and retains blank end dates without deciding which version governs.

Section **79.135:3733** is separately marked by the source, with no reprinted partner in its chapter index. It appears only in the constitutional-warning group. The collection does not invent a replacement version.

## Public-officer expansion

Title VIII adds all eight chapter indexes from 103 through 110: state employee health plans and retirement, public officers and employees, removal and impeachment, official and public-works bonds, bond issues, public and business records, and depositaries for public funds. Earlier source-check dates and hashes are preserved. Public-records coverage here means Chapter 109; Missouri’s Sunshine Law in Chapter 610 is not yet included.

Twenty-one Chapter 105 source versions carry constitutional warnings: 19 concern public-sector labor provisions, §105.1415 concerns volunteer status, and §105.1155 concerns public-employee vaccination requirements. They remain accessible through heading and exact-citation searches in the labeled warning group, outside ordinary current and upcoming results. No replacement or applicability determination is inferred from historical rows on the source pages. See the exact reviewed list in [source policy](source-policy.md).

## Election expansion

Four Chapter 116 pairs retain an earlier reprint and a warned 2025 enactment: §§116.155, 116.160, 116.190 and 116.334. Exact version IDs and source notices are recorded in `reprintedEnactments` and `constitutionalWarnings`. The warning comes from an explicit Revisor note, not an inferred reading of a court annotation.

Twelve Chapter 128 versions have explicitly labeled placeholder dates: §§128.345, 128.346, 128.348 and 128.471–128.479. The first three also list a 2022 version. The source gives referendum notices, which differ between the earlier and placeholder versions. The collection preserves both notices, blank end dates and the correct single/paired status; no 2099 placeholder becomes a scheduled future law. Read the official version pages for conditions and applicability.
