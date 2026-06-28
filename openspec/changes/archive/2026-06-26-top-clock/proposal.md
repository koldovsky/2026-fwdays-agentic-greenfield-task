## Why

The app shell (FR-SHELL-01) provides the header bar, but it currently has no live content. A compact local-time clock in the header delivers immediate value to the user — a glanceable time reference — and validates the client-component / hydration pattern before heavier data-driven widgets land.

## What Changes

- Add a `TopClock` client component rendered inside the app-shell header.
- The clock displays the user's local time (HH:MM:SS, 24-hour) and updates once per second while the page is open.
- The component carries a descriptive `aria-label` so screen readers announce the current time correctly.
- No server-side state, no external APIs, no hydration mismatch risk (initial render deferred to client).

## Capabilities

### New Capabilities

- `top-clock`: Compact accessible live local-time clock mounted in the app-shell header (FR-CLOCK-01).

### Modified Capabilities

_(none — `app-shell` spec requirements are unchanged; the clock mounts into the existing header slot without altering the shell contract)_

## Impact

- **New file:** `components/top-clock/TopClock.tsx` — `"use client"` component.
- **Modified:** `app/layout.tsx` (or the header region in `app-shell`) to import and render `<TopClock />`.
- **Dependencies added:** none (uses only `Date`, `setInterval`, `useState`, `useEffect`).
- **Bundle:** minimal — no third-party imports; relevant to NFR-PERF-03 (client JS ≤ 200 KB gz).
- **Accessibility:** `aria-label` updated every second; relevant to NFR-A11Y-01/02.
- **i18n / voice:** time format follows `lib/i18n/` conventions (NFR-I18N-01); label strings in `uk.ts` / `en.ts`.
