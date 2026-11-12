# GitHub Pages and domains

Public publishing was authorized on November 12, 2026. The canonical domain is `showmestatutes.org`; the repository is [deths74r/show-me-statutes](https://github.com/deths74r/show-me-statutes).

GitHub Pages uses GitHub Actions. Pushes to `main` validate the checked-in snapshot, run parser and search tests, build Vite, and deploy the resulting `dist` artifact. Pull requests only validate. Crawling the source remains a separate manual operation. The deployment job alone has Pages write and identity-token permissions; checkout credentials are not persisted.

## DNS

Squarespace manages both domains. For `.org`, the parking-page preset was replaced with four apex A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`. `www` is a CNAME to `deths74r.github.io`. TTL is four hours. Domain Connect and email security TXT records are preserved. The repository's Pages custom domain is `showmestatutes.org`.

Squarespace forwarding sends both `showmestatutes.com` and `www.showmestatutes.com` to `https://showmestatutes.org`, using permanent (301) redirects with paths maintained. The `.com` parking preset must be removed to avoid its `www` CNAME conflicting with the forwarding rule.

DNS propagation and certificate issuance are asynchronous. Verify the actual HTTPS site and redirects before treating publication as complete. Enable GitHub's Enforce HTTPS once its certificate is ready. Do not bypass certificate warnings.

## Recovery

A failed validation or build must leave the previous Pages release in place. Restore a known-good commit on `main` and rerun validation to publish a rollback. Do not deploy an incomplete candidate or raw cache. Preserve the canonical domain setting during code rollbacks. If changing hosts later, configure ownership at the new host before changing DNS, and retain email-related records.

Official setup references: [GitHub custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [GitHub custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), and [Squarespace domain forwarding](https://support.squarespace.com/hc/en-us/articles/214767107-Forwarding-a-domain).
