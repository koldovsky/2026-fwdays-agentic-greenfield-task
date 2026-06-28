## 1. i18n strings

- [x] 1.1 Add `comfort.good`, `comfort.cold`, `comfort.hot`, `comfort.rainy`, `comfort.windy` keys to `lib/i18n/uk.ts` (Ukrainian, ≤ 80 chars, no emoji)
- [x] 1.2 Add matching keys to `lib/i18n/en.ts` for parity

## 2. Scoring library

- [x] 2.1 Create `lib/scoring/comfort.ts` with `comfortScore(day: ForecastDay): { value: number; rationale: string }` — pure function, no framework deps
- [x] 2.2 Implement weighted sub-score normalization (feels-like, precip, wind, cloud cover, UV) clamped to 0–100
- [x] 2.3 Implement dominant-factor rationale key selection (picks `comfort.*` key for worst sub-score; uses `comfort.good` when value ≥ 70)

## 3. Unit tests

- [x] 3.1 Create `lib/scoring/comfort.test.ts` with Vitest
- [x] 3.2 Test comfortable-range inputs return value ≥ 70 and `comfort.good` rationale
- [x] 3.3 Test cold input (feelsLikeMaxC ≤ 0) returns value < 40 and `comfort.cold` rationale
- [x] 3.4 Test hot input (feelsLikeMaxC ≥ 35) returns value < 40 and `comfort.hot` rationale
- [x] 3.5 Test high precip (≥ 70%) with comfortable temp returns `comfort.rainy`
- [x] 3.6 Test high wind (≥ 50 km/h) with comfortable temp returns `comfort.windy`
- [x] 3.7 Assert `value` is always an integer in [0, 100] for boundary inputs
- [x] 3.8 Assert all `comfort.*` i18n strings are ≤ 80 chars and contain no emoji

## 4. DayCard badge

- [x] 4.1 Call `comfortScore(day)` inside `DayCard.tsx` and derive badge color class from score thresholds (≥ 70 green, 40–69 yellow, < 40 red)
- [x] 4.2 Render badge element using `--comfort-good-*` / `--comfort-ok-*` / `--comfort-poor-*` design tokens (Tailwind semantic utilities)
- [x] 4.3 Add `aria-label="Комфорт: <value>"` to the badge element

## 5. Weekend comfort banner

- [x] 5.1 Create `app/components/forecast/WeekendComfortBanner.tsx` — finds Saturday and Sunday in `days[]` by `new Date(day.date).getDay()`, averages scores, renders nothing if either is missing
- [x] 5.2 Render banner above the 7-day card row in `ForecastPanel.tsx`
- [x] 5.3 Apply same color-token logic as DayCard badge based on averaged score
- [x] 5.4 Display "Вихідні" label and rationale from the higher-scoring day

## 6. Verification

- [x] 6.1 Run `npm test` — all comfort tests pass
- [x] 6.2 Run `npm run lint && tsc --noEmit` — no errors
- [x] 6.3 Start dev server, search a city, verify badges appear on all 7 day cards with correct colors
- [x] 6.4 Verify weekend banner renders above the grid with averaged score and correct color
- [x] 6.5 Run Lighthouse accessibility check — score ≥ 95 with badges and banner present
