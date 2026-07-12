# Proposal: add-invoice-calc

## Why

`invoice-calc` is the first domain capability of slice S1 and everything
downstream (document-render, invoice-registry, invoice-edit) depends on it.
Its current spec was migrated before the money and numbering decisions closed:
it asserts the **inverted** money direction (`unit = total ÷ quantity`,
FR-CALC-03) that can print a unit price which does not reconcile with the
printed total, and a **same-day-colliding** number format (`DDMM/0YY`,
FR-CALC-01). Wayfinder tickets 02, 06 and 07 (resolved 2026-07-10, see
`.scratch/mvp-spec-coherence/map.md` → Decisions so far) settled the correct
behaviour. This change fixes the spec and implements the capability as a pure
domain module.

## What Changes

- **BREAKING (spec):** `FR-CALC-03` reversed — the user enters unit price ×
  quantity; line amounts and the invoice total are derived by multiplication
  and summation. Division does not occur in the money model.
- **BREAKING (spec):** `FR-CALC-01` replaced — `DDMM/0YY` is retired. Invoice
  numbers are a per-supplier, per-year sequential counter rendered `YYYY-NNN`
  (e.g. `2026-001`), assigned when an invoice is issued (`draft → sent`),
  user-editable with a uniqueness check, never reused after cancellation.
  Drafts carry no number.
- `FR-CALC-05` restored (it vanished in the `8d45456` migration): payment
  deadline and execution term accept days, weeks, or an explicit date, and
  compute deadline dates from the issue date.
- All amounts are integer minor units (cents); `prepayment = round(total ×
  pct)`, `balance = total − prepayment`, so `prepayment + balance == total`
  holds exactly. Display format is `1,234.56` across the whole document (money
  is not localised per language column; only dates are).
- New pure module `src/lib/invoice-calc/` implementing money math, numbering,
  bilingual date rendering (FR-CALC-02) and the payment purpose string
  (FR-CALC-06, now `Payment by the invoice №2026-001 from {date_en}`).
- Vitest introduced for `src/lib/` unit tests (first use of TC-STACK-06).

## Capabilities

### New Capabilities

(none — the capability spec already exists; this change corrects it)

### Modified Capabilities

- `invoice-calc`: FR-CALC-01 replaced (sequential `YYYY-NNN` on issue, was
  `DDMM/0YY`); FR-CALC-03 direction inverted (unit × qty → total, was
  total ÷ qty); FR-CALC-04 sharpened (integer cents, exact
  prepayment + balance == total); FR-CALC-05 restored (deadline computation);
  FR-CALC-06 number rendering updated.

## Non-goals

- No UI. The form (S4 `form-input`) and the register (S5 `invoice-registry`)
  consume this module later.
- No storage. Where the counter's last value lives is `invoice-registry`'s
  concern (wayfinder ticket 10 decides the storage API).
- No template rendering (S3 `document-render`) — this module only produces the
  values the template will print.
- No edit/duplicate semantics (wayfinder ticket 16, `invoice-edit`).
- No currency conversion; USD and EUR are formatted identically.

## Success criteria

- `openspec validate add-invoice-calc --strict` passes; after `/opsx:sync`,
  `openspec/specs/invoice-calc/spec.md` carries the corrected requirements.
- `npm run test` (Vitest) green: property `prepayment + balance == total` holds
  for randomised inputs; number assignment is gapless per supplier-year;
  `2026-001 → 2026-002` and never reuses a cancelled number.
- `npm run lint && npm run typecheck && npm run build` stay green (NFR-DX-01).
- No floating-point arithmetic on money anywhere in `src/lib/invoice-calc/`.

## Impact

- `openspec/specs/invoice-calc/spec.md` (via delta + sync).
- New `src/lib/invoice-calc/` (money, numbering, dates, purpose).
- `src/types/invoice.ts` — amounts move to integer cents; `LineItem.unitPrice`
  becomes `unitPriceCents`; number becomes optional on drafts (aligns with
  wayfinder 07; full record shape lands with ticket 08 / `invoice-registry`).
- `package.json` — adds `vitest` (dev) and a `test` script; no runtime deps.
- Traceability: FR-CALC-01..06 IDs preserved in requirement headings (gate G4).
