# Proposal: add-form-input

## Why

`form-input` is the S4 create-flow capability and the **M4 demo milestone**: the
user fills an invoice and sees a live HTML preview. Every upstream dependency
now ships — `shell`, `supplier-profile`, `client-directory`, `nace-catalog`,
`banking`, and `document-render` (`renderInvoice` on `main`). The new-invoice
route is still a placeholder (`src/app/(dashboard)/invoices/new/page.tsx`), so
the render pipeline has no UI entry point.

Structured form input replaces the deferred chat/LLM path (`FR-INPUT-03` dropped).
This change delivers FR-INPUT-01, FR-INPUT-02, and FR-INPUT-04 with BC-UX-01
error UX, wiring client-directory prefills, NACE service matching, and live
preview via `document-render` — without persisting invoices (`invoice-registry`
is S5).

## What Changes

- New invoice creation page at `/invoices/new` with a split layout: structured
  form (left) and live HTML preview (right).
- `InvoiceForm` component covering client selection/prefill, customer fields,
  currency (USD | EUR), service description, quantity, unit price, prepayment
  %, payment and execution terms, optional project name.
- Zod schema (`src/lib/validation/invoice-input.ts`) validating email, phone,
  amounts, currency, and prepayment 0–100 (TC-STACK-05).
- Client picker wired to `client-directory` storage — selecting a client
  prefills customer fields from stored values.
- Service text resolved via `matchServiceText` from `nace-catalog`; ambiguous
  matches surface a clarifying choice (never silent first-wins).
- Short key-value paste path (FR-INPUT-02): parser for keys
  `client`, `addr`, `email`, `phone`, `web`, `curr`, `service`, `qty`,
  `amount`, `prepay`, `pay_days`, `exec_days` populates the structured form.
- Live preview: valid form state → `renderInvoice` → preview panel (iframe or
  sandboxed HTML container); render errors (e.g. `MissingIbanError`) shown with
  BC-UX-01 explain + example messaging.
- Delta spec adds BC-UX-01, NFR-A11Y-01, and NFR-OBS-01 scenarios to
  `form-input` alongside the existing FR-INPUT requirements.
- Vitest coverage for Zod schema, short-format parser, and form-to-render
  mapping helpers.

## Capabilities

### New Capabilities

(none — `openspec/specs/form-input/spec.md` already exists)

### Modified Capabilities

- `form-input`: promote FR-INPUT-01/02/04 from proposed to normative with
  concrete scenarios; add BC-UX-01 (explain + example on validation/render
  failure), NFR-A11Y-01 (keyboard reachability, labels), NFR-OBS-01 (no console
  errors on healthy preview path), client-picker prefill, NACE ambiguous-match
  UX, and live-preview wiring scenarios.

## Impact

- **New files:**
  - `src/components/invoices/invoice-form.tsx`
  - `src/components/invoices/invoice-preview-panel.tsx`
  - `src/components/invoices/short-format-parser.ts` (+ tests)
  - `src/lib/validation/invoice-input.ts` (+ tests)
  - `src/lib/invoices/form-to-render.ts` (+ tests) — maps validated form state
    to `RenderInvoiceInput`
- **Modified files:**
  - `src/app/(dashboard)/invoices/new/page.tsx` — full create flow
- **Consumes (no changes expected):**
  - `src/lib/render/render-invoice.ts`
  - `src/lib/storage/clients.ts`, `src/lib/storage/supplier-profiles.ts`
  - `src/lib/nace/match.ts`
  - `src/lib/invoice-calc/*`
- **Explicitly out of bounds:** invoice persistence (`invoice-registry`), PDF
  export (`export-share` pdf gate), edit-by-number (`invoice-edit`), chat/LLM
  input, server-side mutation routes.
- **Unblocks:** `export-share` preview gate, `invoice-registry` (S5).
- **Requirements covered:** FR-INPUT-01, FR-INPUT-02, FR-INPUT-04, BC-UX-01,
  NFR-A11Y-01, NFR-OBS-01, TC-STACK-05; integrates FR-NACE-05, FR-BANK-01,
  FR-CALC-01…06, FR-TPL-01…05 via `renderInvoice`.

## Non-goals

- No saving invoices to browser storage — `invoice-registry` owns persistence.
- No PDF download or print route — `export-share` (S4 preview gate ships after
  or alongside; PDF is S6).
- No chat/LLM natural-language input (`FR-CHAT-*`, `FR-INPUT-03`).
- No edit or duplicate of existing invoices (`invoice-edit`).
- No redesign of `docs/invoice-template.html` or payment-terms legal wording.
- No server round-trips for form mutation; preview runs client-side.

## Success criteria

- User opens `/invoices/new`, fills required fields (or pastes short format),
  and sees a live HTML preview update without console errors (NFR-OBS-01).
- Selecting a client from the directory prefills customer name, address, email,
  phone, and website.
- Invalid email, phone, currency, amount, or prepayment shows an error with
  explanation and a valid example (BC-UX-01).
- Ambiguous NACE match prompts user to pick; no silent wrong classification.
- `MissingIbanError` for the selected currency surfaces a clear fix path
  (Settings → supplier profile).
- Keyboard navigation reaches all form fields and the preview region
  (NFR-A11Y-01).
- `npm run typecheck && npm run lint && npm run build && npm run test` green;
  `openspec validate add-form-input --strict` passes.
- After `/opsx:sync`: `form-input: shipped` in `capability-map.yaml`, M4 demo
  milestone reachable.
