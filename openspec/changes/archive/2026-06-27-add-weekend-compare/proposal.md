# Add Weekend Compare

## Why

Visitors can already inspect one city at a time, but the MVP promise is a calm
weekend decision across a few places. Pinning and comparing Saturday/Sunday closes
the critical path before polish slices.

## What Changes

- Pin up to three cities as chips above the forecast panel.
- Toggle a weekend compare table with hi/lo, precipitation %, and comfort.
- Sticky city headers with make-active controls.
- Parallel forecast fetch for pinned cities in compare mode.

## Impact

- Affected specs: `weekend-compare`
- Affected code: `components/weekend-compare/`, `lib/weekend-compare/`,
  `components/weather-explorer/`, `lib/i18n/`
- Explicit non-goals: persisted pins, more than three cities, server-side caching
