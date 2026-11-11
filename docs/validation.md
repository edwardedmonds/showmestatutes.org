# Pilot validation — November 11, 2026

## Automated checks

- 60/60 development relevance queries pass.
- 11 additional TypeScript regressions pass: current/future source selection, exclusive effective-date boundary, future-only sections, degree distinctions, broad topics, exclusion of body text, index serialization, malformed/overlapping records, empty/markup/long inputs, invalid dates and unrelated degree-only overlap.
- 5 Python source-parser tests pass, including the actual inconsistent-heading response rejected during collection.
- Dataset validation: 72 unique source versions / 59 sections / 16 future versions at check time.
- TypeScript checks and production build pass under Node 22.22.2; source-parser checks run with Python 3.14.7 and Beautiful Soup 4.15.0.
- Installed npm dependency audit reported zero vulnerabilities after using the patched testing release.

## Browser checks

Using the supported in-app browser against the local Vite server:

- “first degree murder” has one best heading, §565.020, with procedure and definition results separate; unrelated first-degree offenses are excluded.
- “first degree murder trial procedure” prioritizes §565.030. ArrowDown from search focuses its heading link.
- Exact §565.050 opens version `29279`; including upcoming versions adds `60733` in a separate group with July 1, 2027 displayed.
- §565.999 produces a no-match message explicitly limited to Chapter 565 and an official-source link.
- A 390×844 viewport has no horizontal overflow; input, button, version dates and source links fit the narrow layout.
- No browser error/warning logs observed during these checks.

## Limits and release gates

These are development results, not independent legal validation. No physical Android p95 timing, screen-reader audit, complete-history evaluation or broader-chapter relevance evaluation has been performed. The 60-case benchmark is not a held-out dataset. Alias/topic mappings still need independent maintainer review. The site has not been deployed, and DNS has not been changed.
