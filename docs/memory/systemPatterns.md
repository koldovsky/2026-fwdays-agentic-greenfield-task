# System patterns

Operational summary for agents. Proofs live in OpenSpec specs and unit tests.

## Architectural snapshot

Next.js App Router shell with **framework-free domain layer** in `lib/`. UI in
`components/` consumes pure helpers and i18n strings. External data from
Open-Meteo only; no server persistence, no cookies.

```
Visitor → app/page (server) → client islands (search, map, forecast panel)
                ↓
         lib/forecast, lib/scoring, lib/city-search, …
                ↓
         Open-Meteo APIs (forecast, geocoding)
```

## State and data flow

- **Authoritative location state:** URL query `?lat=&lon=&name=` + React context
  in client islands; shareable deep links.
- **Forecast cache:** in-memory per location until location changes (`FR-FORECAST-05`).
- **Pinned cities (compare):** client state only, max 3 (`FR-COMPARE-01`).
- **Forbidden:** geolocation on page load; analytics; app-set cookies; Next/React
  imports inside `lib/` (`TC-PURE-01`).

## Module / layer boundaries

| Layer | Responsibility | Key paths |
|-------|----------------|-----------|
| Pure domain | Scoring, forecast parsing, geocoding helpers, jokes seed | `lib/scoring/`, `lib/forecast/`, `lib/city-search/`, `lib/bottom-jokes/` |
| i18n | All UI copy | `lib/i18n/uk.ts`, `lib/i18n/en.ts` |
| Client UI | Map, search combobox, animated canvas, compare table | `components/` |
| App shell | Layout, grid, empty state | `app/`, `components/shell/` |
| Specs | Behavior contracts | `openspec/specs/<capability>/spec.md` |
| Gates | Deterministic verification | `scripts/check-*.mjs`, `.githooks/` |

## Fragile areas (touch with care)

- **Comfort rationale tone** — output eval guards «приємно» in rain (`evals/cases/`).
- **SSR/hydration** — map and animated background are client-only with skeletons.
- **Bundle size** — Recharts and Leaflet loaded dynamically where possible (`NFR-PERF-03`).
- **Open-Meteo rate limits** — debounced geocoding + in-memory cache in `lib/`.

## Observability / errors

- API failures: inline calm messages in Ukrainian, component stays mounted.
- No `console.*` on healthy session.
- Demo recordings in `docs/qa/demo-recordings/` illustrate happy paths; unit tests + evals decide correctness.

## Doc map

| Topic | Detail doc |
|-------|------------|
| Requirements | `docs/requirements.md` |
| Capability specs | `openspec/specs/` |
| QA evidence | `docs/qa/` |
| Design tokens | `DESIGN.md` |
| Delivery phases | `docs/current-state.md`, `docs/mvp-capability-plan.md` |
