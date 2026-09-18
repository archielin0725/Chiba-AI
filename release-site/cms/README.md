# Sheets CMS staging importer

This directory is the staging foundation for catalog/content management. Export
the private Google Sheets tabs as UTF-8 CSV files into a separate directory, then
run:

```bash
python3 cms/import_sheets.py \
  --input cms/sheets \
  --output snapshot/data/cms
```

The importer validates the workbook before generating:

- `snapshot/data/cms/catalog-cms.json`
- `snapshot/data/cms/site-content.json`
- `snapshot/data/cms/release-control.json`

The checked-in files in `cms/sheets/` contain headers only. Do not put customer
data, payment details, credentials, or API keys in these tabs.

## Publishing workflow

1. Edit a private Google Sheet.
2. Export each tab as UTF-8 CSV into a temporary input directory.
3. Run the importer and fix every validation error.
4. Run the release review command:

   ```bash
   python3 cms/release.py
   ```

5. Review `cms/RELEASE-REVIEW.txt`, the generated JSON, and the site diff.
6. Build and test the static snapshot.
7. Record approval only after review:

   ```bash
   python3 cms/release.py --approve
   ```

8. Commit the approved generated artifacts and deploy separately.

This first version is catalog/content-only. Checkout, orders, inventory
reservation, payments, and customer accounts remain out of scope.
