# My Expense Map

A public, privacy-safe demo for exploring household expenses from the total amount down to domains, categories, months, and individual transactions.

The interface supports Hebrew and English and switches automatically between RTL and LTR layouts.

## Live application

After GitHub Pages is enabled, the application is published at:

`https://nsharet.github.io/myExpenseMap/`

## Current capabilities

- Bilingual landing page explaining the expense exploration flow.
- Local selection of multiple Excel, CSV, and JSON files by picker or drag and drop.
- Initial source detection for credit-card, bank-account, and financial-report filenames.
- File-type and 15 MB size validation.
- A preview of the planned validation, normalization, and categorization pipeline.
- Interactive drill-down: total expenses → domain → category → month → transactions.
- Search and sorting at the relevant levels.
- Manual correction for one record or all matching transactions from a normalized merchant.
- Browser-local classification rules with JSON export.
- Responsive Hebrew and English UI.

## Current import limitation

The upload and processing sequence is currently a product preview. Selected files are validated by name and size but are not read, uploaded, or stored. The explorer opens with synthetic demo data.

The next milestone is real client-side parsing and normalization for Excel, CSV, and JSON files, including an import preview, diagnostics, duplicate detection, and explicit confirmation before records enter the explorer.

## Privacy boundary

This public repository contains only synthetic demo records:

- `data/demo-expenses.json`
- `data/demo-category-rules.json`

Do not commit real statements, transaction exports, merchant histories, account identifiers, or personal classification rules to this repository. Real file processing must remain local to the browser until authenticated per-user storage is implemented.

## Local development

Node.js 20 or newer and npm are required.

```bash
npm install
npm run dev
```

## Tests and production build

```bash
npm test
npm run build
npm run preview
```

The production build uses the `/myExpenseMap/` GitHub Pages base path and writes output to `dist/`.

## GitHub Pages deployment

`.github/workflows/deploy-pages.yml` runs the test suite, builds the application, and deploys `dist/` after every push to `main`.

Enable it once under **Settings → Pages → Build and deployment → Source → GitHub Actions**.

## Adding another language

Language resources are under `src/i18n/`. Add a locale module under `src/i18n/locales/`, add taxonomy translations when needed, and register the locale in `src/i18n/locales/index.ts`.

See `docs/adding-a-language.md` for the complete workflow.

## Project structure

```text
.github/workflows/deploy-pages.yml
data/
  demo-expenses.json
  demo-category-rules.json
docs/
  adding-a-language.md
src/
  App.tsx
  Onboarding.tsx
  classification.ts
  imports.ts
  i18n/
  styles.css
```
