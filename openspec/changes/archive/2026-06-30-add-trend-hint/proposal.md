## Why

The baseline spec at `openspec/specs/trend-hint/spec.md` defines
**FR-TREND-01 … FR-TREND-03**: compute the active currency's 7-day move from
its rate history and read it back as one calm Ukrainian sentence, using the
design system's `trendTone` as the single classification source of truth.
Depends only on `rate-history` (already built) — the 7-day move is computed
from the same `HistoryPoint[]` data `CurrencyHistory` already fetches; no new
NBU call is needed.

## What Changes

- Add `lib/currency/weeklyMove.ts`: pure 7-day percentage move from a
  `HistoryPoint[]` (last point vs. the point 7 calendar days earlier).
- Add `lib/currency/trendSentence.ts`: pure calm-sentence builder, taking an
  already-classified tone (`up`/`down`/`flat`) and producing the Ukrainian
  sentence from `lib/i18n/uk.ts`'s `trend.*` strings.
- Reuse `trendTone` from `@/components/ds` (it is genuinely pure — no React/DOM
  use at runtime — but lives in a `.jsx` file that also imports `react` at the
  top, so it is consumed at the **component** layer, not imported into `lib/`,
  to keep `lib/` literally import-clean per `TC-PURE-01`).
- Add `components/rates/TrendHint.tsx`: renders the sentence above the
  history chart, fed by `CurrencyHistory`'s already-fetched points — no
  parallel fetch, no parallel loading/error state machine.

## Capabilities

### New Capabilities

- `trend-hint`: first implementation of the baseline spec
  (FR-TREND-01 … FR-TREND-03). Delta spec mirrors
  `openspec/specs/trend-hint/spec.md` without behavioural change.

### Modified Capabilities

<!-- None — `rate-history`'s fetch and CurrencyHistory's state machine are
     reused, not changed in behaviour (only extended to also render TrendHint
     when ready). -->

## Impact

| Area | Change |
| --- | --- |
| **`lib/currency/weeklyMove.ts`** | New pure helper: 7-day % move from history points. |
| **`lib/currency/trendSentence.ts`** | New pure helper: tone + delta → calm Ukrainian sentence. |
| **`lib/i18n/uk.ts`** | New `trend` group: up/down/flat sentence templates. |
| **`components/rates/TrendHint.tsx`** | New — consumes `trendTone` (DS) + the two new `lib/currency/` helpers. |
| **`components/rates/CurrencyHistory.tsx`** | Extended: renders `TrendHint` above the chart when `state.status === "ready"`. |
| **Dependencies** | `rate-history` (the history points it reads). Downstream: none — this is a leaf capability. |
