# Add Top Clock

## Why

The shell header still shows only a static theme placeholder. The MVP design calls
for a live local-time clock so visitors always see when they are planning, without
opening another app.

## What Changes

- Add a compact accessible clock in the top bar between the wordmark and theme indicator.
- Update every minute while the page stays open.
- Keep formatting and aria labels in the i18n scaffold.

## Impact

- Affected specs: `top-clock`
- Affected code: `components/top-clock/`, `lib/top-clock/`, `app/page.tsx`, `lib/i18n/`
- Explicit non-goals: location timezone sync, seconds display, persisted preferences
