#!/usr/bin/env python3
"""Prepare a reviewable catalog/content release; never deploys automatically."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORTER = ROOT / "cms" / "import_sheets.py"
DEFAULT_INPUT = ROOT / "cms" / "sheets"
DEFAULT_OUTPUT = ROOT / "snapshot" / "data" / "cms"
DEFAULT_REPORT = ROOT / "cms" / "RELEASE-REVIEW.txt"


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def summarize(before: dict, after: dict) -> list[str]:
    lines: list[str] = []
    before_products = {row["product_id"]: row for row in before.get("products", [])}
    after_products = {row["product_id"]: row for row in after.get("products", [])}
    before_prices = {
        (row["product_id"], row["currency"], row["price_type"]): row
        for row in before.get("prices", [])
    }
    after_prices = {
        (row["product_id"], row["currency"], row["price_type"]): row
        for row in after.get("prices", [])
    }

    for product_id in sorted(set(after_products) - set(before_products)):
        lines.append(f"Product added: {product_id}")
    for product_id in sorted(set(before_products) - set(after_products)):
        lines.append(f"Product removed: {product_id}")
    for product_id in sorted(set(before_products) & set(after_products)):
        old = before_products[product_id]
        new = after_products[product_id]
        for field in ("visible", "featured", "sort_order", "status"):
            if old.get(field) != new.get(field):
                lines.append(f"{product_id} {field}: {old.get(field)} -> {new.get(field)}")

    for key in sorted(set(after_prices) | set(before_prices)):
        old = before_prices.get(key, {}).get("amount")
        new = after_prices.get(key, {}).get("amount")
        if old != new:
            lines.append(f"{key[0]} price ({key[2]}): {old if old is not None else 'new'} -> {new if new is not None else 'removed'}")

    before_content = {
        (row["content_key"], row["locale"]): row.get("value", "")
        for row in before.get("content_blocks", [])
    }
    after_content = {
        (row["content_key"], row["locale"]): row.get("value", "")
        for row in after.get("content_blocks", [])
    }
    for key in sorted(set(after_content) | set(before_content)):
        if before_content.get(key) != after_content.get(key):
            lines.append(f"Content changed: {key[0]} [{key[1]}]")
    return lines


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--approve", action="store_true", help="Record approval after review; does not deploy")
    args = parser.parse_args()

    previous = load_json(args.output / "catalog-cms.json")
    command = [
        sys.executable,
        str(IMPORTER),
        "--input",
        str(args.input),
        "--output",
        str(args.output),
    ]
    result = subprocess.run(command, cwd=ROOT.parent.parent)
    if result.returncode:
        return result.returncode

    current = load_json(args.output / "catalog-cms.json")
    changes = summarize(previous, current)
    timestamp = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    report = [
        "CHIBA CMS RELEASE REVIEW",
        "========================",
        f"Generated: {timestamp}",
        f"Input: {args.input}",
        f"Output: {args.output}",
        "",
        "Approval status: APPROVED" if args.approve else "Approval status: PENDING",
        "",
        "Change summary:",
    ]
    report.extend(f"- {line}" for line in changes) if changes else report.append("- No catalog changes detected")
    report.extend([
        "",
        "Manual checklist:",
        "- [ ] Product names, prices, and descriptions reviewed",
        "- [ ] Chinese and English content reviewed",
        "- [ ] Footer and announcement content reviewed",
        "- [ ] Generated staging site tested on desktop and mobile",
        "- [ ] Checkout remains disabled",
        "- [ ] Release diff and rollback version understood",
        "- [ ] Production deployment approved separately",
    ])
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text("\n".join(report) + "\n", encoding="utf-8")
    print(f"Release review written to {args.report}")
    if not args.approve:
        print("Approval is pending. Review the report and staging build; no deployment was performed.")
    else:
        print("Approval recorded locally. Deployment still requires a separate explicit action.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
