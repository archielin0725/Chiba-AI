# CHIBA Taiwan static release

Frozen public-only static snapshot, not the private CHIBA AI source library.
Cloudflare Pages **Git integration only**. Do not use Direct Upload.

- Repository root directory: `release-site`
- Framework preset: None
- Build command: `SITE_ENV=production python3 build.py`
- Build output directory: `dist`
- Branch: `main`
- No build secrets, environment variables, Functions, analytics or payments required.

The source snapshot retains staging-safe indexing protections. The build profile
controls the deployed behavior:

- `SITE_ENV=staging python3 build.py` keeps `noindex`, `Disallow: /`, and the
  `X-Robots-Tag` staging protection.
- `SITE_ENV=production python3 build.py` creates an indexable deployment with
  `index,follow`, crawlable `robots.txt`, and no `X-Robots-Tag: noindex`.

Cloudflare Pages production must use `SITE_ENV=production` as an environment
variable or in its build command. Preview/staging deployments must use
`SITE_ENV=staging`.
Do not change DNS or enable automatic Web Analytics.

The snapshot is the editable source for this exact static release; release.json
binds every file to its hash and the frozen catalogue identity. Future updates
must be exported from the local audited pipeline, tested, and committed explicitly.
Do not copy private workbooks, reports, credentials or source-library documents here.
