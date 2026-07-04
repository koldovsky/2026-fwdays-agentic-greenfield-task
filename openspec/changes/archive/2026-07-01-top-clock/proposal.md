## Why

The app shell from Phase 1 reserves a header slot for a live clock but does not render one yet. FR-CLOCK-01 requires a local-time display that updates every second without blocking route configuration or map rendering — a small but visible signal that the app is alive and oriented to the rider's present moment.

## What Changes

- Add a client-only `HeaderClock` component showing local time in `HH:MM:SS` (24-hour) format
- Mount the clock in `SiteHeader` via the existing `children` slot (between wordmark area and theme toggle)
- Style with Geist Mono, `text-sm`, and `tabular-nums` per DESIGN.md
- Tick every second using an isolated client update pattern that avoids re-rendering the shell or main content
- Reserve fixed width for the clock display to prevent layout shift on digit changes
- Add Ukrainian `aria-label` for the clock via the local i18n dictionary (NFR-I18N-01)

## Capabilities

### New Capabilities

- `header-clock`: Live local-time display in the header, 1 s refresh, non-blocking updates, accessible labeling

### Modified Capabilities

<!-- No existing spec requirements change — app-shell header slot already supports optional children -->

## Impact

- **Components:** new `components/clock/header-clock.tsx`; wire into `app/page.tsx` or layout via `SiteHeader` children
- **i18n:** add clock-related strings to `lib/i18n/uk.ts`
- **Dependencies:** none (uses browser `Date` and existing Geist Mono font variables)
- **Cross-cutting:** BC-PRIVACY-01 (no network/time API), NFR-OBS-01 (silent console), BC-BRAND-01 (calm copy)
- **Downstream:** `route-input` and map phases inherit header with clock; no API changes to shell contract
