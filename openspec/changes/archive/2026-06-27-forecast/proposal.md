## Why

The city-search capability sets an active location, but nothing yet renders weather data for it. The forecast capability delivers the core value proposition of the app — showing users 7-day daily cards and 48-hour hourly temperature data so they can plan outdoor activities and weekend trips.

## What Changes

- Add a `ForecastPanel` client component that triggers on active location (from URL `?lat=&lon=&name=`) and fetches from Open-Meteo forecast API via a Next.js Route Handler
- Render 7 day cards (weekday name, hi/lo °C, weather icon, precipitation probability, wind speed)
- Render a 48-hour hourly temperature line chart using Recharts
- Display today's sunrise + sunset time as small text beneath the hourly chart
- Re-fetch forecast on every location change; hold the last successful response in memory until the next switch
- Define and export the canonical `ForecastDay` and `HourlyPoint` TypeScript types that downstream capabilities (`comfort-score`, `animated-bg`, `map`, `weekend-compare`) will consume

## Capabilities

### New Capabilities

- `forecast`: 7-day daily cards + 48-hour hourly Recharts line chart; sunrise/sunset display; in-memory cache; canonical forecast data shape

### Modified Capabilities

<!-- No existing specs require requirement-level changes -->

## Impact

- **New files:** `app/api/forecast/route.ts` (server-side Open-Meteo proxy), `app/components/forecast/ForecastPanel.tsx`, `app/components/forecast/DayCard.tsx`, `app/components/forecast/HourlyChart.tsx`, `app/components/forecast/SunriseSunset.tsx`, `lib/forecast/types.ts`, `lib/forecast/transform.ts`
- **Dependencies:** `recharts` (new); Open-Meteo forecast API (keyless, TC-STACK-03)
- **Consumed by downstream:** `comfort-score` (FR-COMFORT-01..05), `animated-bg` (FR-ANIM-01..04), `map` (FR-MAP-01..05), `weekend-compare` (FR-COMPARE-01..03) all depend on the data shape locked here
- **Performance:** Recharts adds client JS weight — keep the chart lazy-loaded (dynamic import) to stay within NFR-PERF-03 (≤ 200 KB gzipped)
- **Requirements addressed:** FR-FORECAST-01, FR-FORECAST-02, FR-FORECAST-03, FR-FORECAST-04, FR-FORECAST-05
