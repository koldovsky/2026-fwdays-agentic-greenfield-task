# Tasks: add-document-render

## 1. Template source

- [x] 1.1 Add `scripts/sync-template.mjs` that reads `docs/invoice-template.html`
  and writes `src/lib/render/template.ts` as
  `export const INVOICE_TEMPLATE = <JSON.stringify(html)>;`; wire
  `"template:sync"` into `package.json` scripts (verify: script is idempotent)
- [x] 1.2 Generate `src/lib/render/template.ts` and add a drift test asserting
  the constant equals the current `docs/invoice-template.html`

## 2. Fill engine

- [x] 2.1 `src/lib/render/fill-template.ts`: `escapeHtml`, `TEMPLATE_KEYS`
  tuple, `TemplateKey` union, `RenderVars` type, `RAW_HTML_KEYS`
  (`SERVICE_ROWS`, `PROJECT_BLOCK`), and `TemplateRenderError`
- [x] 2.2 `fillTemplate(template, vars)`: single-pass regex replacement
  (D3 — no re-expansion of substituted content), escape text values, pass raw
  keys through, throw on unreplaced tokens and on unknown supplied vars
  (FR-TPL-01)
- [x] 2.3 Drift test: `TEMPLATE_KEYS` equals the placeholder set parsed from
  `docs/invoice-template.html` (bidirectional, like `SUPPLIER_BLOCK_KEYS`)

## 3. Fragment builders

- [x] 3.1 `src/lib/render/service-rows.ts`: `buildServiceRows(lineItems)` →
  `<tr>` per item with bilingual description, quantity, `formatAmount(unitPrice)`,
  `formatAmount(lineAmount)`; escape every value (FR-TPL-03)
- [x] 3.2 `buildProjectBlock(projectName?)` → labelled block or `""`
  (FR-TPL-04)

## 4. Composition

- [x] 4.1 `src/lib/render/render-invoice.ts`: `renderInvoice(input)` composes
  `buildSupplierBlock` (banking), `invoiceTotal` / `prepaymentSplit` /
  `formatAmount`, `renderDateEn` / `renderDateUa`, `paymentPurpose`,
  `clientToInvoiceCustomerFields`, the fragment builders, and `fillTemplate`
- [x] 4.2 `MissingIbanError` from banking propagates unchanged (BC-UX-01)

## 5. Tests

- [x] 5.1 `fill-template.test.ts`: substitution, escaping of hostile values
  (`<script>`), missing-value throw naming the placeholder, unknown-var throw,
  no re-expansion of `{{…}}` inside a value
- [x] 5.2 `service-rows.test.ts`: single row, multiple rows in order, amounts
  as `1,234.56`, escaped descriptions; `buildProjectBlock` present/absent
- [x] 5.3 `render-invoice.test.ts`: full render has zero `{{…}}` tokens; TERMS
  items 1–8 and the signature block byte-identical to the template
  (BC-LEGAL-01, FR-TPL-02); output keeps the embedded `<style>` and has no
  external network references (FR-TPL-05); render under 200 ms (NFR-PERF-02);
  missing IBAN surfaces `MissingIbanError`
- [x] 5.4 `npx vitest run` green; `npm run typecheck && npm run lint && npm run build`

## 6. Ship

- [x] 6.1 Flip `document-render: shipped` in `openspec/capability-map.yaml`;
  verify `npm run capability:check -- --capability form-input` reports OK
- [x] 6.2 Update `docs/capability.md` (§0, S3/S4 rows, milestones, next
  actions), `docs/capabilities/document-render.md`, and FR-TPL/NFR-PERF-02
  statuses in `docs/requirements.md`
- [x] 6.3 Sync the delta into `openspec/specs/document-render/spec.md`
  (`openspec validate --strict` passes) — via `/opsx:sync` before archive
