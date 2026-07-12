# Capability: `document-render`

[← Capability map](../capability.md) · **Depends on:** [invoice-calc](invoice-calc.md), [banking](banking.md), [nace-catalog](nace-catalog.md) · **Unblocks:** [form-input](form-input.md), [export-share](export-share.md), [invoice-registry](invoice-registry.md)

| Field | Value |
| --- | --- |
| Slice | S3 — Render pipeline |
| Order | #4 |
| Owner | domain |
| Gate status | **shipped** (2026-07-10, `feat/document-render`) |
| OpenSpec spec | [document-render/spec.md](../../openspec/specs/document-render/spec.md) |
| OpenSpec change | `add-document-render` (archive after PR merge) |

## Purpose

Fill `docs/invoice-template.html` with computed variables → self-contained
bilingual HTML. Source of truth for both browser preview and PDF route.

## Requirements

| ID | Description | Status |
| --- | --- | --- |
| FR-TPL-01 | Replace `{{VARIABLE_NAME}}` placeholders; escape text, fail closed | shipped |
| FR-TPL-02 | Fixed title, subtitle, TERMS, signature unchanged | shipped |
| FR-TPL-03 | `{{SERVICE_ROWS}}` bilingual table rows | shipped |
| FR-TPL-04 | Optional `{{PROJECT_BLOCK}}` | shipped |
| FR-TPL-05 | Self-contained HTML + A4 print CSS + embedded fonts | shipped |
| BC-LEGAL-01 | TERMS block immutable | accepted |
| NFR-PERF-02 | Single render < 200 ms | shipped |

Also: BC-I18N-01, BC-BRAND-01, TC-STACK-03, TC-STACK-06

## Implementation scope

| Area | Path |
| --- | --- |
| Template source | `docs/invoice-template.html` (read-only; single source of truth) |
| Fonts | `docs/fonts/*.woff2` (Inter v20 variable, 3 subsets) + `OFL.txt` — see [README](../fonts/README.md) |
| Generated constant | `src/lib/render/template.ts` via `npm run template:sync`; `template:check` runs inside `build` |
| Render engine | `src/lib/render/fill-template.ts` (escape-by-default, single pass) |
| Fragment builders | `src/lib/render/service-rows.ts` (`buildServiceRows`, `buildProjectBlock`) |
| Composition | `src/lib/render/render-invoice.ts` (`renderInvoice`) |
| Tests | 37 Vitest cases across the three modules |

## Verification

- [x] All template placeholders have values or intentional empty
- [x] SERVICE_ROWS match line items from calc (`unit price × quantity`)
- [x] TERMS section byte-identical to template
- [x] Render < 200 ms for single invoice (NFR-PERF-02)
- [x] Output opens standalone in browser (embedded CSS, A4 `@page`)
- [x] **No external network dependency** — Inter embedded as `data:` URIs
- [x] `№` (U+2116) covered by the embedded Cyrillic subset, even for English invoices
- [x] Weights 500–800 are real variable instances (no synthesised bold)
- [x] Hostile values escaped — no markup injection through invoice data

## Done when

- Template fill from `docs/invoice-template.html`
- Self-contained HTML with embedded CSS **and embedded fonts** (no network)
- SERVICE_ROWS and optional PROJECT_BLOCK expansion

## Fonts (`add-embedded-fonts`)

`scripts/sync-template.mjs` replaces the template's Google Fonts `@import` with
three `@font-face` rules whose `src` is a base64 `data:` URI. Consequences:

- **Identical everywhere.** Preview, saved HTML, and offline headless Chromium
  render the same document — a font fallback fails *silently*, so this had to be
  removed rather than monitored.
- **No PII leak.** A document holding client and supplier data no longer issues a
  third-party request on every render.
- **Real weights.** The vendored files are variable (`font-weight: 300 800`), so
  the `800` title is a real instance. `pdffonts` on the pre-change prototypes
  showed synthesised `Inter-Regular_Bold` / `_SemiBold`.
- **The `№` trap.** `U+2116` belongs to Google's *cyrillic* subset, and
  `paymentPurpose` (FR-CALC-06) emits it inside an English string — so an
  English-only invoice depends on that subset too.

Cost: ~198 KB of base64 in `src/lib/render/template.ts` (21 KB → ~220 KB), landing
in the preview route's chunk. Provenance, hashes and licence: [`docs/fonts/README.md`](../fonts/README.md).

Still open in wayfinder ticket 05: Chromium's print path embeds glyphs as
`Type 3` procedures. Font *availability* is no longer a variable in that
investigation.

## After shipping

Unlocks **S4** — form + preview can wire to this pipeline.
