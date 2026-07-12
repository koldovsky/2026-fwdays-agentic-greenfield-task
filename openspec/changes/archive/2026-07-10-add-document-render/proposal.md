# Proposal: add-document-render

## Why

`document-render` is the last capability before the M4 demo path (`form-input`
→ live preview). Every upstream dependency now ships: `invoice-calc` (money,
dates, numbering, purpose), `nace-catalog` (bilingual service descriptions),
and `banking` (supplier block variables, PR #7). Nothing yet turns those values
into the actual invoice: `docs/invoice-template.html` has **35 distinct
`{{PLACEHOLDER}}` tokens** and no engine to fill them.

The S2 adversarial review also surfaced an ownership gap that must be closed
here: the banking security lens flagged that `SUPPLIER_*` values are raw,
user-entered strings destined for HTML, and no capability yet owns escaping.
Refuters agreed the responsibility belongs to the fill step (FR-TPL-01) — this
change makes that explicit rather than leaving a stored-XSS hole for S4.

## What Changes

- New pure domain module `src/lib/render/`:
  - `fill-template.ts` — `fillTemplate(template, vars)`: replaces every
    `{{VARIABLE_NAME}}` token, **HTML-escaping all text values**; throws a
    typed `TemplateRenderError` when a placeholder is missing or an unknown
    variable is supplied (no `{{…}}` may survive into output).
  - `service-rows.ts` — `buildServiceRows(lineItems)`: expands
    `{{SERVICE_ROWS}}` into `<tr>` markup with bilingual description, quantity,
    unit price, and line amount (FR-TPL-03), escaping every interpolated value.
  - `project-block.ts` (or a `buildProjectBlock` export): renders the optional
    `{{PROJECT_BLOCK}}` fragment, or an empty string when absent (FR-TPL-04).
  - `render-invoice.ts` — composes the above with `invoice-calc`, `banking`,
    and client fields into the final self-contained HTML document.
- `src/lib/render/template.ts` — the template source as an importable constant
  (browser + node), generated from `docs/invoice-template.html` by
  `scripts/sync-template.mjs` (`npm run template:sync`), with a drift test that
  fails if the generated constant and the doc diverge. `docs/invoice-template.html`
  remains the single source of truth and is never mutated at runtime.
- Vitest coverage: placeholder completeness, escaping, service-row expansion,
  optional project block, TERMS byte-identity (BC-LEGAL-01), self-containment
  (FR-TPL-05), and a render-time bound (NFR-PERF-02).
- `openspec/capability-map.yaml`: `document-render` → `shipped`, unblocking
  `form-input`, `export-share`, and `invoice-registry`.

## Capabilities

### New Capabilities

<!-- none — openspec/specs/document-render/spec.md already exists -->

### Modified Capabilities

- `document-render`: the synced spec currently carries only FR-TPL-01,
  FR-TPL-03, FR-TPL-05 and BC-LEGAL-01, while `docs/requirements.md` and
  `capability-map.yaml` also assign it FR-TPL-02 and FR-TPL-04 (a spec accident
  of the same class as wayfinder ticket 15). This change **adds** the two
  missing requirements, **modifies** FR-TPL-01 to make HTML escaping and
  fail-closed behavior normative, and adds a performance scenario for
  NFR-PERF-02.

## Non-goals

- No PDF (S6 `export-share` pdf gate, wayfinder ticket 05) and no
  `POST /api/pdf` route.
- No UI, no form, no preview panel — `form-input` (S4) wires this module.
- No template redesign: layout, TERMS text, fixed title/subtitle and signature
  block stay byte-identical (FR-TPL-02, BC-LEGAL-01, BC-BRAND-01).
- No storage or snapshot logic (`invoice-registry`, S5).
- No new runtime dependencies — no template engine, no HTML sanitizer library
  (escaping is a five-character map, TC-STACK-03).

## Impact

- New: `src/lib/render/{fill-template,service-rows,render-invoice,template}.ts`
  plus tests; `scripts/sync-template.mjs`; `template:sync` npm script.
- Modified: `openspec/specs/document-render/spec.md` (via delta),
  `capability-map.yaml` status, `docs/capability.md`,
  `docs/capabilities/document-render.md`, `docs/requirements.md` statuses.
- Consumes: `src/lib/banking/supplier-block.ts` (`buildSupplierBlock`),
  `src/lib/invoice-calc/` (`formatAmount`, `renderDateEn/Ua`, `paymentPurpose`,
  `prepaymentSplit`, `invoiceTotal`), `src/lib/storage/clients.ts`
  (`clientToInvoiceCustomerFields`), `src/types/invoice.ts`.
- Unblocks: `form-input` (S4), `export-share` preview, `invoice-registry` (S5).
- Requirements covered: FR-TPL-01…05, BC-LEGAL-01, and (partially) BC-I18N-01,
  BC-BRAND-01, NFR-PERF-02, TC-STACK-03, TC-STACK-06.

## Success criteria

- Rendering a complete invoice yields HTML with **zero** remaining
  `{{…}}` tokens; a missing variable throws `TemplateRenderError` naming it
  rather than emitting a partial document.
- A client name of `<script>alert(1)</script>` appears as inert escaped text in
  the output, never as markup (closes the carried-forward security finding).
- `{{SERVICE_ROWS}}` expands to one `<tr>` per line item with bilingual
  description and amounts formatted as `1,234.56` (ticket 06).
- `{{PROJECT_BLOCK}}` is omitted entirely (empty string) when no project name
  is supplied, and renders a labelled block when it is.
- The TERMS AND CONDITIONS items 1–8 and the signature block in the output are
  byte-identical to the template (BC-LEGAL-01, FR-TPL-02).
- Output contains no external network references beyond bundled fonts, and
  keeps the template's embedded `<style>` and A4 print rules (FR-TPL-05).
- Single-invoice render completes well under 200 ms (NFR-PERF-02).
- `npm run typecheck && npm run lint && npm run build` pass; Vitest green;
  `npm run capability:check -- --capability form-input` reports OK once
  `document-render` is marked shipped.
