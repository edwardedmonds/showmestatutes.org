# Show Me Statutes

A Missouri statutory search website built with **TypeScript**, **Vite**, and **MiniSearch**. The goal is a fast, accessible static site that helps people find statutory text and follow links to official sources.

## Status

Initial development scaffold. The search UI and client-side index are wired up, but `public/data/statutes.json` is intentionally empty. No statute corpus has been imported or verified. The interface clearly reports this empty state.

No domain, DNS, GitHub Pages deployment, or publishing workflow is configured.

## Local development

Use Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

```sh
npm run check   # TypeScript validation
npm run build   # Validate and build into dist/
npm run preview # Preview the production build locally
```

Once a lockfile is present, use `npm ci` for reproducible installation.

## Project layout

- `src/main.ts`: dataset validation, MiniSearch index, and search result rendering
- `src/style.css`: responsive page styles
- `public/data/statutes.json`: source records, currently an empty array
- `vite.config.ts`: relative asset paths for static hosting

## Data format

Each record must contain nonempty string fields: `id` (unique), `section`, `title`, `text`, `sourceUrl`, and `retrievedAt` (an ISO date or timestamp). The loader currently accepts only HTTPS source URLs on `revisor.mo.gov`, and rejects malformed records or duplicate IDs.

Use verified text from the [Missouri Revisor of Statutes](https://revisor.mo.gov/). Preserve section numbers, source links, retrieval dates, effective dates, and revision history when designing the ingestion pipeline. A retrieval date is not an effective date. Source and coverage checks must precede publication.

Search runs locally in the browser over section numbers, titles, and text. Results use text nodes rather than inserting statute text as HTML. The initial UI displays at most 50 results per query.

## Next steps

1. Define the initial statutory coverage and source update process.
2. Add a reproducible import pipeline with provenance and effective-date metadata.
3. Verify search quality, accessibility, and performance on the intended corpus.
4. Configure static hosting and domains only when separately approved.

## Project notice

This is an independent project, not affiliated with the State of Missouri. It is not legal advice. Users should verify current law and effective dates with official sources.

## Stack documentation

- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/guide/)
- [MiniSearch](https://lucaong.github.io/minisearch/)

No software license has been selected yet.
