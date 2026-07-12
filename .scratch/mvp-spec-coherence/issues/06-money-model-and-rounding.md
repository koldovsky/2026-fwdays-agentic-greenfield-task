# 06 — The money model: what the user types, what the system derives

Type: grilling
Status: resolved
Blocked by: 02

## Question

Two artifacts in this repo compute money in opposite directions.

`FR-CALC-03` (`docs/requirements.md:82`) says **unit price = total ÷ quantity**:
the user enters a total, and the per-unit figure is derived.
`calculateInvoiceTotal` in `src/types/invoice.ts:31-50` does the reverse — it
sums `quantity × unitPrice` to produce the total. Both cannot be right, and no
requirement anywhere states a rounding rule.

Decide, with the evidence from ticket `02` in hand:

- **Which figure the user enters**, and which is derived.
- **The rounding rule** when the derived figure does not divide evenly. The
  documented example is friendly (`11050 ÷ 17 = 650.00`); `100 ÷ 3` is not.
- **Whether `unit × quantity` may disagree with the printed total.** If not,
  which of the two bends — and where the residue goes.
- **Numeric representation.** Integer minor units, or floating point? The
  invoice prints two decimals (`FR-CALC-03`), but `0.1 + 0.2` is a classic way
  to print `11050.000000000002`.
- **Display format per language column.** `11,050.00` in the EN line and
  `11 050,00` in the UA line, or one format throughout? `BC-I18N-01` says the
  document is bilingual; it does not say numbers are.
- **Prepayment.** Is it a percentage or an amount? `FR-INPUT-02` sends
  `prepay: 50%`, `FR-CALC-04` multiplies. Fix the rounding of prepayment and
  balance so that `prepayment + balance == total` **exactly**, for every input.
  An invoice whose parts do not sum to its whole is worse than no invoice.

## Consumers

Ticket `08` cannot describe the stored invoice record until this is settled.
Ticket `05` should supply a fixture that does not divide evenly.

---

## Answer

Grilled with the human on 2026-07-10, with ticket 02's evidence on the table.

- **The user enters unit price × quantity.** Line amount and invoice total are
  derived by multiplication and summation. `FR-CALC-03` (`unit = total ÷ qty`)
  is **inverted and replaced** — division does not occur anywhere in the money
  model, so no rounding residue exists. `calculateLineTotal` in
  `src/types/invoice.ts` was already correct.
- **Representation: integer minor units (cents).** No floating-point money.
- **Prepayment:** percentage input (0–100, default 50 per research.md);
  `prepayment = round(total × pct)`, `balance = total − prepayment`, so
  `prepayment + balance == total` holds exactly for every input.
- **Display format: `1,234.56` on the entire document**, both EN and UA lines
  (ticket 02: bilingual invoices do not vary money format per language; only
  dates differ). Confirmed by the human.

Consumers: ticket `08` (record stores unitPrice + qty per line, amounts in
cents); `openspec/specs/invoice-calc/spec.md` requires a delta change — its
current FR-CALC-03 asserts the inverted direction.
