# Design — add-forecast

## Goals / Non-goals

**Goals**

- Lift selected location state into a shared client wrapper so city search and
  forecast panels stay in sync.
- Fetch Open-Meteo daily and hourly data directly from the browser.
- Normalize Open-Meteo arrays into stable forecast day/hour models.
- Render daily forecast, chart, sun times, comfort badges, and weekend highlight.
- Cache successful forecast responses in memory by location coordinates.

**Non-goals**

- Map rendering, map click-to-set, reverse geocoding.
- Pinned city compare or multi-location forecast fetching.
- Persisting forecast data to storage/cookies.

## Key Decisions

| Decision | Alternatives | Trade-off |
|----------|--------------|-----------|
| Client wrapper owns active location | Server URL-driven route state | Keeps this slice small and avoids server/client waterfalls while forecast routing is still evolving |
| Direct Open-Meteo browser fetch | Next route handler proxy | API is keyless and no secrets are needed; route handler can be added if caching policy changes |
| Dynamic Recharts import | Static chart import | Keeps initial shell/search bundle smaller and loads chart only when forecast is visible |
| Pure normalization helpers | Inline component transforms | Unit-testable contracts and reusable comfort integration |

## Open-Meteo API Contract

Endpoint: `https://api.open-meteo.com/v1/forecast`

Parameters:

- `latitude`, `longitude`
- `daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset`
- `hourly=temperature_2m`
- `forecast_days=7`
- `forecast_hours=48`
- `timezone=auto`
- `wind_speed_unit=ms`

## Error Handling

- No selected location: show calm placeholder.
- Loading: inline muted loading state inside forecast panel.
- API/network error: inline calm message; no console noise and no full-page error.
- Invalid/partial API response: normalize to empty arrays and show inline
  degradation.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Recharts bundle hurts initial load | Load chart dynamically after a forecast exists |
| Open-Meteo arrays are partially missing | Normalize defensively in pure helpers |
| Comfort rationale contradicts data | Reuse existing `comfortScore()` implementation and tests |
