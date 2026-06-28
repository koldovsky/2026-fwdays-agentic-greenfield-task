## Why

The map and pinned-cities list currently behave as loosely coupled islands: switching the active city via a chip does not pan the map to that city, clicking the map sets the active location but never pins it, and removing the active city from pins leaves the UI in an empty-info state. These gaps break the mental model of a single coherent "current city" shared across all blocks.

## What Changes

- **Map auto-pan**: whenever the active location changes (chip click, search selection, or map click), the map pans and zooms to the new coordinates automatically — not just on initial mount.
- **Map click → auto-pin**: reverse-geocoding a map click now also pins the resolved city, using the queue rule below, so the info block always reflects a pinned city.
- **Queue pinning (max 5)**: the pinned list is capped at 5 cities. When the list is full and a new city is added (via map click or search bar), the oldest pin is evicted and the new city is appended. Previously the 6th+ pin was silently dropped.
- **Active fallback on unpin**: if the user removes the currently active city from the pinned list, the nearest remaining pin (the one immediately before it, or the first one if it was first) becomes the new active location.
- **Hide × when only 1 pin**: the dismiss button is hidden when there is exactly one pinned city, preventing an empty-block state. It reappears as soon as a second city is pinned.

## Capabilities

### New Capabilities

_(none — all behaviour belongs to existing capabilities)_

### Modified Capabilities

- `map`: add auto-pan to active coordinates on every prop change; map click triggers pin (with queue) in addition to URL update.
- `weekend-compare`: increase hard cap from 3 to 5 cities; replace "ignore when full" with queue eviction (FIFO); add active-fallback-on-unpin rule; hide × dismiss button when `pins.length === 1`.

## Impact

- `app/components/Map/MapClient.tsx` — add a `useEffect` + `map.flyTo` (or `map.setView`) imperative call via a `useMap` ref; accept and call an optional `onPin` prop.
- `app/components/PinnedCities/PinnedCitiesContext.tsx` — change `pin()` to apply queue eviction instead of early-return when at capacity; expose `activeCity` + `setActiveCity` from context so unpin can trigger a fallback.
- `app/components/PinnedCities/PinnedChipRow.tsx` — hide × button when `pins.length < 2`.
- `app/components/Shell.tsx` (or wherever `MapClient` and `PinnedCitiesContext` are wired) — pass `onPin` from context into the map component.
- `lib/forecast/types.ts` — no changes needed (`PinnedCity` type is sufficient).
- `lib/i18n/uk.ts` / `lib/i18n/en.ts` — no new strings required (existing unpin/dismiss labels cover the updated behaviour).
- No new Route Handlers or Open-Meteo calls are introduced.
- `lib/` stays framework-free (TC-PURE-01): all changes are in `app/components/` or `app/hooks/`.

### Non-goals

- Persisting the pinned list across page reloads (BC-PRIVACY-01, no localStorage).
- Changing the reverse-geocode API or the geocoding Route Handler.
- Animated map transitions (flyTo is optional; `setView` with no animation is acceptable if `prefers-reduced-motion` is set).
- Changing the weekend-compare table layout or comfort-score logic.
