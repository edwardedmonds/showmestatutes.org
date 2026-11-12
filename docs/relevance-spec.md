# Heading-search relevance contract

Source roadmap: https://chatgpt.com/share/6af4cf71-767c-83e9-b2d1-51204450e788

The first implementation covered Chapter 565, Offenses Against the Person. The expansion covers the chapters enumerated in [the coverage policy](coverage.md). The original 60 cases remain a Chapter 565-scoped regression set, while unambiguous pilot expectations are also checked across the full collection (generic “definitions” and the formerly out-of-scope “grand jury” query are scope-dependent). `tests/expansion-queries.json` adds offense, procedure, sentencing, chapter-filter and four-digit citation cases, defined before evaluating the imported collection. `tests/transportation-queries.json` adds heading, citation and chapter-filter cases for Title XIX, defined from the official indexes before evaluating the expanded rankings. `tests/government-queries.json` adds source-based heading and short-citation cases for Titles I–V, defined before ranking evaluation. Chapter 300 model-ordinance results remain identifiable by their source chapter; they are not presented as adopted local ordinances. It is a heading finder, not full-text search or legal advice. `tests/queries.json` holds 60 input/expected-result cases, defined before evaluating the ranking implementation. These are a development benchmark, not an independent holdout evaluation or proof of general legal-search accuracy.

`tests/county-queries.json` adds heading, exact-citation and chapter-filter cases for Title VI, defined from official indexes before evaluating rankings. Identical home-based-work headings in Chapters 64 and 65 retain their source chapter and can be filtered independently. Constitutional-warning versions remain discoverable by heading and citation in a separate group; they are excluded from ordinary current, related and upcoming results. The reviewed reprinted partner retains its original source interval and its explanatory notice.

## Ranking contract

1. An exact section number wins. The selected chapter filter applies to exact citations as well as headings, related sections, upcoming versions, contingent versions and constitutional warnings. Numeric references never receive fuzzy correction or zero-padding that could silently change a citation.
2. Original headings and source-checked alternative names supply the candidates. Exact reviewed alias/heading matches precede partial matches. Every substantive query word must match within one heading or alias; matching only generic words cannot discard the topic-defining word (for example, “rent” in “rent security deposit”).
3. Case, punctuation, common stop words, word order, and ordinal degrees normalize. First, second, third, and fourth remain different.
4. A unique one-edit spelling suggestion may correct words of at least five characters. Adjacent transpositions count as one edit. Ambiguous corrections are not applied. Reviewed topic words are included in the spelling vocabulary so a known topic is not corrected into an unrelated heading.
5. Offense queries favor offense headings. Explicit trial/procedure/waiver queries favor procedures. Domestic offenses remain distinct from general assault.
6. Broader topics (for example homicide) and curated related sections form a separately labeled result group. They are not aliases for a single offense.
7. Body text is never indexed in this mode.

## Gates

- Every critical benchmark case must pass; the initial implementation requires all 60 cases to pass.
- Every result retains its actual heading, section, chapter, source-checked date and exact source version link.
- Dated effective intervals use `from <= date < to`. Explicit source placeholders never count as current or scheduled future versions; they appear in a separate contingent group with source-condition guidance. Future versions appear only in a separately labeled group when requested. The explicitly source-documented concurrent enactments of §590.1265 both appear, each labeled with its version identity and the source conflict notice.
- No claims of complete history: only versions enumerated by the current chapter index are collected.
- A failed source parse, conflicting effective dates, missing identity, duplicate index row, duplicate dataset version, record loss, failed test, or failed build must block dataset promotion.
- Keyboard, narrow-screen and no-match/error behavior must be verified. Android p95 <150 ms remains an unverified performance target until measured on a documented physical device.

## Alias review

`data/aliases.json` keeps source-derived names, short degree abbreviations, broader topics, and related links separate. These received an initial implementation cross-check against official headings. The transportation batch adds three section mappings for seat belts and license offenses; “speeding” is a broader topic linking the two reviewed speed-limit headings. The file records that basis and date. Independent maintainer review remains outstanding after the user-authorized public release; the site does not claim a legal expert approved these mappings.
