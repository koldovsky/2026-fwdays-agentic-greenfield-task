## 1. Pure amount parsing (tests first)

- [x] 1.1 Write `lib/currency/parseAmount.test.ts` against the not-yet-existing
      `./parseAmount` (`@trace FR-CONVERT-02`, `NFR-LOCALE-01`): `"100,50"` →
      `100.5`; `"1 000,50"` / `"1000,50"` with spaces ignored; trailing zeros
      (`"100,500"`); empty string / whitespace-only → `0`; non-numeric /
      `null` / `undefined` → `0`; never throws. Observe **RED**.
- [x] 1.2 Add `lib/currency/parseAmount.ts`. Run until **GREEN**.

## 2. Pure conversion (tests first)

- [x] 2.1 Write `lib/currency/convert.test.ts` (`@trace FR-CONVERT-01`,
      `FR-CONVERT-03`, `FR-CONVERT-05`): foreign-to-uah multiplies by rate;
      uah-to-foreign divides; swap directions are inverse at the same rate;
      `amount === 0` → `0`; non-finite amount → `0`; `rate <= 0` or non-finite
      rate → `0` (no division crash). Observe **RED**.
- [x] 2.2 Add `lib/currency/convert.ts`. Run until **GREEN**.

## 3. Pure formatting (tests first)

- [x] 3.1 Write `lib/currency/formatAmount.test.ts` (`@trace FR-CONVERT-04`,
      `NFR-LOCALE-01`): `1308.4` → `"1 308,40"` (thin-space thousands, comma
      decimal); `0` → `"0,00"`; non-finite → `"0,00"`; never throws. Observe
      **RED**.
- [x] 3.2 Add `lib/currency/formatAmount.ts`. Run until **GREEN**.

## 4. DS Converter refactor

- [x] 4.1 Refactor `components/ds/rates/Converter.jsx` to import
      `parseAmount`, `convert`, `formatAmount` from `@/lib/currency/` — remove
      inline helpers; behaviour unchanged.
- [x] 4.2 Update `components/ds/rates/Converter.d.ts`: optional `labels` prop
      (see design.md Decision 2); defaults preserve current hardcoded strings.

## 5. i18n + focus panel integration

- [x] 5.1 Add `uk.converter.*` to `lib/i18n/uk.ts` (field labels, swap label) —
      no inline literals in components (`FR-I18N-01`).
- [x] 5.2 Extend `components/rates/CurrencyFocusPanel.tsx`: when `rate !== null`,
      render `<Converter code={rate.code} rate={rate.rate} labels={uk.converter} />`
      below the identity summary (`FR-CONVERT-01` … `FR-CONVERT-05`); keep the
      existing empty prompt when `rate === null`. Key `Converter` by `rate.code`
      so direction/amount reset on currency change.

## 6. Eval case

- [x] 6.1 Add `evals/cases/converter.eval.ts` — rubric: locale input clarity
      (comma accepted, no alarming errors on garbage input); result formatting
      (uk-UA mono, ₴ placement); swap discoverability (label calm, direction
      flips visibly); empty-input calmness (shows `0,00`, no crash/toast).

## 7. Verification

- [x] 7.1 `npm run test:run` — all unit tests green.
- [x] 7.2 `npm run verify` — lint + check:trace + spec:validate + build green.
- [x] 7.3 Tick all tasks above; update `docs/current-state.md` for maker handoff.
