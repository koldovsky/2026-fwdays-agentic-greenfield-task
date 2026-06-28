## Context

The forecast capability (already implemented) exposes a `ForecastDay` type in `lib/forecast/types.ts` that includes all inputs comfort-score needs: `feelsLikeMaxC`, `feelsLikeMinC`, `precipProbability`, `windSpeedKmh`, `cloudCoverPercent`, `uvIndexMax`. The UI needs two new surfaces: a per-day colored badge inside `DayCard` and a weekend-highlight strip above the forecast grid.

Per TC-PURE-01, the scoring function must be framework-free — no React, no Next.js, no side effects — so it can be 100% unit-tested with Vitest and reused by `weekend-compare`.

## Goals / Non-Goals

**Goals:**

- Pure `comfortScore(day: ForecastDay): { value: number; rationale: string }` in `lib/scoring/comfort.ts`.
- Colored badges on each `DayCard` (green / yellow / red thresholds from FR-COMFORT-04).
- Weekend Sat + Sun average highlight strip at the top of the forecast grid (FR-COMFORT-05).
- Ukrainian rationale strings (≤ 80 chars, no emoji) via `lib/i18n/uk.ts`.
- 100% Vitest unit coverage for scoring logic and badge thresholds.

**Non-Goals:**

- Hourly comfort scores (daily granularity only).
- Persisting scores to a cache or database.
- Exposing scores via the API route.
- The `weekend-compare` multi-city table (a separate optional capability).

## Decisions

### Scoring algorithm

**Decision:** Weighted average of normalized sub-scores for feels-like temperature, precipitation probability, wind speed, cloud cover, and UV index. Feels-like carries the highest weight (~40%) because it has the greatest perceived impact; precipitation and UV follow (~20% each); wind and cloud cover share the remainder.

**Alternatives considered:**

- Lookup table keyed on WMO weather code — simpler but loses nuance for borderline codes and misses multi-factor interactions (e.g. high UV on a windy day).
- ML model — no training data, no infra, out of scope.

### Rationale strings

**Decision:** Pre-authored Ukrainian sentences in `lib/i18n/uk.ts`, keyed by dominant factor (e.g. `comfort.cold`, `comfort.hot`, `comfort.rainy`, `comfort.windy`, `comfort.good`). The function picks the key for the dominant sub-score deficit; if value ≥ 70 it always uses `comfort.good`.

**Alternatives considered:**

- Procedural string building — harder to review for voice/tone compliance; harder to translate.

### Badge design tokens

**Decision:** Use semantic comfort tokens already defined in the design system — `--comfort-good-bg` / `--comfort-good-text`, `--comfort-ok-bg` / `--comfort-ok-text`, `--comfort-poor-bg` / `--comfort-poor-text` — so the badges automatically adapt to light/dark theme.

### Weekend highlight placement

**Decision:** Render a `WeekendComfortBanner` component as a sibling above the 7-day card row inside `ForecastPanel`. It averages the Saturday and Sunday scores from the `days` array (indices vary by weekday of the first day). If the forecast does not contain both Saturday and Sunday (e.g. early in a week where Sunday falls on day 8), the banner is hidden.

## Risks / Trade-offs

- **Scoring weights are subjective** → Mitigation: weights are constants in a single object at the top of `comfort.ts`, making future tuning trivial without touching logic.
- **Rationale strings must stay ≤ 80 chars** → Mitigation: add a Vitest assertion that all strings in the `comfort.*` i18n namespace are ≤ 80 chars and contain no emoji.
- **Weekend indices shift by start day** → Mitigation: weekend detection uses `Date` parsing on the `date` field (`getDay() === 6 || getDay() === 0`), not positional array indices.
- **DayCard bundle size** → Adding a badge is a trivial DOM addition; no new dependency required.
