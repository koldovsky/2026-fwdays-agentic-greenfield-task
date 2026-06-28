## 1. Dependencies & types

- [x] 1.1 Install `recharts` and add to `package.json`
- [x] 1.2 Create `lib/forecast/types.ts` exporting `ForecastDay`, `HourlyPoint`, and `ForecastResponse` interfaces (framework-free, TC-PURE-01)
- [x] 1.3 Add weather-code-to-icon mapping in `lib/forecast/weatherIcon.ts`
- [x] 1.4 Create `lib/forecast/transform.ts` that converts raw Open-Meteo API response into `ForecastResponse`

## 2. i18n strings

- [x] 2.1 Add forecast-related Ukrainian strings to `lib/i18n/uk.ts`: weekday names (Mon–Sun), sunrise/sunset labels, error message, chart aria-label
- [x] 2.2 Add matching English fallback strings to `lib/i18n/en.ts`

## 3. Route Handler

- [x] 3.1 Create `app/api/forecast/route.ts` — validates `lat`/`lon` params (400 on missing or non-numeric)
- [x] 3.2 Wire Route Handler to call Open-Meteo forecast endpoint with required daily + hourly variables, passing `timezone=auto`
- [x] 3.3 Call `transform.ts` to convert raw response into `ForecastResponse`; return JSON with `Cache-Control: s-maxage=600, stale-while-revalidate=300`
- [x] 3.4 Return 502 with JSON error body on upstream Open-Meteo failure

## 4. In-memory cache

- [x] 4.1 Implement an LRU cache module (max 5 entries, keyed by `lat+lon`) in `lib/forecast/cache.ts`
- [x] 4.2 Wire cache into `ForecastPanel`: check cache before fetching, store result after successful fetch

## 5. Server components

- [x] 5.1 Create `app/components/forecast/DayCard.tsx` — pure presentational server component; renders weekday, hi/lo, weather icon, precip %, wind
- [x] 5.2 Create `app/components/forecast/WeatherIcon.tsx` — maps `weatherCode` to inline SVG using `lib/forecast/weatherIcon.ts`
- [x] 5.3 Create `app/components/forecast/SunriseSunset.tsx` — displays `sunriseIso` and `sunsetIso` as `HH:MM` with Ukrainian labels

## 6. Hourly chart

- [x] 6.1 Create `app/components/forecast/HourlyChart.tsx` — Recharts `LineChart` with 48 `HourlyPoint` entries; X-axis hours, Y-axis °C; aria-label from i18n
- [x] 6.2 Wrap `HourlyChart` with `next/dynamic({ ssr: false })` in a `LazyHourlyChart.tsx`; add a skeleton placeholder matching chart height

## 7. ForecastPanel (client component)

- [x] 7.1 Create `app/components/forecast/ForecastPanel.tsx` as `'use client'`; reads `lat`, `lon` from `useSearchParams()`
- [x] 7.2 Implement fetch lifecycle: loading skeleton → fetch `/api/forecast` → render; check cache first
- [x] 7.3 Render 7 `DayCard` components in a responsive row/grid
- [x] 7.4 Render `LazyHourlyChart` below the day cards
- [x] 7.5 Render `SunriseSunset` below the hourly chart
- [x] 7.6 Render inline Ukrainian error message on 4xx/5xx response; no console errors

## 8. Integration in app layout

- [x] 8.1 Mount `ForecastPanel` in the main content area of `app/page.tsx` (or equivalent layout slot) so it renders when `lat`/`lon` are present in the URL

## 9. Verification

- [x] 9.1 Confirm `tsc --noEmit` passes with no errors
- [x] 9.2 Confirm `lib/forecast/` has no imports from `next/*` or `react`
- [x] 9.3 Manually verify: select a city → 7 day cards render with correct data
- [x] 9.4 Manually verify: hourly chart displays and shows skeleton while loading
- [x] 9.5 Manually verify: sunrise/sunset times appear with correct format
- [x] 9.6 Manually verify: selecting a second city re-fetches and updates forecast
- [x] 9.7 Manually verify: navigating back to a cached city shows data immediately (no spinner)
- [x] 9.8 Confirm console is silent on a healthy session (NFR-OBS-01)
- [x] 9.9 Run `npm run lint && tsc --noEmit && npm test && npm run build` and confirm it finishes in < 60 s (NFR-DX-01)
