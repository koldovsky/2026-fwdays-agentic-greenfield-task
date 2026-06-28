## Why

The forecast grid currently shows raw weather values (hi/lo, precip, wind) but gives no synthesized "is this a good day to go outside?" signal. The comfort-score capability fills that gap with a pure scoring function and two UI surfaces — per-day badges and a weekend highlight — turning numbers into an actionable summary before the MVP ships.

## What Changes

- Add `lib/scoring/comfort.ts` — pure, framework-free `comfortScore(day: ForecastDay)` function returning `{ value: 0..100, rationale: string }`.
- Add Ukrainian rationale strings to `lib/i18n/uk.ts`.
- Update `DayCard` to render a colored comfort badge (green ≥ 70, yellow 40–69, red < 40).
- Add a weekend-highlight component above the forecast grid showing the Sat + Sun average score.
- Add Vitest unit tests covering the scoring logic and all badge thresholds (TC-PURE-01).

## Capabilities

### New Capabilities

- `comfort-score`: Pure `comfortScore(day)` scoring function, per-day colored badge in `DayCard`, and weekend (Sat + Sun avg) highlight at the top of the forecast grid.

### Modified Capabilities

- `forecast`: DayCard gains a comfort badge slot; no requirement-level behavior change, only a new UI element driven by the new capability.

## Impact

- **New file:** `lib/scoring/comfort.ts` (pure lib, no framework deps).
- **New file:** `lib/scoring/comfort.test.ts` (Vitest unit tests).
- **Modified:** `app/components/forecast/DayCard.tsx` — add badge slot.
- **Modified:** `app/components/forecast/ForecastPanel.tsx` (or parent) — add weekend-highlight strip.
- **Modified:** `lib/i18n/uk.ts` — comfort rationale strings.
- **Dependencies:** `ForecastDay` shape in `lib/forecast/types.ts` already exposes all required inputs (`feelsLikeMaxC`, `feelsLikeMinC`, `precipProbability`, `windSpeedKmh`, `cloudCoverPercent`, `uvIndexMax`).
- **No new external APIs or paid services.**
