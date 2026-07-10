# Design — add-city-search

## Goals / Non-goals

**Goals**

- Provide a client-side city search input in the existing shell.
- Debounce geocoding requests and avoid network calls for queries shorter than
  2 characters.
- Normalize Open-Meteo geocoding responses in pure `lib/` helpers.
- Keep selected location in local React state and mirror it into URL search
  params.
- Preserve privacy: no geolocation on load, no cookies, no analytics.

**Non-goals**

- Fetching weather forecast data for the selected city.
- Rendering a map or setting location via map click.
- Persisting recent searches or pinned cities.

## Key Decisions

| Decision | Alternatives | Trade-off |
|----------|--------------|-----------|
| Fetch Open-Meteo directly from a client component | Route handler proxy | Keyless API and no secrets make direct fetch simpler; server proxy can be added later if caching/rate limits require it |
| Pure helpers for URL/geocoding normalization | Inline logic in component | Keeps `lib/` testable and framework-free |
| In-memory request cache per browser session | No cache | Reduces repeated requests during typing without persistence or cookies |
| URL sync with `history.replaceState` | Next router navigation | Avoids full navigation and keeps the shell state local until forecast routing is designed |

## Open-Meteo API Contract

Endpoint: `https://geocoding-api.open-meteo.com/v1/search`

Parameters used by this slice:

- `name`: user query
- `count`: suggestion limit
- `language`: `uk`
- `format`: `json`

Relevant result fields:

- `id`, `name`, `latitude`, `longitude`, `country_code`, `country`, `admin1`,
  `timezone`, `population`

## Error Handling

- Empty success response: inline muted "Nothing found" message.
- Network/API error: inline calm message under the input; no toast and no
  console noise.
- Query shorter than 2 characters: clear suggestions and do not fetch.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Rate limits while typing | Debounce and in-memory cache by normalized query |
| URL contains invalid location data | Build URL params only from normalized selected suggestions |
| Enter selects wrong city | Auto-select only when exactly one suggestion is visible |
