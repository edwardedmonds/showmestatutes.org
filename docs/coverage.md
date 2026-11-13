# Indexed chapters

The collection follows the Missouri Revisor catalog: Titles I–V (laws and statutes, sovereignty and emblems, the legislative and executive branches, and military affairs and police), [Title VI — County, Township and Political Subdivision Government](https://revisor.mo.gov/main/OneTitle.aspx?title=VI), [Title VII — Cities, Towns and Villages](https://revisor.mo.gov/main/OneTitle.aspx?title=VII), [Title VIII — Public Officers and Employees, Bonds and Records](https://revisor.mo.gov/main/OneTitle.aspx?title=VIII), [Title IX — Suffrage and Elections](https://revisor.mo.gov/main/OneTitle.aspx?title=IX), [Title X — Taxation and Revenue](https://revisor.mo.gov/main/OneTitle.aspx?title=X), [Title XI — Education and Libraries](https://revisor.mo.gov/main/OneTitle.aspx?title=XI), all listed chapters of [Title XII — Public Health and Welfare](https://revisor.mo.gov/main/OneTitle.aspx?title=XII), [Title XIII — Correctional and Penal Institutions](https://revisor.mo.gov/main/OneTitle.aspx?title=XIII), [Title XIV — Roads and Waterways](https://revisor.mo.gov/main/OneTitle.aspx?title=XIV), [Title XV — Lands, Levees, Drainage, Sewers and Public Water Supply](https://revisor.mo.gov/main/OneTitle.aspx?title=XV), [Title XVI — Conservation, Resources and Development](https://revisor.mo.gov/main/OneTitle.aspx?title=XVI), alongside [Title XIX — Motor Vehicles, Watercraft and Aviation](https://revisor.mo.gov/main/OneTitle.aspx?title=XIX), [Title XXXVII — Criminal Procedure](https://revisor.mo.gov/main/OneTitle.aspx?title=XXXVII) and [Title XXXVIII — Crimes and Punishment; Peace Officers and Public Defenders](https://revisor.mo.gov/main/OneTitle.aspx?title=XXXVIII), with the latest expansion checked November 13, 2026. Earlier chapters retain their recorded source-check dates.

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
- Taxation and revenue: **Title X Chapters 135–155**. Chapter 152 is a reviewed empty index.
- Education, libraries and related cultural institutions: **Title XI Chapters 160–178 and 180–186**, all 26 chapter indexes listed in the checked catalog. Chapter 179 is not listed.
- Public health and welfare, child protection, civil rights, cemeteries and housing: **Title XII Chapters 188–199, 201, 203–211 and 213–215**, all 25 listed chapter indexes. Chapter 203 is reviewed empty.
- Correctional and penal institutions: **Title XIII Chapters 217, 219 and 221**, all three listed chapter indexes.
- Roads and waterways: **Title XIV Chapters 226–231 and 233–238**, all twelve listed indexes; Chapter 232 is not listed.
- Lands, drainage, levees, sewers and public water supply: **Title XV Chapters 241–250**, all ten listed indexes.
- Conservation, resources and development: **Title XVI Chapters 251–260**, all ten listed indexes; Chapter 255 is reviewed empty and transferred to Chapter 625.
- Transportation: Chapters **300–307**, including the Model Traffic Ordinance, registration, driver licensing, financial responsibility, traffic regulations, aviation, watercraft and equipment.
- Criminal procedure: Chapters **540–552**.
- Criminal code, sentencing, defenses and offenses: Chapters **556–579**.
- Related programs and services: Chapters **589, 590, 595 and 600**.

The Revisor currently lists no section versions in Chapters **152**, **203**, **560** and **564**. Their empty indexes are recorded, including retrieval dates and hashes, and the chapter selector labels them as having no listed sections. They are not filled from an older compilation or interpreted as a statement that fines or inchoate offenses no longer exist. For example, current headings for fines and conspiracy appear in Chapters 558 and 562 respectively.

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

## First taxation expansion

The first [Title X — Taxation and Revenue](https://revisor.mo.gov/main/OneTitle.aspx?title=X) batch imported Chapters **135–141**: tax relief, state tax collection, property assessment, assessment review, current tax collection and delinquent taxes. The following batch completes the remaining listed chapter indexes, as recorded below.

The source lists two versions of **140.170**. The 2022 version carries an explicit Revisor constitutional warning; the 2015 version is reprinted under section 3.066. Both dates and blank end dates are preserved, with the warned version shown separately. These source classifications do not decide legal applicability.

## Remaining taxation expansion

Chapters **142–155** complete the listed Title X chapter indexes, adding **622 sections and source versions**. These include income, sales and use, motor fuel, estate, corporate franchise, financial institution, cigarette, merchant and transport tax headings. Inclusion follows the official catalog; a heading's presence does not establish that a tax is currently owed or that every provision applies.

**Chapter 152 — Private Car Tax** lists no section rows. Its cross references point to §137.022 and §§137.975–137.985, which are already in the collection. The chapter is recorded with zero headings and dated index provenance, rather than creating fictitious Chapter 152 sections from those references.

## First education expansion

Chapters **160–166** add **532 sections and source versions**, covering general school provisions, the Department of Elementary and Secondary Education, school districts, state aid, tax levies and bonds, budgets, and permanent funds and trusts. At this stage, Title XI remained partial; Chapters 167–171 are included in the following expansion.

The first Chapter 160 response repeated rows and omitted versions. It was rejected; a fresh retrieval supplied 101 unique versions. The rejected response remains in the local source cache. All seven accepted chapter indexes were independently retrieved again and matched before release.

## Pupils, personnel and school operations expansion

Chapters **167–171** add **341 sections and source versions**: 110 in Pupils and Special Services, 62 in Personnel — Teachers and Others, 101 in Teacher and School Employee Retirement Systems, 45 in Instruction — Materials and Subjects, and 23 in School Operations. Every listed version was collected and each chapter index matched an independent second retrieval. No new warning, contingent or future-dated versions were encountered. At this stage, fourteen Title XI chapters remained; they are included in the following expansion.

## Completion of education and library coverage

Chapters **172–178 and 180–186** add **685 sections and source versions**, completing all 26 chapter indexes listed under Title XI. This batch includes the University of Missouri, higher-education administration, state colleges and universities, Lincoln University, educational revenue bonds, school property, special schools, court/state/local libraries, the State Historical Society, museums and park districts, arts, and advisory councils. The catalog does not list Chapter 179; it is not treated as an empty imported chapter.

All fourteen indexes matched independent second retrievals of exact identities, dates and URLs. Twelve inconsistent section-page responses were rejected and recovered by retrying their exact source URLs; the rejected responses remain in the local cache. No new source exceptions required policy changes. Title XII follows in the next expansion. Full coverage of a title means its listed headings and versions at their recorded checks; it does not add statutory body-text search or a complete historical archive.

## First public-health expansion

Chapters **188–191** add **422 sections and source versions**: 52 in Regulation of Abortions, 17 in Aid to Local Governmental Health Facilities, 165 in Emergency Services, and 188 in Health and Welfare. All four chapter indexes matched independent second retrievals of exact identities, dates and URLs. The checked Title XII catalog lists 25 chapters from 188 through 215, excluding 200, 202 and 212; 21 remained after that batch.

The Revisor marks §190.088:9437 with a constitutional warning and a Calzone note. Its exact source version and 2014 effective date are retained in the separate warning group, outside ordinary current and upcoming results.

## Health services, vital records and drug regulations

Chapters **192–195** add **309 distinct sections and 310 source versions**: 166 versions in Department of Health and Senior Services, 33 in Vital Statistics, 65 in Death — Disposition of Dead Bodies, and 46 in Drug Regulations. All four indexes matched independent second retrievals. Seventeen listed Title XII chapters remained after that batch, beginning at Chapter 196.

Section 192.310 has two indexed versions. The 2014 version (bid 9768) carries a constitutional warning and a Calzone note. The 1919 version (bid 36197) is explicitly reprinted under §3.066. Both retain their source dates, blank end dates and exact source links. The warned version remains in its separate group; the reprint carries the explanation already used for other reviewed pairs.

## Food regulation and health facilities

Chapters **196–199** add **442 sections and source versions**: 159 in Food, Drugs and Tobacco, 108 in Medical Treatment Facility Licenses, 146 in Nursing Homes and Facilities, and 29 in Rehabilitation Center — Head Injury — Tuberculosis Testing and Commitment. Each chapter index matched a second retrieval after its source pages were collected. The full official title mapping records 41 titles and 468 chapter links; the collection now covers 196 of those chapter indexes. Thirteen listed Title XII chapters remained after that batch, beginning with Chapter 201.

Two inconsistent initial section responses were rejected and recovered by retrying their exact URLs. No new constitutional warnings, contingent dates, concurrent versions or reprinted pairs were needed in this batch. Earlier source dates and hashes are preserved.

## Children's health and local health services

Chapters **201 and 204–207** add **240 sections and source versions**: 12 in Children's Special Health Care Needs Service, 77 in Common Sewer Districts in Certain Areas, 119 in County Health and Welfare Programs, 23 in Hospital District Law, and nine in Family Support Division and Children's Division. All five populated indexes and the empty Chapter 203 matched independent second retrievals.

Chapter **203**, Air Conservation (Transferred to Chapter 643), has no section rows. Its correct chapter title, entire-chapter link and Cross References shell were reviewed in both source responses. It is recorded as an empty index with its source date and hash, and the chapter selector labels it accordingly. Chapter 643 remains separately pending. After that batch, seven listed Title XII chapter indexes remained: 208, 209, 210, 211, 213, 214 and 215.

## Title XII completed

Chapters **208–211 and 213–215** add **755 distinct sections and 760 source versions**. All seven indexes matched independent second retrievals: 227 versions in Old Age Assistance, Aid to Dependent Children and General Relief; 76 in Disabilities Assistance, Aid to the Blind, and Rights of Persons with Visual, Hearing or Physical Disabilities; 222 in Child Protection and Reformation, 102 in Juvenile Courts, 23 in Human Rights, 67 in Cemeteries, and 43 in State Housing. Together with earlier batches, all 25 listed Title XII indexes are accounted for.

Sections **210.620, 210.622, 210.625, 210.635 and 210.640** each have two listed versions and no supplied end dates. The Revisor retains the earlier versions because the 2007 amendments have contingent effective dates under §210.650. That section's source note states that the required 35 states have not enacted the revised compact. The amendment versions appear in the contingent results group; their actual displayed dates remain 2007-08-28 and are not relabeled as placeholders. Both exact links and source notices are preserved. Sections 210.630 and 210.700 each have only one indexed version even though their footnotes say both versions are printed. Section 210.650 refers to their contingent repeal. Their source footnote markers remain; no second version or repeal date is invented.

Version **210.620:11394** omits its heading from the source page in three retrieved responses. Its complete heading, “Compact enacted, text of compact.”, comes from the matching official chapter-index row, confirmed by a second retrieval. The record explicitly identifies that heading provenance, while retaining its exact section-page URL and response hash; the chapter manifest retains the index hash and date. This is a narrowly reviewed source exception, not a general fallback to truncated index text.

## Correctional and penal institutions

All three Title XIII chapter indexes are included: **217 — Department of Corrections**, **219 — Youth Services**, and **221 — Jails and Jailers**. They add **238 distinct sections and 241 source versions** (169, 21 and 51 versions respectively). Each index matched an independent second retrieval. No source retries or new parser exceptions were needed.

Sections **217.362, 217.690 and 217.760** each list an earlier version and a replacement effective **2028-01-01**. Their history tables explicitly end the earlier versions on that same date, unlike the blank-ended contingent pairs in Chapter 210. The dates are retained exactly, and scheduled versions remain behind the existing upcoming-version checkbox until their stated start. Earlier versions retain their asterisk and official delayed-date notes in the preserved source evidence. No overlap exception or inferred end date is introduced. Older history rows not enumerated by the chapter index are outside this collection's stated historical scope.

## Roads and waterways

All twelve Title XIV chapter indexes are included: **226–231 and 233–238**. They add **1,006 distinct sections and 1,009 source versions**. Each index matched an independent second retrieval. Source-derived titles and counts remain in the chapter manifest; this includes highway memorial designations as well as transportation, local-road, bridge, lighting, dam, ferry and district headings.

Sections **226.033, 238.212 and 238.222** each preserve two indexed versions with blank source end dates. Their official notes distinguish a later version affected by a court ruling from an earlier reprinted version. The later versions appear in the constitutional-warning group; the earlier reprints remain separately accessible. For §226.033, the note identifies S.B. 844 as unconstitutional and calls the other printed 2003 version current, even though the effective-date banner carries no warning. The 2003 page also mentions the ruling but explicitly describes itself as the reprinted version, so it is not marked as the warned version. The two Chapter 238 pairs retain the Revisor's Byrd case notices and reprint explanations. No end dates or applicability conclusions are invented.

## Lands, drainage and public water supply

All ten Title XV chapter indexes, **241–250**, add **611 sections and 611 source versions**. Every index matched an independent retrieval through the strict parser. The collection includes swamplands and abandoned riverbeds, drainage and levee districts, private drainage rights, public water supply, and sewerage systems. Chapter 249 includes four-digit section suffixes such as §249.1155; their exact identities are preserved. No new overlapping versions, constitutional warnings or contingent dates required exceptions. Earlier records and their source provenance remain unchanged.

## Conservation, resources and development

All ten Title XVI indexes, **251–260**, add **626 sections and 626 source versions** from nine populated chapters. Chapter 255 explicitly says it was transferred to Chapter 625 and contains no section rows; both independent checks preserved the correct chapter shell. Chapter 625 remains separately pending.

The sole indexed §260.295 version retains its footnote: the Revisor says H.B. 1606 and H.B. 1662 amended it identically, and the H.B. 1662 language remains in effect after the H.B. 1606 ruling. It is not marked as the unconstitutional version. The ordinary effective dates, footnote markers and blank history end dates remain unchanged for the conditional rulemaking and expiration notes in §§256.447 and 260.1050–260.1101. Section 260.1092's note says no departmental statement triggering expiration has been issued. No expiration date or additional version is inferred from those notes or from §260.392's program-sunset language.
