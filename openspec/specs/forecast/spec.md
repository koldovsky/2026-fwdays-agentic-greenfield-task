# Forecast Spec

## Purpose

Enables the app to fetch and display a 7-day daily forecast and a 48-hour hourly temperature chart for the active location. The feature proxies Open-Meteo via an internal Route Handler, caches responses in memory, and surfaces sunrise/sunset times, weather icons, and comfort-score data types — all with Ukrainian-first UI strings and full accessibility compliance.

---

## Requirements

### Requirement: Fetch 7-day daily forecast on location selection

After an active location is set (via `?lat=&lon=&name=` URL params), the system SHALL fetch a 7-day daily forecast from the internal `/api/forecast` Route Handler. The Route Handler SHALL proxy the Open-Meteo forecast API, requesting daily variables: `temperature_2m_max`, `temperature_2m_min`, `apparent_temperature_max`, `apparent_temperature_min`, `precipitation_probability_max`, `wind_speed_10m_max`, `cloud_cover_mean`, `uv_index_max`, `weather_code`, `sunrise`, `sunset`. No Open-Meteo URL SHALL be called from client-side JavaScript.

#### Scenario: Location selected with valid coordinates

- **WHEN** the URL contains `?lat=<lat>&lon=<lon>&name=<name>`
- **THEN** the system sends `GET /api/forecast?lat=<lat>&lon=<lon>` and the Route Handler returns a JSON `ForecastResponse` object containing `days`, `hours`, `sunriseIso`, and `sunsetIso`

#### Scenario: No location in URL

- **WHEN** the URL has no `lat` or `lon` params
- **THEN** no forecast fetch is initiated and the forecast area is not rendered (empty/hero state is shown instead)

#### Scenario: Open-Meteo API error

- **WHEN** the upstream Open-Meteo API returns a non-2xx response
- **THEN** the Route Handler returns 502 and the `ForecastPanel` shows an inline error message in Ukrainian ("Не вдалося завантажити прогноз"); no console error is surfaced to the user

---

### Requirement: Render 7 day cards

The system SHALL render exactly 7 day cards in a horizontal scrollable row (mobile) or grid (tablet/desktop). Each card SHALL display: weekday name in Ukrainian, high temperature in °C, low temperature in °C, a weather icon derived from the WMO weather code, precipitation probability as a percentage, and wind speed in km/h.

#### Scenario: 7 days of data returned

- **WHEN** the forecast API returns 7 daily entries
- **THEN** exactly 7 day cards are rendered, each showing the Ukrainian weekday name, hi/lo °C, weather icon, precipitation probability (%), and wind speed (km/h)

#### Scenario: Today's card is visually distinguished

- **WHEN** the first day in the response matches today's date
- **THEN** that day card is rendered with a distinct visual treatment (e.g. highlighted border or background token) to indicate it represents today

#### Scenario: Weather icon maps to WMO code

- **WHEN** a day card has a `weatherCode` value
- **THEN** a recognizable weather icon (clear, partly cloudy, overcast, rain, snow, thunderstorm, fog) is rendered within the card; unknown codes fall back to the "overcast" icon

---

### Requirement: Render 48-hour hourly temperature line chart

The system SHALL render an interactive Recharts `LineChart` showing hourly temperature (°C) for the next 48 hours. The chart SHALL be loaded via `next/dynamic` with `ssr: false`. While the chart chunk is loading, a skeleton placeholder with the same height as the chart SHALL be shown. The X-axis SHALL display hour labels in HH:00 format; the Y-axis SHALL display temperature in °C.

#### Scenario: Hourly data available

- **WHEN** the forecast response includes at least 48 hourly temperature entries
- **THEN** the chart renders a line with 48 data points; X-axis shows hours, Y-axis shows °C

#### Scenario: Chart loading (dynamic import)

- **WHEN** the chart JavaScript chunk has not yet loaded
- **THEN** a skeleton placeholder matching the chart's dimensions is displayed in its place

#### Scenario: Chart is accessible

- **WHEN** a screen reader navigates to the chart area
- **THEN** the section has an `aria-label` in Ukrainian describing it as the 48-hour temperature chart

---

### Requirement: Display sunrise and sunset times

The system SHALL display the sunrise and sunset times for today's active location as small text below the hourly chart. Times SHALL be formatted as `HH:MM` in the local time of the active location using the `timezone` value returned by Open-Meteo. Labels SHALL come from `lib/i18n/uk.ts`.

