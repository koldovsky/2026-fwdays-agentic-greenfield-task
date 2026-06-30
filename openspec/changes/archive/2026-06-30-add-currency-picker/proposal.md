## Why

The baseline spec at `openspec/specs/currency-picker/spec.md` defines
**FR-PICK-01 … FR-PICK-03**: a single input narrows the `currency-list` by
code or Ukrainian name, with an exact-wording inline empty result and
selection wired into the existing active-currency state. It depends only on
`currency-list` (already built) and `i18n`.

## What Changes

- Add `lib/currency/filterRates.ts`: a pure, total filter over `Rate[]` by
  case-insensitive substring match against code or name.
- Add a search `Input` (from `@/components/ds`) above the currency rows in
  `RatesView`'s left slot; typing narrows the rendered rows live.
- When the query is non-empty and matches nothing, show the spec's exact
  wording «Нічого не знайдено» inline, in place of the rows — never a toast.
- Selecting a row from the filtered results uses the existing `onSelect`
  wiring (`FR-RATES-04`) unchanged — filtering only narrows what is rendered,
  it does not introduce new selection logic.
- New `uk.picker.*` strings (placeholder, no-match message) — no inline
  literals.

## Capabilities

### New Capabilities

- `currency-picker`: first implementation of the baseline spec
  (FR-PICK-01 … FR-PICK-03). Delta spec mirrors
  `openspec/specs/currency-picker/spec.md` without behavioural change.

### Modified Capabilities

<!-- None — currency-list's FR-RATES-04 selection contract is reused, not changed. -->

## Impact

| Area | Change |
| --- | --- |
| **`lib/currency/filterRates.ts`** | New pure helper: `filterRates(rates, query)`, total, never throws. |
| **`components/rates/RatesView.tsx`** | Adds `query` state, a search `Input`, and the filtered-rows / empty-result branch in the left slot. |
| **`lib/i18n/uk.ts`** | New `picker` group: search placeholder, exact «Нічого не знайдено» wording. |
| **Not reused** | `@/components/ds`'s vendored `CurrencyPicker` — it composes `RateRow` (forces a fabricated trend pill, the same issue avoided in `currency-list`'s design.md Decision 2) and hardcodes non-spec-matching strings ("Не знайдено — спробуйте інший код" instead of «Нічого не знайдено»). A thin custom filter reusing the already-built `CurrencyRow` is used instead. |
| **Dependencies** | `currency-list` (the rows + selection it filters), `i18n`. Downstream: none — this is a leaf capability. |
