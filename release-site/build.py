"""Build the frozen snapshot with explicit staging/production SEO behavior."""
from pathlib import Path
import hashlib
import json
import os
import shutil

P=Path(__file__).resolve().parent


def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()


def build_environment():
    configured = os.environ.get("SITE_ENV")
    if configured:
        if configured not in {"staging", "production"}:
            raise SystemExit("SITE_ENV must be staging or production")
        return configured
    return "production"


def apply_environment(out, environment):
    if environment == "staging":
        return
    robots = out / "robots.txt"
    robots.write_text(
        "User-agent: *\nAllow: /\n\n"
        "Sitemap: https://www.chibataiwan.com/sitemap.xml\n",
        encoding="utf-8",
    )
    headers = out / "_headers"
    headers.write_text(
        "\n".join(
            line for line in headers.read_text(encoding="utf-8").splitlines()
            if "X-Robots-Tag:" not in line
        ) + "\n",
        encoding="utf-8",
    )
    for html in out.rglob("*.html"):
        if html.is_relative_to(out / "admin"):
            continue
        content = html.read_text(encoding="utf-8")
        content = content.replace(
            '<meta name="robots" content="noindex,nofollow">',
            '<meta name="robots" content="index,follow">',
        )
        content = content.replace(
            '<meta name="robots" content="noindex, nofollow">',
            '<meta name="robots" content="index,follow">',
        )
        content = content.replace(
            '<meta name="robots" content="noindex,follow">',
            '<meta name="robots" content="index,follow">',
        )
        html.write_text(content, encoding="utf-8")


m=json.loads((P/'release.json').read_text())
files={str(f.relative_to(P/'snapshot')):sha(f) for f in (P/'snapshot').rglob('*') if f.is_file()}
assert files==m['files'],'Snapshot differs from reviewed release'
assert not any(f.is_symlink() for f in (P/'snapshot').rglob('*'))
out=P/'dist'
assert not out.exists(),'Output exists; use a clean checkout, do not overwrite'
shutil.copytree(P/'snapshot',out)
environment = build_environment()
apply_environment(out, environment)
print(f'Verified {environment} build:',m['release_id'],len(files),'files')
