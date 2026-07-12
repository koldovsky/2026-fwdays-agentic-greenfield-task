# Design: add-form-input

## Context

S3 `document-render` ships on `main`: `renderInvoice(input)` composes supplier
banking, client customer fields, NACE-backed line items, calc outputs, and the
frozen template into self-contained HTML. S2 directories and banking are live:
`listClients`, `clientToInvoiceCustomerFields`, active supplier profile via
`useSyncExternalStore`, and `matchServiceText` for NACE resolution.

The new-invoice route is a placeholder. This change is the M4 demo path: form
state → validation → `renderInvoice` → preview panel. No invoice persistence
(`invoice-registry` is S5). UI strings are Ukrainian; invoke
`weg3d-fin-design` at apply (🎨 banner).

## Goals / Non-Goals

**Goals:**

- Split-page create flow: structured form + live preview.
- Zod schema as single validation source (TC-STACK-05); types via `z.infer`.
- Client picker prefills from `client-directory`.
- Short-format paste populates the same form state (FR-INPUT-02).
- NACE matcher integration with explicit ambiguous-match UX (FR-NACE-05).
- Pure `formToRenderInput` mapper from validated state → `RenderInvoiceInput`.
- BC-UX-01 errors; NFR-A11Y-01 labels/focus; NFR-OBS-01 clean console on happy path.

**Non-Goals:**

- Saving invoices, PDF export, edit/duplicate flows.
- Chat/LLM input.
- Server Actions or API routes for form mutation.
- Template or TERMS redesign.

## Decisions

### D1 — Form state shape mirrors render input, not `Invoice`

Draft creation uses a dedicated `InvoiceFormValues` type validated by Zod.
It holds customer fields (possibly overridden after client pick), `currency`,
`serviceText`, resolved `naceCode` (optional until match), `quantity`,
`unitPriceInput` (string), `prepaymentPercent`, `paymentDays`, `executionDays`,
optional `projectName`, and `issueDate` (ISO, default today in local calendar).

*Why:* `Invoice` in `src/types/invoice.ts` is a persisted registry record with
`clientId`, status, and timestamps — premature for S4. The mapper produces
ephemeral `LineItem[]` and `PaymentTermsText` at preview time.

### D2 — Zod schema in `src/lib/validation/invoice-input.ts`

Framework-free module exporting:

- `invoiceFormSchema` — full form validation
- `parseShortFormat(text)` — FR-INPUT-02 parser returning partial field map
- inferred `InvoiceFormValues`

Rules: email via Zod `.email()`, phone as trimmed non-empty with a permissive
pattern (digits/`+`/spaces, min length), `currency` enum `USD | EUR`, quantity
positive integer, amount via reuse of `centsFromInput` logic or parallel regex
aligned with `AMOUNT_PATTERN`, prepayment 0–100 (accept `50` or `50%` in short
format only).

*Why:* TC-STACK-05; one schema for form, parser, and tests.

### D3 — `formToRenderInput` pure mapper

`src/lib/invoices/form-to-render.ts`:

```ts
function formToRenderInput(
  values: InvoiceFormValues,
  ctx: {
    supplier: SupplierProfile;
    client?: Client;
    naceEntry: NaceEntry;
    paymentTerms: PaymentTermsText;
  }
): RenderInvoiceInput
```

- Builds one `LineItem` from NACE bilingual descriptions + qty + unit price.
- Uses placeholder invoice number `PREVIEW` (FR-CALC-01 numbering on issue is
  `invoice-registry` concern; preview needs a non-empty token).
- `issueDate` from form; due date computed via `addCalendarDays` from
  `invoice-calc/dates`.
- `place` and `signatory` from active supplier profile labels (same defaults
  as render tests until settings expose them).
- Propagates `MissingIbanError` unchanged from `renderInvoice`.

*Why:* keeps `InvoiceForm` thin; mapper is Vitest-friendly.

### D4 — Preview panel: sandboxed iframe with `srcDoc`

`InvoicePreviewPanel` receives rendered HTML string. On change, set iframe
`srcDoc` with the self-contained document from `renderInvoice`. Container gets
`tabIndex={0}` and `aria-label` for keyboard reachability (NFR-A11Y-01).

Alternatives rejected:
- `dangerouslySetInnerHTML` on a div — loses print CSS context and A4 sizing.
- Server render per keystroke — violates browser-first, adds latency.

Debounce preview re-render ~150 ms via `useDeferredValue` or manual timer to
avoid thrashing on fast typing (NFR-PERF-02 already met by render module).

### D5 — Client picker: Combobox over `listClients`

Reuse storage subscription pattern from settings/clients pages. Selecting a
client sets `clientId` and copies fields into form state via
`clientToInvoiceCustomerFields`. Clearing selection keeps manual edits.

*Why:* matches existing `useSyncExternalStore` hydration-safe pattern.

### D6 — NACE UX for three outcomes

Call `matchServiceText(serviceText)` on blur or debounced change:

| Result | UI |
| --- | --- |
| `matched` | Store entry; enable preview |
| `ambiguous` | Show radio/select of candidates; preview blocked until chosen |
| `none` | Inline error; preview blocked |

Never auto-pick on ambiguous (FR-NACE-05 contract).

### D7 — Short-format input: collapsible paste area

`Tabs` or secondary `Textarea` "Швидке вставлення" above the form. Parse on
button "Застосувати" (not on every keystroke). Successful parse calls
`reset(formValues)`; validation runs after merge.

Example block shown as placeholder/helper text for BC-UX-01.

### D8 — Payment terms prose owned by form

`PaymentTermsText` is currently noted as form-input owned in
`render-invoice.ts`. Build bilingual strings from `prepaymentPercent`,
`paymentDays`, `executionDays` in a small pure helper
(`buildPaymentTermsText`) colocated with validation or mapper. Wording matches
existing render test fixtures where possible.

### D9 — Page layout

`/invoices/new`: responsive grid — single column on mobile (form then preview),
`lg:grid-cols-2` on desktop. Page is a client boundary wrapper
(`NewInvoicePageContent`) because form + preview are interactive.

Invoke WEG3D Fin: `wf-display` title, `h-9` inputs, `wf-label`, sentence-case
Ukrainian strings inline (centralize reusable copy in a small
`src/lib/i18n/invoice-form.ts` if repeated).

## Risks / Trade-offs

- [Preview invoice number is fake] → Acceptable for M4; document that
  `PREVIEW` is not a issued number; registry assigns `YYYY-NNN` on save.
- [Large HTML in iframe on every debounced change] → Mitigation: debounce;
  render is < 200 ms per NFR-PERF-02.
- [Client field override vs directory drift] → Form owns ephemeral values;
  directory edits do not retroactively change an in-progress form.
- [Ticket 11 design reconciliation] → Functional first; polish pass may adjust
  spacing/tokens without changing this architecture.
- [No supplier profile] → Block preview with BC-UX-01 CTA to Settings, same
  pattern as missing IBAN.

## Migration Plan

Greenfield UI on existing route. Rollback = revert commit. After ship:
`/opsx:sync` → `form-input: shipped`, update `docs/current-state.md`,
unblocks `export-share` preview and `invoice-registry`.

## Open Questions

- Whether signatory/place fields become editable on the form in MVP or stay
  supplier-profile defaults — **default: supplier defaults** (no new fields).
- Exact Ukrainian payment-terms wording — derive from render test fixtures during
  apply; adjust only if template placeholders require different phrasing.
