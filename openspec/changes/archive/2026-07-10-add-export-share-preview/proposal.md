# Proposal: add-export-share-preview

## Why

S4 `form-input` shipped the M4 demo milestone — structured input with live HTML
preview on `/invoices/new`. The user can see the rendered invoice but cannot yet
**take it out of the app**: download a standalone HTML file or print A4 from the
browser. The **preview gate** of `export-share` (S4b) closes that gap and
completes the core create → preview → export loop for the 1–2 minute demo video
(BC-DEMO-01) without waiting for the S6 PDF route or wayfinder 05 (Type 3 glyphs).

Dependencies `document-render` and `form-input` are shipped; this is the next
capability on the roadmap (`docs/current-state.md`).

## What Changes

- Export action bar on the invoice preview surface: **Download HTML** and **Print**
  (disabled until preview HTML is available and form validation passes).
- Client-side HTML download: serialize the same `renderInvoice` output the live
  preview shows into a `.html` Blob with embedded styles so the file opens
  offline (FR-EXPORT-02).
- Browser print: trigger A4-oriented print on the preview document via
  `window.print()` on a dedicated print target (iframe or print-only window)
  with `@page` / print CSS aligned to `docs/invoice-template.html` (FR-EXPORT-03).
- Formalize FR-EXPORT-01 ownership in `export-share`: live preview already exists
  via `InvoicePreviewPanel`; this change adds export actions and delta spec
  scenarios without duplicating render logic.
- Vitest coverage for HTML download helper (filename, MIME, self-contained
  markup) and print-target readiness guard.
- **Out of scope for this change:** `POST /api/pdf`, Web Share API, server
  routes, or invoice persistence — those belong to the pdf gate (S6) and
  `invoice-registry` (S5).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `export-share`: add normative preview-gate requirements and scenarios for
  FR-EXPORT-01 (live preview contract), FR-EXPORT-02 (HTML download), and
  FR-EXPORT-03 (browser print A4). PDF requirements (FR-EXPORT-04, FR-EXPORT-05,
  TC-PDF-01) remain proposed — not implemented in this change.

## Impact

- **New files:**
  - `src/lib/export/download-invoice-html.ts` (+ tests) — Blob download from
    rendered HTML string
  - `src/lib/export/print-invoice-html.ts` (+ tests) — print orchestration
  - `src/components/invoices/invoice-export-actions.tsx` — Download / Print
    buttons wired to preview state
- **Modified files:**
  - `src/components/invoices/invoice-preview-panel.tsx` — expose print target
    ref or callback; optional `@media print` hook surface
  - `src/components/invoices/new-invoice-page-content.tsx` — mount export actions
    above or inside preview panel header
- **Consumes (no changes expected):**
  - `src/lib/render/render-invoice.ts` — same HTML as live preview
  - `src/components/invoices/invoice-form.tsx` — preview state (`html`, errors)
- **Explicitly out of bounds:** `src/app/api/pdf/route.ts`, puppeteer/chromium,
  Web Share API, invoice storage, edit flow.
- **Unblocks:** `export-share` pdf gate (S6), demo recording (BC-DEMO-01),
  `invoice-registry` can proceed in parallel.
- **Requirements covered:** FR-EXPORT-01, FR-EXPORT-02, FR-EXPORT-03,
  BC-DEMO-01 (partial — HTML path only; PDF remains S6).

## Non-goals

- No PDF generation or `POST /api/pdf` — deferred to `add-export-share-pdf` (S6).
- No Web Share API — pdf gate only (FR-EXPORT-05).
- No saving invoices to browser storage — `invoice-registry` owns persistence.
- No hosted share URLs, email delivery, or Telegram/WhatsApp integrations.
- No redesign of `docs/invoice-template.html` layout — reuse `renderInvoice`
  output byte-for-byte for download/print.
- No server-side rendering of preview or export payloads.

## Success criteria

- On `/invoices/new`, when the form is valid and preview HTML is shown, the user
  can download a `.html` file that opens offline with correct styling and invoice
  content (FR-EXPORT-02).
- The user can open the browser print dialog from the preview surface and see
  A4-oriented layout without horizontal overflow (FR-EXPORT-03).
- Export actions are disabled with clear affordance when preview is empty or
  render errors block output (BC-UX-01 pattern from form-input).
- Live preview continues to update from form state without regression
  (FR-EXPORT-01).
- `npm run typecheck && npm run lint && npm run build && npm run test` green;
  `openspec validate add-export-share-preview --strict` passes.
- After `/opsx:sync` and gate check: `export-share` preview gate marked
  `shipped` in `capability-map.yaml`.
