# Tasks: add-invoice-calc

## 1. Test harness

- [x] 1.1 Add `vitest` (dev dep) + `"test": "vitest run"` script; create
      `src/lib/invoice-calc/__tests__/smoke.test.ts` asserting `1 + 1 === 2`.
      **Verify:** `npm run test` green; `npm run lint && npm run typecheck`
      unaffected.

## 2. Money (FR-CALC-03, FR-CALC-04)

- [x] 2.1 `src/lib/invoice-calc/money.ts`: `Cents` brand,
      `centsFromInput`, `lineAmount(unit, qty)`, `invoiceTotal(lines)`,
      `prepaymentSplit(total, pct)`, `formatAmount` (en-US, 2 dp).
      **Verify:** unit tests incl. property check
      `prepayment + balance === total` over randomised inputs (0.01 … 10M,
      pct 0–100); `formatAmount(1105000) === "11,050.00"`.

## 3. Numbering (FR-CALC-01)

- [x] 3.1 `src/lib/invoice-calc/numbering.ts`: `nextInvoiceNumber(existing,
      year)`, `validateNumber(candidate, existing)`.
      **Verify:** tests — first of year `2026-001`; sequence advances;
      cancelled numbers (still present in `existing`) never reused; duplicate
      edit rejected; `2026-999 → 2026-1000`; malformed input rejected with
      reason.

## 4. Dates & deadlines (FR-CALC-02, FR-CALC-05)

- [x] 4.1 `src/lib/invoice-calc/dates.ts`: `renderDateEn`, `renderDateUa`,
      `computeDeadline(issueIso, term)` for days/weeks/explicit-date terms.
      **Verify:** tests — `2026-05-03` → `May 03, 2026` / `03.05.2026`;
      3 days → `2026-05-06`; 5 weeks → `2026-06-07`; explicit date before
      issue date rejected; month/year rollover cases.

## 5. Purpose string (FR-CALC-06)

- [x] 5.1 `src/lib/invoice-calc/purpose.ts`: `paymentPurpose(number, dateEn)`.
      **Verify:** test —
      `Payment by the invoice №2026-001 from May 03, 2026` exact match
      (U+2116 preserved).

## 6. Type alignment

- [x] 6.1 Update `src/types/invoice.ts`: `unitPriceCents: Cents`,
      `number?: string`; fix scaffold references. (No barrel
      `src/lib/invoice-calc/index.ts` — barrel files are forbidden by the
      lint standard; consumers import `@/lib/invoice-calc/<module>`.)
      **Verify:** `npm run lint && npm run typecheck && npm run build` green;
      `npm run test` green.

## 7. Close the loop

- [x] 7.1 `openspec validate add-invoice-calc --strict` passes; update
      `docs/current-state.md` (active change → done, session log) and
      `openspec/capability-map.yaml` (`invoice-calc: shipped` once synced).
      **Verify:** `npm run capability:check -- --capability invoice-calc`
      reports consistent state; run `/opsx:sync` then `/opsx:archive`.
