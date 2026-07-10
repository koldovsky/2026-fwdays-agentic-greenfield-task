# Add Animated Background

## Why

The shell still uses a static gradient placeholder. The product brief treats the
animated sky as the hero — it should reflect today's weather and location day/night
without blocking interaction.

## What Changes

- Replace the static page backdrop with a condition-driven animated layer.
- Drive day versus night from the active location's sunrise and sunset.
- Respect `prefers-reduced-motion` with a static gradient fallback.
- Keep the layer non-interactive (`pointer-events: none`).

## Impact

- Affected specs: `animated-bg`
- Affected code: `components/animated-bg/`, `lib/animated-bg/`,
  `components/weather-explorer/`, `app/globals.css`
- Explicit non-goals: map layers, weather icon changes, location timezone in header clock
