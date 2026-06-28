## Context

The `city-search` capability wires `?lat=&lon=&name=` into the URL. The `forecast` capability reads those params and turns them into rendered weather data. It is the first data-heavy capability and establishes the canonical types that every downstream capability (`comfort-score`, `animated-bg`, `map`, `weekend-compare`) will import from `lib/forecast/types.ts`.

Open-Meteo's free forecast API returns daily and hourly variables in a single request. The app must never proxy this through client-side fetch in a way that leaks the upstream URL structure suggestive of API keys (TC-DATA-01), and must stay within 200 KB gz client JS (NFR-PERF-03).

Existing specs in scope: none (this is a new capability).

## Goals / Non-Goals

**Goals:**

- Fetch a combined 7-day daily + 48-hour hourly forecast in one Open-Meteo call from a Route Handler
- Render 7 day cards and a 48-hour Recharts line chart
- Show today's sunrise/sunset beneath the chart
- Cache the last response in memory; invalidate only on location change
- Define and export the canonical `ForecastDay` and `HourlyPoint` TypeScript types
- Honour all cross-cutting NFRs (TTFB, JS budget, A11Y, i18n, silent console)

**Non-Goals:**

- Comfort score badges (capability `comfort-score` mounts on top of these cards)
- Animated background (capability `animated-bg`)
- Map interaction (capability `map`)
- City pinning / compare table (capability `weekend-compare`)
- Persistent client-side cache (IndexedDB, localStorage) — in-memory only for MVP

## Decisions

### 1. Single combined Open-Meteo request from a Route Handler

**Decision:** `GET /api/forecast?lat=&lon=` fetches both `daily` and `hourly` variables in a single upstream call. The Route Handler transforms the raw response into `{ days: ForecastDay[], hours: HourlyPoint[], sunrise: string, sunset: string }` and returns it as JSON.

**Alternatives considered:**

- _Two separate client fetches (daily + hourly)_: rejected — doubles the number of browser requests, exposes upstream URLs, and complicates loading states.
- _Server Component with `fetch` directly_: workable, but a Route Handler lets the `ForecastPanel` client component re-fetch on location change without a full page navigation, which is necessary because the chart is interactive.

**Rationale:** One request, server-side transform, clean JSON contract — simplest path that satisfies TC-DATA-01 and NFR-PERF-01.

---

### 2. Canonical types live in `lib/forecast/types.ts`

**Decision:**

```ts
export interface ForecastDay {
  date: string; // "YYYY-MM-DD"
  weekdayUk: string; // from lib/i18n/uk.ts
  highC: number;
  lowC: number;
  precipProbability: number; // 0..100
  windSpeedKmh: number;
  weatherCode: number; // WMO code
  feelsLikeMaxC: number;
  feelsLikeMinC: number;
  cloudCoverPercent: number;
  uvIndexMax: number;
}

export interface HourlyPoint {
  time: string; // ISO 8601
  tempC: number;
}

export interface ForecastResponse {
  days: ForecastDay[];
  hours: HourlyPoint[]; // first 48 entries only
  sunriseIso: string;
  sunsetIso: string;
}
```

**Rationale:** `comfort-score` needs `feelsLikeMaxC`, `precipProbability`, `windSpeedKmh`, `cloudCoverPercent`, `uvIndexMax`. `animated-bg` needs `weatherCode`, `sunriseIso`, `sunsetIso`. Encoding all of these upfront avoids type churn when those capabilities ship.

---

### 3. In-memory cache keyed by `lat+lon`

**Decision:** A module-level `Map<string, ForecastResponse>` in a React context (or a simple module singleton if context proves heavyweight). On location change, the existing entry for the previous key is retained but the component re-fetches for the new key. Cache size is capped at 5 entries.

**Alternatives considered:**

- _No cache_ — re-fetches on every render/navigation; acceptable for MVP but wastes Open-Meteo quota and adds latency on back-navigation.
- _SWR / React Query_ — adds client bundle weight (NFR-PERF-03). Open-Meteo data is public and changes infrequently enough that a manual cache is sufficient.

**Rationale:** Satisfies FR-FORECAST-05 with zero added dependencies.

---

### 4. Recharts loaded via dynamic import (client-only)

**Decision:** `HourlyChart` wraps Recharts in `next/dynamic` with `{ ssr: false }` and a skeleton placeholder matching the chart height.

**Rationale:** Recharts is ~75 KB gz. Without dynamic import it inflates the SSR bundle unnecessarily (chart is useless without JS) and risks exceeding NFR-PERF-03. The skeleton satisfies perceived performance while the chunk loads.

---

### 5. `ForecastPanel` as a client component; `DayCard` as a server component

**Decision:** `ForecastPanel` is `'use client'` — it reads URL search params, manages the fetch/cache lifecycle, and coordinates child state. `DayCard` is a pure presentational server component receiving typed props.

**Rationale:** Keeps as much rendering on the server as possible (NFR-PERF-02) while giving the panel the reactivity it needs for re-fetch on location change.

---

### 6. Weather icons from WMO code mapping (inline SVGs, no icon library)

**Decision:** A `lib/forecast/weatherIcon.ts` module maps WMO weather codes to a small set of inline SVG identifiers. Icons are inlined as React components in a `WeatherIcon` component — no external icon library.

**Rationale:** Icon libraries (react-icons, heroicons) add bundle weight and often require tree-shaking configuration. A bespoke mapping of ~10 distinct conditions keeps the payload minimal and avoids an extra dependency.

## Risks / Trade-offs

- **Recharts major-version API drift** → Pin `recharts` to the minor version used during implementation; add a note in `package.json` comments.
- **Open-Meteo variable name changes** → The Route Handler transform function in `lib/forecast/transform.ts` isolates the raw API surface; only this file needs updating if Open-Meteo renames fields.
- **48-hour chart data volume** → Recharts renders 48 data points comfortably on mobile but may cause layout shifts on very narrow screens. Limit chart minimum width with `min-w-0` and let it scroll within its container.
- **Hydration mismatch on time-dependent data** → Sunrise/sunset strings are rendered as plain text from server-fetched data, not from `new Date()` on the client. This avoids hydration errors.

## Open Questions

- None blocking implementation. The WMO-to-icon mapping can be expanded iteratively without changing the data contract.
