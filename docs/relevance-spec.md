# Chapter 565 pilot relevance contract

Source roadmap: https://chatgpt.com/share/6af4cf71-767c-83e9-b2d1-51204450e788

The first implementation covers Chapter 565, Offenses Against the Person. It is a heading finder, not full-text search or legal advice. `tests/queries.json` holds 60 input/expected-result cases, defined before evaluating the ranking implementation. These are a development benchmark, not an independent holdout evaluation or proof of general legal-search accuracy.

## Ranking contract

1. An exact section number wins. Numeric references never receive fuzzy correction or zero-padding that could silently change a citation.
2. Original headings and source-checked alternative names supply the candidates. Exact reviewed alias/heading matches precede partial matches.
3. Case, punctuation, common stop words, word order, and ordinal degrees normalize. First, second, third, and fourth remain different.
4. A unique one-edit spelling suggestion may correct words of at least five characters. Adjacent transpositions count as one edit. Ambiguous corrections are not applied.
5. Offense queries favor offense headings. Explicit trial/procedure/waiver queries favor procedures. Domestic offenses remain distinct from general assault.
6. Broader topics (for example homicide) and curated related sections form a separately labeled result group. They are not aliases for a single offense.
7. Body text is never indexed in this mode.

## Gates

- Every critical benchmark case must pass; the initial implementation requires all 60 cases to pass.
- Every result retains its actual heading, section, chapter, source-checked date and exact source version link.
- Effective intervals use `from <= date < to`. Future versions appear only in a separately labeled group when requested.
- No claims of complete history: only versions enumerated by the current chapter index are collected.
- A failed source parse, conflicting effective dates, missing identity, duplicate version, record loss, failed test, or failed build must block dataset promotion.
- Keyboard, narrow-screen and no-match/error behavior must be verified. Android p95 <150 ms remains a release gate until measured on a documented physical device.

## Alias review

`data/aliases.json` keeps source-derived names, short degree abbreviations, broader topics, and related links separate. These received an initial implementation cross-check against official headings. The file records that basis and date. Independent maintainer review is still required before public release; the site does not claim a legal expert approved these mappings.
