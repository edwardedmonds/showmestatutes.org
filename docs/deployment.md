# GitHub Pages and domains

Public publishing was authorized on November 12, 2026. The canonical domain is `showmestatutes.org`; the repository is [edwardedmonds/show-me-statutes](https://github.com/edwardedmonds/showmestatutes.org).

GitHub Pages uses GitHub Actions. Pushes to `main` validate the checked-in snapshot, run parser and search tests, build Vite, and deploy the resulting `dist` artifact. Pull requests only validate. Crawling the source remains a separate manual operation. The deployment job alone has Pages write and identity-token permissions; checkout credentials are not persisted.

## Scheduled offline rebuilds

The Pages workflow also runs on two UTC cron schedules so static HTML effective-date labels (`Effective`, `Upcoming`, and `Version labels evaluated as of <date>`) stay current without adding client-side JavaScript to static pages or scraping `revisor.mo.gov`:

- `0 7 1 * *` — 1st of every month at 07:00 UTC (01:00 CST / 02:00 CDT in `America/Chicago`), covering January 1 and July 1 statutory transitions as well as monthly freshness.
- `0 7 28 8 *` — August 28 at 07:00 UTC, covering Missouri's standard regular-session statutory effective-date boundary (Mo. Const. art. III, § 29).

Scheduled runs build strictly offline from the checked-in `public/data/statutes.json` snapshot and run the full validation, test, and `seo:check` gates before deploying.

> **60-day idle-repository caveat:** GitHub automatically disables scheduled workflows in public repositories after 60 days with no repository activity. Pushing a commit or manually running the workflow via `workflow_dispatch` re-enables the schedule. Even if a scheduled rebuild is paused, every static page prints the exact `"Version labels evaluated as of <date>"` date, and the interactive homepage search evaluates dates live in Missouri time.

## DNS

Squarespace manages both domains. For `.org`, the parking-page preset was replaced with four apex A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`. `www` is a CNAME to `edwardedmonds.github.io`. TTL is four hours. Domain Connect and email security TXT records are preserved. The repository's Pages custom domain is `showmestatutes.org`.

Squarespace forwarding sends both `showmestatutes.com` and `www.showmestatutes.com` to `https://showmestatutes.org`, using permanent (301) redirects with paths maintained. The `.com` parking preset must be removed to avoid its `www` CNAME conflicting with the forwarding rule.

On November 12, 2026, the GitHub account was renamed to `edwardedmonds`, and the `www` CNAME was updated to match. Public DNS confirms the new target. HTTPS certificate validation passes, GitHub's Enforce HTTPS is enabled, and HTTP, `www.org`, `.com` and `www.com` reach the canonical HTTPS site.

DNS propagation and certificate issuance are asynchronous. After future hosting changes, verify the actual HTTPS site and redirects before treating publication as complete. Do not bypass certificate warnings.

## Recovery

A failed validation or build must leave the previous Pages release in place. Restore a known-good commit on `main` and rerun validation to publish a rollback. Do not deploy an incomplete candidate or raw cache. Preserve the canonical domain setting during code rollbacks. If changing hosts later, configure ownership at the new host before changing DNS, and retain email-related records.

Official setup references: [GitHub custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [GitHub custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), and [Squarespace domain forwarding](https://support.squarespace.com/hc/en-us/articles/214767107-Forwarding-a-domain).
