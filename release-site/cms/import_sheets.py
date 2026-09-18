#!/usr/bin/env python3
"""Validate exported Google Sheets CSV tabs and generate CMS JSON artifacts.

This importer deliberately accepts local CSV exports only. It does not contain
credentials or write to Google Sheets, keeping publishing explicit and reviewable.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any

LOCALES = {"zh-tw", "en"}
CATEGORIES = {"cycling", "fitness"}
STATUSES = {"draft", "published", "archived"}
RELEASE_STATUSES = {
    "draft", "validation_failed", "ready_for_review", "approved",
    "published", "rejected", "rolled_back",
}
CONTENT_TYPES = {"plain_text", "url", "boolean", "number"}
SAFE_PATH = re.compile(r"^/?[A-Za-z0-9._/-]+$")
HTML_TAG = re.compile(r"<\s*/?\s*[A-Za-z][^>]*>", re.IGNORECASE)

SCHEMAS = {
    "Products": (
        "product_id", "sku", "slug", "category", "brand", "visible",
        "featured", "sort_order", "image_folder", "status", "updated_at",
        "updated_by",
    ),
    "Product_Locales": (
        "product_id", "locale", "name", "short_description", "description",
        "seo_title", "seo_description", "contact_button_text", "status",
    ),
    "Product_Prices": (
        "product_id", "currency", "price_type", "amount", "tax_included",
        "effective_from", "effective_to", "status", "notes", "updated_by",
    ),
    "Content_Blocks": (
        "content_id", "content_key", "locale", "content_type", "value",
        "status", "effective_from", "effective_to", "updated_at", "updated_by",
    ),
    "Site_Settings": (
        "setting_key", "value", "value_type", "description", "status",
        "updated_at", "updated_by",
    ),
    "Release_Control": (
        "release_id", "status", "source_version", "created_by", "approved_by",
        "created_at", "reviewed_at", "published_at", "notes",
        "validation_status",
    ),
}


class ValidationError(Exception):
    pass


def read_tab(directory: Path, name: str) -> list[dict[str, str]]:
    path = directory / f"{name}.csv"
    if not path.exists():
        raise ValidationError(f"Missing required tab: {path}")
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != list(SCHEMAS[name]):
            raise ValidationError(
                f"{path}: expected columns {list(SCHEMAS[name])}, "
                f"got {reader.fieldnames}"
            )
        return [{key: (value or "").strip() for key, value in row.items()} for row in reader]


def required(row: dict[str, str], field: str, label: str) -> str:
    value = row[field]
    if not value:
        raise ValidationError(f"{label}: {field} is required")
    return value


def boolean(value: str, label: str) -> bool:
    if value not in {"TRUE", "FALSE"}:
        raise ValidationError(f"{label}: expected TRUE or FALSE, got {value!r}")
    return value == "TRUE"


def number(value: str, label: str) -> int | float:
    try:
        parsed = float(value)
    except ValueError as exc:
        raise ValidationError(f"{label}: expected a number, got {value!r}") from exc
    if parsed < 0:
        raise ValidationError(f"{label}: value cannot be negative")
    return int(parsed) if parsed.is_integer() else parsed


def unique(rows: list[dict[str, str]], field: str, label: str) -> None:
    seen: set[str] = set()
    for index, row in enumerate(rows, 2):
        value = row[field]
        if value in seen:
            raise ValidationError(f"{label} row {index}: duplicate {field} {value!r}")
        seen.add(value)


def validate(directory: Path) -> dict[str, list[dict[str, Any]]]:
    tabs = {name: read_tab(directory, name) for name in SCHEMAS}
    products = tabs["Products"]
    locales = tabs["Product_Locales"]
    prices = tabs["Product_Prices"]
    content = tabs["Content_Blocks"]
    settings = tabs["Site_Settings"]
    releases = tabs["Release_Control"]

    unique(products, "product_id", "Products")
    unique(products, "sku", "Products")
    unique(products, "slug", "Products")
    product_ids = set()
    for index, row in enumerate(products, 2):
        label = f"Products row {index}"
        product_ids.add(required(row, "product_id", label))
        required(row, "sku", label)
        required(row, "slug", label)
        if row["category"] not in CATEGORIES:
            raise ValidationError(f"{label}: invalid category {row['category']!r}")
        if row["status"] not in STATUSES:
            raise ValidationError(f"{label}: invalid status {row['status']!r}")
        boolean(row["visible"], label)
        boolean(row["featured"], label)
        number(row["sort_order"], label)
        if row["image_folder"] and not SAFE_PATH.fullmatch(row["image_folder"]):
            raise ValidationError(f"{label}: unsafe image_folder")

    locale_keys: set[tuple[str, str]] = set()
    for index, row in enumerate(locales, 2):
        label = f"Product_Locales row {index}"
        product_id = required(row, "product_id", label)
        locale = required(row, "locale", label)
        if product_id not in product_ids:
            raise ValidationError(f"{label}: unknown product_id {product_id!r}")
        if locale not in LOCALES:
            raise ValidationError(f"{label}: invalid locale {locale!r}")
        required(row, "name", label)
        if (product_id, locale) in locale_keys:
            raise ValidationError(f"{label}: duplicate product_id/locale")
        locale_keys.add((product_id, locale))
        if row["status"] not in STATUSES:
            raise ValidationError(f"{label}: invalid status {row['status']!r}")
        if HTML_TAG.search(row["name"] + row["short_description"] + row["description"]):
            raise ValidationError(f"{label}: HTML is not allowed in product text")

    price_keys: set[tuple[str, str, str]] = set()
    for index, row in enumerate(prices, 2):
        label = f"Product_Prices row {index}"
        product_id = required(row, "product_id", label)
        if product_id not in product_ids:
            raise ValidationError(f"{label}: unknown product_id {product_id!r}")
        currency = required(row, "currency", label)
        price_type = required(row, "price_type", label)
        if price_type not in {"retail", "sale", "dealer"}:
            raise ValidationError(f"{label}: invalid price_type {price_type!r}")
        key = (product_id, currency, price_type)
        if row["status"] == "active" and key in price_keys:
            raise ValidationError(f"{label}: duplicate active price")
        if row["status"] == "active":
            price_keys.add(key)
        row["_amount"] = number(row["amount"], label)
        boolean(row["tax_included"], label)

    content_keys: set[tuple[str, str]] = set()
    for index, row in enumerate(content, 2):
        label = f"Content_Blocks row {index}"
        key = required(row, "content_key", label)
        locale = required(row, "locale", label)
        if locale not in LOCALES:
            raise ValidationError(f"{label}: invalid locale {locale!r}")
        if row["content_type"] not in CONTENT_TYPES:
            raise ValidationError(f"{label}: invalid content_type")
        if (key, locale) in content_keys:
            raise ValidationError(f"{label}: duplicate content_key/locale")
        content_keys.add((key, locale))
        if row["content_type"] == "url" and row["value"] and not re.match(r"^https?://", row["value"]):
            raise ValidationError(f"{label}: URL must use http or https")
        if row["content_type"] == "plain_text" and HTML_TAG.search(row["value"]):
            raise ValidationError(f"{label}: HTML is not allowed in plain_text")

    unique(settings, "setting_key", "Site_Settings")
    for index, row in enumerate(settings, 2):
        label = f"Site_Settings row {index}"
        required(row, "setting_key", label)
        if row["value_type"] not in {"string", "number", "boolean"}:
            raise ValidationError(f"{label}: invalid value_type")
        if row["value_type"] == "boolean":
            boolean(row["value"], label)
        elif row["value_type"] == "number":
            number(row["value"], label)

    unique(releases, "release_id", "Release_Control")
    for index, row in enumerate(releases, 2):
        label = f"Release_Control row {index}"
        required(row, "release_id", label)
        if row["status"] not in RELEASE_STATUSES:
            raise ValidationError(f"{label}: invalid status")
        if row["validation_status"] not in {"pending", "passed", "failed"}:
            raise ValidationError(f"{label}: invalid validation_status")

    tabs["Product_Prices"] = [
        {key: value for key, value in row.items() if key != "_amount"} | {"amount": row["_amount"]}
        for row in tabs["Product_Prices"]
    ]
    return tabs


def generate(tabs: dict[str, list[dict[str, Any]]], output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    (output / "catalog-cms.json").write_text(
        json.dumps(
            {
                "schema_version": 1,
                "products": tabs["Products"],
                "locales": tabs["Product_Locales"],
                "prices": tabs["Product_Prices"],
            },
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    (output / "site-content.json").write_text(
        json.dumps(
            {
                "schema_version": 1,
                "content_blocks": tabs["Content_Blocks"],
                "settings": tabs["Site_Settings"],
            },
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    (output / "release-control.json").write_text(
        json.dumps({"schema_version": 1, "releases": tabs["Release_Control"]}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="Directory containing exported CSV tabs")
    parser.add_argument("--output", type=Path, required=True, help="Directory for generated JSON")
    args = parser.parse_args()
    try:
        tabs = validate(args.input)
        generate(tabs, args.output)
    except ValidationError as exc:
        print(f"CMS validation failed: {exc}")
        return 1
    print(f"CMS validation passed: {sum(len(rows) for rows in tabs.values())} rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
