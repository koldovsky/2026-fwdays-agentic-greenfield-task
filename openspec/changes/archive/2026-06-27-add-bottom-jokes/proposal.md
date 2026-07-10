# Add Bottom Jokes

## Why

The footer still shows shell placeholder copy. The MVP needs calm Ukrainian
weather jokes and proper Open-Meteo / OpenStreetMap credits without external APIs
or tracking.

## What Changes

- Add deterministic footer jokes seeded by active location and date.
- Replace placeholder footer text with attribution links.
- Wire footer into the Weather Explorer flow so jokes update with location.

## Impact

- Affected specs: `bottom-jokes`
- Affected code: `components/bottom-jokes/`, `lib/bottom-jokes/`, `lib/i18n/`,
  `components/weather-explorer/`, `app/page.tsx`
- Explicit non-goals: external joke APIs, analytics, cookie-based rotation