#### Scenario: Sunrise and sunset available

- **WHEN** the forecast response includes `sunriseIso` and `sunsetIso` values
- **THEN** both times are displayed in `HH:MM` format beneath the hourly chart with Ukrainian labels ("Схід сонця" / "Захід сонця")

#### Scenario: No location-specific timezone

- **WHEN** Open-Meteo does not return a timezone for the location
- **THEN** sunrise/sunset times fall back to UTC display and are still shown

---

### Requirement: Re-fetch on location change; in-memory cache

The system SHALL re-fetch the forecast whenever the active location changes (i.e., `lat` or `lon` URL params change). The last successful response for each `lat+lon` key SHALL be stored in a module-level in-memory cache (max 5 entries). On navigation back to a previously selected location, the cached response SHALL be used immediately (no loading state) and a background revalidation SHALL NOT occur in MVP.

#### Scenario: User selects a new city

- **WHEN** the URL changes to a different `lat+lon` pair
- **THEN** the system initiates a new fetch for the new location; the previous location's data is replaced in the displayed forecast

#### Scenario: User navigates back to a cached location

- **WHEN** the URL changes to a `lat+lon` pair that exists in the in-memory cache
- **THEN** the cached `ForecastResponse` is displayed immediately with no loading spinner

#### Scenario: Cache exceeds 5 entries

- **WHEN** more than 5 distinct locations have been fetched in the session
- **THEN** the least-recently-used entry is evicted; subsequent requests for that location trigger a fresh fetch

---

### Requirement: Canonical forecast data types exported from lib

The system SHALL export the types `ForecastDay`, `HourlyPoint`, and `ForecastResponse` from `lib/forecast/types.ts`. These types SHALL be the single source of truth consumed by `comfort-score`, `animated-bg`, `map`, and `weekend-compare`. The `lib/forecast/` directory SHALL be framework-free (no Next.js or React imports) to satisfy TC-PURE-01.

#### Scenario: Downstream capability imports ForecastDay

- **WHEN** `comfort-score` or `animated-bg` imports from `lib/forecast/types.ts`
- **THEN** TypeScript resolves the import without errors and the type includes all fields required by that capability

#### Scenario: lib/forecast has no framework imports

- **WHEN** `tsc --noEmit` is run on the project
- **THEN** no import of `next/*` or `react` appears in `lib/forecast/types.ts` or `lib/forecast/transform.ts`

---

### Requirement: Forecast Route Handler

The system SHALL expose `GET /api/forecast?lat=<lat>&lon=<lon>` as a Next.js Route Handler. It SHALL call Open-Meteo's forecast endpoint with the appropriate daily and hourly variable params, transform the response into a `ForecastResponse` JSON object using `lib/forecast/transform.ts`, and return it with a `Cache-Control: s-maxage=600, stale-while-revalidate=300` header. The handler SHALL return 400 if `lat` or `lon` are missing or non-numeric.

#### Scenario: Valid lat/lon params

- **WHEN** `GET /api/forecast?lat=50.45&lon=30.52` is requested
- **THEN** the handler returns 200 with a valid `ForecastResponse` JSON body and `Cache-Control: s-maxage=600, stale-while-revalidate=300`

#### Scenario: Missing params

- **WHEN** `GET /api/forecast` is requested without `lat` or `lon`
- **THEN** the handler returns 400 with a JSON error body `{ "error": "lat and lon are required" }`

#### Scenario: Non-numeric params

- **WHEN** `GET /api/forecast?lat=abc&lon=xyz` is requested
- **THEN** the handler returns 400 with a JSON error body `{ "error": "lat and lon must be numbers" }`

---

### Requirement: UI strings in i18n files

All user-facing strings introduced by the forecast capability SHALL be stored in `lib/i18n/uk.ts` (Ukrainian, primary) and `lib/i18n/en.ts` (English fallback). No hardcoded display strings SHALL appear in component JSX.

#### Scenario: Ukrainian strings used by default

- **WHEN** the app renders the forecast panel
- **THEN** weekday names, sunrise/sunset labels, and error messages are sourced from `lib/i18n/uk.ts`

#### Scenario: English fallback exists

- **WHEN** a string key from the forecast section is accessed for English locale
- **THEN** `lib/i18n/en.ts` exports a matching key with equivalent English text
