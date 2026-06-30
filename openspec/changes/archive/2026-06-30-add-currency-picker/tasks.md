## 1. Pure filter (tests first)

- [x] 1.1 Write `lib/currency/filterRates.test.ts` against the not-yet-existing
      `./filterRates` (`@trace FR-PICK-01`): substring match by code
      (case-insensitive); substring match by name (case-insensitive); empty
      query returns the full list unchanged; whitespace-only query returns
      the full list; non-matching query returns `[]`; never throws on an
      empty `rates` array. Observe **RED**.
- [x] 1.2 Add `lib/currency/filterRates.ts`. Run until **GREEN**.

## 2. i18n

- [x] 2.1 Add `uk.picker.*` to `lib/i18n/uk.ts` — search placeholder, and the
      exact spec wording «Нічого не знайдено» for the empty result
      (`FR-I18N-01`, `FR-PICK-02`).

## 3. Wire into RatesView

- [x] 3.1 Add `query` state + a search `Input` (`@/components/ds`) above the
      `AsOfBadge`/rows in `RatesView`'s left slot.
- [x] 3.2 Render `filterRates(result.rates, query)` instead of `result.rates`
      directly; when the trimmed query is non-empty and the filtered list is
      empty, render the inline «Нічого не знайдено» message instead of the
      rows (`FR-PICK-02`) — `AsOfBadge` stays visible regardless.
- [x] 3.3 Confirm selecting a row from the filtered results still sets
      `activeCode` via the existing `onSelect` wiring, unchanged (`FR-PICK-03`).

## 4. Eval case

- [x] 4.1 Add `evals/cases/currency-picker.eval.ts` — rubric: filter
      responsiveness/correctness by code and name; calm, exact empty-result
      wording (no toast, no exclamation marks); selection still works after
      filtering.

## 5. Verification

- [x] 5.1 `npm run test:run` — all unit tests green.
- [x] 5.2 `npm run verify` — lint + check:trace + spec:validate + build green.
- [x] 5.3 Tick all tasks above; update `docs/current-state.md` for maker handoff.
