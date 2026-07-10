# Add Forecast

## Why

City search can now choose an active location, but the app still shows placeholder
forecast content. The MVP needs data-backed weather cards and a 48-hour
temperature chart before map, animation, and compare slices can build on the
active location.

## What Changes

- Fetch a 7-day Open-Meteo forecast for the selected location.
- Normalize daily and hourly forecast responses in framework-free helpers.
- Render 7 day cards, today's sunrise/sunset, and a 48-hour Recharts line chart.
- Add memory caching per location for successful forecast responses.
- Surface calm inline loading/error/empty states.
- Wire existing comfort-score helpers into day cards and weekend highlight data.

## Impact

- Affected specs: `forecast`, `comfort-score`
- Affected code: `components/weather-explorer/`, `components/forecast/`,
  `lib/forecast/`, `lib/i18n/`
- New dependency: `recharts`
- Explicit non-goals: map rendering/click-to-set, compare table, animated
  background
