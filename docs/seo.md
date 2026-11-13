# Search visibility

The site publishes a homepage, a chapter directory and 458 populated chapter pages. Together these are the 460 canonical URLs in `sitemap.xml`. The ten empty chapter indexes remain explicit official-source links in the directory, rather than empty local landing pages.

## What ships

- Titles and descriptions specific to each page, canonical HTTPS URLs and one main heading per page.
- Actual HTML links from the homepage to the directory, from the directory to each chapter, and between adjacent chapters. Headings and source links are in the initial HTML; no search submission or JavaScript is required to read chapter pages.
- All collected source versions, exact Revisor links, retrieval dates, footnotes, constitutional warnings, contingent-date notices and reprint explanations. The pages reproduce headings, not full statute text. Labels explicitly state the date they were evaluated; a build is not a source recheck.
- `WebSite` structured data on the homepage and `CollectionPage`/`BreadcrumbList` data on directory pages. These describe the actual content; they do not claim government affiliation or legal authority.
- A generated sitemap referenced by `robots.txt`. There are no invented modification dates, keyword tags or search-result URL permutations.
- Open Graph and Twitter sharing metadata, a 1200 × 630 sharing image, and SVG/PNG favicons.

All content comes from the existing validated dataset. The build fails on invalid data; deployment additionally requires the search tests and built-site audit to pass. Source updates remain a separate reviewed process.

## Verify a release

Run `npm test`, `npm run build`, then `npm run seo:check`. The latter checks every generated HTML page, unique titles, canonical URLs, descriptions, JSON-LD, internal destinations, the sitemap and sharing image dimensions. It runs in GitHub Actions before the Pages artifact is uploaded. The source tests also verify that every record retains its heading, exact source URL and applicable notices.

After deployment, check the public homepage, `/chapters/`, representative chapter pages, `/robots.txt` and `/sitemap.xml`. Check narrow screens and confirm that search still behaves as expected. An HTTP success or valid schema is not proof that a search engine has indexed a page.

## Search Console follow-up

Google Search Console ownership verification and sitemap submission have not been completed as part of this release. Once the owner has verified `showmestatutes.org`, submit `https://showmestatutes.org/sitemap.xml`, inspect a few chapter URLs, and monitor indexing exclusions and search performance. Sitemap publication helps discovery but does not guarantee indexing or rankings. Do not report these pages as indexed until Search Console or search results confirm it.

## Assets

Committed files in `static/` are copied into the build. `scripts/create-brand-assets.py` optionally regenerates the PNG images using Pillow and the Liberation Sans/Serif system fonts. It is not a build dependency. The SVG favicon is maintained directly.

## References

- [Google: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google: Crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Google: Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: Site names](https://developers.google.com/search/docs/appearance/site-names)
