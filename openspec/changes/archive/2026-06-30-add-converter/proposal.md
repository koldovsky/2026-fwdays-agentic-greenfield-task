## Why

The baseline spec at `openspec/specs/converter/spec.md` defines
**FR-CONVERT-01 … FR-CONVERT-05**: convert between UAH and the active currency
at the official rate, with locale-aware input/output and total, never-crashing
arithmetic. This is the headline read users expect after selecting a currency
from `currency-list`; it depends on that slice for the active rate and official
`rate` value but introduces no new NBU calls.

## What Changes

- Add `lib/currency/`: pure `parseAmount`, `convert`, and `formatAmount`
  helpers — total for every input, never throw, fully unit-tested
  (`TC-PURE-01`, `NFR-OBS-01`, `NFR-LOCALE-01`).
- Wire the vendored `@/components/ds` `Converter` into the focus panel,
  fed by the active currency's official rate from `RatesView` selection state.
- Extend `CurrencyFocusPanel` to render the converter beneath the selected-currency
  summary when a rate is active; keep the existing calm empty prompt when none
  is selected.
- Move converter UI copy into `lib/i18n/uk.ts` (`uk.converter.*`) — the DS
  component currently hardcodes Ukrainian labels; this slice passes them via
  props so `FR-I18N-01` stays satisfied.
- Refactor `components/ds/rates/Converter.jsx` to delegate arithmetic and
  formatting to `lib/currency/` instead of its inline `parseAmount`/`fmt`
  helpers (behaviour unchanged; logic centralised for tests).

## Capabilities

### New Capabilities

- `converter`: first implementation of the baseline spec
  (FR-CONVERT-01 … FR-CONVERT-05). Delta spec mirrors
  `openspec/specs/converter/spec.md` without behavioural change.

### Modified Capabilities

<!-- None — currency-list's selection contract (active currency in focus panel)
     is reused as designed; no behavioural change to its own FRs. -->

## Impact

| Area | Change |
| --- | --- |
| **`lib/currency/`** | `parseAmount.ts`, `convert.ts`, `formatAmount.ts` — pure, total, colocated `*.test.ts`. |
| **`components/ds/rates/Converter.jsx`** | Import `lib/currency/` for parse/convert/format; accept optional label props sourced from `uk.converter.*`. |
| **`components/rates/CurrencyFocusPanel.tsx`** | Embed `<Converter code={…} rate={…} labels={…} />` below the identity/rate summary when `rate !== null`. |
| **`lib/i18n/uk.ts`** | New `converter` group: field labels, swap control label, rate line template. |
| **`@/components/ds`** | Reuses existing `Converter`, `Input`, `IconButton` — no new DS components. |
| **Dependencies** | `currency-list` (active rate + selection). Downstream: none — `rate-history`/`trend-hint` extend the same panel independently. |
