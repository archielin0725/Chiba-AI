# CHIBA Taiwan staging release

Frozen public-only static snapshot, not the private CHIBA AI source library.
Cloudflare Pages **Git integration only**. Do not use Direct Upload.

- Repository root directory: `release-site`
- Framework preset: None
- Build command: `python3 build.py`
- Build output directory: `dist`
- Branch: `main`
- No build secrets, environment variables, Functions, analytics or payments required.

This branch is staging-only: keep noindex and do not attach the production domain.
Production promotion requires a separately reviewed indexable artifact and approval.
Canonical future origin: https://www.chibataiwan.com.
Do not change DNS or enable automatic Web Analytics.

The snapshot is the editable source for this exact static release; release.json
binds every file to its hash and the frozen catalogue identity. Future updates
must be exported from the local audited pipeline, tested, and committed explicitly.
Do not copy private workbooks, reports, credentials or source-library documents here.
