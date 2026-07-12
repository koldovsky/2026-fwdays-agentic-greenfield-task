# Design: add-invoice-calc

## Context

First domain module of S1. Browser-first MVP (ADR-0002): no server state, no
database. The module is pure TypeScript in `src/lib/invoice-calc/` — no React,
no Next.js imports, no storage access — so it runs identically in the form,
the future PDF Route Handler, and Vitest.

Decisions bound here (wayfinder map, tickets 02/06/07): money is integer
cents with `unit × qty → total`; numbering is a per-supplier per-year counter
`YYYY-NNN` assigned on issue; drafts have no number; `1,234.56` formatting
document-wide.

## Goals / Non-Goals

**Goals:** deterministic money math; number assignment + validation;
bilingual date rendering; deadline computation; payment purpose string;
100% unit-testable without DOM or storage.

**Non-goals:** persistence of the counter (invoice-registry owns storage —
this module *computes* the next number from inputs it is given); UI
formatting hooks; template rendering; edit/duplicate flows.

## Decisions

### D1. Money as branded integer cents

`type Cents = number & { __brand: "cents" }` with constructors
`centsFromInput(string) → Cents | ValidationError` and formatter
`formatAmount(Cents) → string` (`1,234.56`). All arithmetic (`lineAmount`,
`invoiceTotal`, `prepaymentSplit`) takes and returns `Cents`. `Math.round`
only inside `prepaymentSplit`; balance is computed by subtraction so the
exactness invariant holds by construction.

*Alternative rejected:* a Money class or decimal library — overkill for two
currencies with identical 2-dp behaviour; adds a runtime dep against
TC-STACK-04 (framework-free pure module).

### D2. Counter is computed, not stored

`nextInvoiceNumber(existing: string[], year: number) → string` scans the
supplier's existing numbers for the year, takes max sequence + 1, renders
`YYYY-NNN` (pads to 3, grows naturally past 999 → `2026-1000`).
`validateNumber(candidate, existing) → ok | duplicate | malformed`.
Storage of `existing` is the register's concern; passing it in keeps this
module pure and makes "never reuse a cancelled number" automatic — cancelled
invoices stay in the register, so their numbers stay in `existing`.

### D3. Dates in and out as ISO strings

Inputs are `YYYY-MM-DD` strings interpreted in the user's local calendar (the
timezone question stays in the map's fog; ISO-string arithmetic via UTC
constructors avoids DST edges). `renderDateEn` → `May 03, 2026`;
`renderDateUa` → `03.05.2026`; `computeDeadline(issue, term)` where
`term = {days: n} | {weeks: n} | {date: iso}`.

### D4. Types move, scaffold follows later

`src/types/invoice.ts` gains `unitPriceCents: Cents` and
`number?: string` (drafts). The full record shape (snapshots, supplier
reference) is ticket 08 / invoice-registry — this change touches only the
fields it owns, keeping the diff minimal per config rules.

## Risks / Trade-offs

- **`Math.round` on `total × pct/100`:** floats appear transiently. Mitigate:
  compute as `Math.round((totalCents * pct) / 100)` — integer × integer / 100
  stays exact within Number.MAX_SAFE_INTEGER for any realistic invoice.
- **Counter races** (two tabs): out of scope here; the register's storage
  layer (ticket 10) must serialise writes. Documented in code comment.
- **`Intl.NumberFormat` variance:** use `en-US` locale explicitly, not the
  runtime default, so `1,234.56` is stable across environments.

## Migration Plan

1. Delta spec lands with this change; `/opsx:sync` after implementation
   updates `openspec/specs/invoice-calc/spec.md` (FR-CALC-01/03/04/06
   MODIFIED, FR-CALC-05 ADDED).
2. `src/types/invoice.ts` field rename is mechanical; only scaffold pages
   reference it today.
3. `docs/requirements.md` FR-CALC rows update to `accepted` wording after
   sync (owned by wayfinder ticket 12's doc-fate pass; not this change).

## Open Questions

- Timezone for "today" at issue time — map fog; form passes the date in, so
  the module stays agnostic.
- Whether `№` renders as `#` in the EN purpose line if the embedded PDF font
  lacks U+2116 — wayfinder ticket 05 checks glyphs; module emits `№` per spec.
