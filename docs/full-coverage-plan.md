# Statewide heading coverage plan

Statewide heading coverage was authorized on November 12, 2026. Completed batches extend the original criminal-law and procedure collection with **Title XIX, Chapters 300–307**, followed by **Titles I–V**, covering the 29 listed chapters from 1 through 44, **Title VI**, covering its 22 listed chapters from 46 through 70, **Title VII**, covering its 23 listed chapters from 71 through 100, **Title VIII**, covering all eight chapters from 103 through 110, **Title IX**, covering its six listed chapter indexes, **Title X**, Chapters **135–155**, and all 26 listed **Title XI** chapter indexes, Chapters **160–178 and 180–186**. The live site must state its actual imported coverage until all remaining chapters have been collected and validated.

## Remaining work

The [official Revisor chapter catalog](https://revisor.mo.gov/) listed **468 distinct chapter links** at the planning check. This is a catalog count, not a count of chapters with active provisions; transferred or empty chapters require explicit review. The transportation, state-government, county-government, municipal, public-officer, election, taxation and education batches bring the configured scope to **184 chapter indexes**: 181 with headings and three reviewed empty indexes. **284 catalog chapters remain** at this check. Next is **Title XII — Public Health and Welfare**, whose catalog spans Chapters **188–215**. Title XI is complete for the checked catalog; it does not list Chapter 179. Chapter 152 has been reviewed: its index contains cross references to Chapter 137 and no section rows. The remaining titles will proceed in catalog order, split into manageable batches when necessary. Counts can change when the source catalog changes.

For each batch:

1. Read the official title/chapter catalog and robots directives; enumerate the exact chapter scope.
2. Review each chapter index, establish minimum version counts, and preserve its URL, check date and response hash.
3. Fetch every enumerated source version at no more than one request per second. Validate identity, complete heading and effective dates. Preserve rejected responses and stop on persistent inconsistencies.
4. Retrieve the new chapter indexes again and compare identities and dates. Investigate differences before promotion.
5. Review concurrent and delayed enactments, contingent effective dates and unusual citation formats explicitly. Never drop, merge, renumber or guess a citation to fit the current parser.
6. Add source-based relevance cases before evaluating rankings; run all prior regressions and every-section exact-lookup tests against the combined dataset.
7. Review the change report, browser behavior and coverage disclosures; publish only a passing main-branch build. A failed batch leaves the previous release intact.

Reuse of an earlier source cache preserves its original check dates. A new expansion is not a fresh audit of every prior chapter. Scheduled source refresh, physical Android measurements, screen-reader testing and independent alias review remain separate work.

## Definition of full coverage

The intended target is the headings of every chapter and source version listed by the current Missouri Revisor statute catalog, with explicit handling of empty indexes. It does not include statutory body-text search, constitutional provisions, court rules, regulations, local ordinances, federal law or a complete historical archive. Those require separate scope and source policies.

Historical date search and version comparisons must not imply complete history until an appropriate archive exists. Full-text search, if added, will remain a distinct mode so body-text mentions do not obscure heading matches.
