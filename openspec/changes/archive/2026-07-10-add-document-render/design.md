# Design: add-document-render

## Context

`docs/invoice-template.html` (358 lines, embedded `<style>`, A4 print rules)
is the layout source of truth and contains 35 distinct `{{PLACEHOLDER}}`
tokens. Upstream capabilities produce all the values: `banking` returns the
eight `SUPPLIER_*` vars, `invoice-calc` returns formatted money, dates, the
payment purpose and the prepayment split, `nace-catalog` supplies bilingual
service descriptions, and `clientToInvoiceCustomerFields` maps a stored client
to the `CUSTOMER_*` fields. The output must run standalone in a browser
(preview, S4) and later inside headless Chromium (PDF, S6), so the renderer
must be framework-free and usable from both a client component and a Route
Handler.

Escaping has no owner today. The banking review confirmed the fill step is the
right place: it is the only choke point every value passes through.

## Goals / Non-Goals

**Goals:**

- Pure, synchronous `fillTemplate(template, vars)` that is impossible to use
  unsafely: text in, escaped text out, fail-closed on drift.
- A stable `RenderVars` contract so `form-input` cannot forget a placeholder.
- Template importable from browser and node without `fetch` or `fs`, while
  `docs/invoice-template.html` stays the single editable source.

**Non-Goals:**

- No template engine dependency, no sanitizer library, no PDF, no UI.
- No mutation of the template file at runtime.

## Decisions

- **D1 — Escape-by-default, raw-by-exception.** `fillTemplate` escapes every
  value with a five-entry map (`& < > " '`). Exactly two keys are declared
  `RAW_HTML_KEYS` (`SERVICE_ROWS`, `PROJECT_BLOCK`) and pass through unescaped
  — both are produced only by `buildServiceRows` / `buildProjectBlock`, which
  escape their own inputs. Alternative (escape at each call site) rejected:
  the S2 review showed that per-site discipline is exactly what rots.
- **D2 — Fail closed, both directions.** After substitution, a scan for any
  surviving `{{…}}` throws `TemplateRenderError` listing the tokens; supplying
  a var with no matching placeholder also throws. This turns template drift
  into a test failure instead of a silently broken invoice — the same
  bidirectional contract the banking module adopted for `SUPPLIER_BLOCK_KEYS`.
- **D3 — Single-pass replacement.** Substitute via one regex pass with a
  replacer function keyed on the variable name, not sequential
  `String.replaceAll` per key. A value that happens to contain `{{OTHER}}`
  can then never be re-expanded (injection through data), and the pass is
  O(template) rather than O(template × vars).
- **D4 — Template as a generated constant.** `scripts/sync-template.mjs`
  writes `src/lib/render/template.ts` as
  `export const INVOICE_TEMPLATE = <JSON.stringify(html)>;`, run via
  `npm run template:sync`. A Vitest drift test reads `docs/invoice-template.html`
  and asserts equality with the constant, so an edit to the doc that skips the
  script fails CI. Alternatives: `?raw` imports (Turbopack support is a
  training-data trap in this Next.js version — see `AGENTS.md`), `fetch` from
  `public/` (breaks the node/PDF path and self-containment testing),
  `readFileSync` (breaks the browser preview path). JSON.stringify avoids all
  backtick/`${}` escaping hazards in the generated file.
- **D5 — `RenderVars` is a typed map keyed by a `TEMPLATE_KEYS` tuple.**
  `TemplateKey` is the union; the drift test asserts the tuple equals the set of
  placeholders parsed from the template. `SUPPLIER_BLOCK_KEYS` from `banking`
  is a subset — the render module composes rather than redeclares it.
- **D6 — `renderInvoice(input)` is the only composition point.** It calls
  `buildSupplierBlock`, `invoiceTotal` / `prepaymentSplit` / `formatAmount`,
  `renderDateEn/Ua`, `paymentPurpose`, and `clientToInvoiceCustomerFields`,
  then `fillTemplate`. Callers never assemble `RenderVars` by hand. `MissingIbanError`
  from banking propagates unchanged (BC-UX-01 message reaches the form).

## Risks / Trade-offs

- [Generated file drift] `template.ts` can go stale if someone edits the doc
  and skips `npm run template:sync` → mitigation: the drift test fails; the
  script is idempotent and safe to re-run.
- [Bundle size] the template constant (~14 KB of HTML) ships to the client for
  preview → acceptable; it is the document the user is previewing, and it
  gzips well. Revisit only if `export-share` moves preview server-side.
- [Escaping breaks intentional markup] a future placeholder that must carry
  markup would need adding to `RAW_HTML_KEYS` → mitigation: that list is
  explicit and reviewed; the default is safe.
- [TERMS immutability] the fill step never touches those nodes, but a careless
  future regex could → mitigation: a test asserts the TERMS and signature
  regions of the output are byte-identical to the template.

## Migration Plan

Additive module plus one generated file and one npm script; no data migration.
Ship = merge PR, flip `document-render: shipped` in `capability-map.yaml`,
sync the delta into `openspec/specs/document-render/spec.md`, archive.

## Open Questions

None blocking. Ticket 05 (PDF fidelity) stays open but is scoped to
`export-share` (S6) and does not constrain this module — the HTML it produces
is the input that prototype will consume.
