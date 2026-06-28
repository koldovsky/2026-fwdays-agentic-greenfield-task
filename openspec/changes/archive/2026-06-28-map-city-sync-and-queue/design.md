## Context

The app currently manages two independent pieces of state:

1. **Active location** — stored in URL params (`?lat=&lon=&name=`); drives forecast fetches and map initial center.
2. **Pinned cities** — ephemeral React state in `PinnedCitiesContext`; drives the chip row and weekend compare table.

These two pieces of state are not synchronized bidirectionally:
- Switching the active city via a chip does not move the map viewport (the map only centers on the `lat`/`lon` it received at mount time via `MapContainer center={[lat, lon]}`).
- Clicking the map calls `router.push(?)` to update the URL and the active location, but does not call `pin()` in `PinnedCitiesContext`.
- Removing a pinned city that happens to be the active one produces a UI state where the info block still shows a forecast but no chip is active (no active fallback is performed).
- The dismiss (×) button is always visible, allowing the user to remove the last pinned city and leave the info block with nothing to display.

## Goals / Non-Goals

**Goals:**

- Map viewport always reflects the current active location (auto-pan on every change, not just mount).
- Any city that becomes active (via map click, search, or chip) is also pinned, using FIFO queue eviction when the list is full (cap 5).
- Removing the currently active pin automatically activates the nearest remaining pin.
- The × dismiss button is hidden when `pins.length === 1` to prevent an empty-block state.
- `prefers-reduced-motion` is respected: use `setView` (instant) instead of `flyTo` (animated).

**Non-Goals:**

- Persisting pins across page reloads.
- Changing the reverse-geocode API or any Route Handler.
- Changing the weekend-compare table layout or comfort-score logic.
- Making `lib/` aware of any of this (all changes stay in `app/`).

## Decisions

### Decision 1: Imperative map control via `useMap` + a child component

`MapContainer` does not re-center when its `center` prop changes after mount — this is a known Leaflet/react-leaflet limitation. The correct pattern is to use the `useMap()` hook inside a child component that receives the latest `lat`/`lon` as props and calls `map.setView()` (or `map.flyTo()`) in a `useEffect`.

**Alternative considered**: Replace `MapContainer center` with a controlled ref — rejected because it requires managing the Leaflet instance outside React's lifecycle, making SSR-compatibility harder.

**Implementation**: Add a `<MapViewSyncer lat={lat} lon={lon} />` child component inside `MapContainer`. It calls `map.setView([lat, lon], zoom)` in a `useEffect` keyed on `lat` and `lon`. `prefers-reduced-motion` check: use `window.matchMedia('(prefers-reduced-motion: reduce)').matches` to decide between `setView` (instant) and `flyTo` (animated, 0.8 s).

### Decision 2: Map click calls both `router.push` and `onPin`

`MapClient` receives an optional `onPin: (city: PinnedCity) => void` prop. After a successful reverse-geocode it calls both `router.push(?)` (existing behavior) and `onPin(resolvedCity)` (new).

The parent that renders `<MapClient>` (currently `Shell` or the page) wires `onPin` to the `pin` function from `usePinnedCitiesContext()`. This keeps `MapClient` decoupled from the context — it only needs a callback prop.

**Alternative considered**: Import `usePinnedCitiesContext` directly inside `MapClient` — rejected because `MapClient` is already a focused Leaflet component and adding context coupling would make it harder to test or reuse.

### Decision 3: FIFO queue in `PinnedCitiesContext.pin()`

`pin()` is changed from:

```
if (prev.length >= 5) return prev;
```

to:

```
const deduped = prev.filter(p => !(p.lat === city.lat && p.lon === city.lon));
const trimmed = deduped.length >= 5 ? deduped.slice(1) : deduped;
return [...trimmed, city];
```

This evicts the oldest city (index 0) when the list would exceed 5, then appends the new city. Duplicate pinning (same lat+lon) is handled by removing the existing entry first before re-appending (effectively a "move to back" operation, which also keeps duplicates out of the list).

**Alternative considered**: Keep "ignore when full" and show a toast — rejected because the user explicitly wants queue semantics and toasts add noise.

### Decision 4: Active fallback on unpin via context

`PinnedCitiesContext` currently only stores `pins`. To support active fallback, the context needs to know which city is currently active so `unpin()` can trigger `router.push` for the fallback city.

**Option A**: Pass `currentLat`/`currentLon` into `unpin()` as arguments and return the fallback city (or `null`) — the caller performs the navigation.

**Option B**: Store `activeLat`/`activeLon` in `PinnedCitiesContext` itself and have `unpin()` call `router.push` internally.

**Decision**: Option A. `PinnedCitiesContext` stays purely about the list. `unpin(city)` returns `PinnedCity | null` (the fallback), and the call site (the chip row's parent) decides whether to navigate. This keeps the context framework-free from `useRouter`. The fallback logic: find the pin immediately before the removed city; if the removed city was first, use the new first pin.

### Decision 5: Hide × when `pins.length < 2`

`PinnedChipRow` already receives `pins` as a prop. A single conditional renders the `<button onClick={onUnpin}>` only when `pins.length > 1`. No new state or prop is needed.

## Risks / Trade-offs

- **Leaflet `setView` during SSR**: `MapViewSyncer` uses `useMap()` which is only valid inside a mounted `MapContainer`. Since `MapClient` is already loaded via `next/dynamic { ssr: false }`, there is no SSR risk. No change needed.
- **`onPin` called on every map click**: If the user clicks rapidly, multiple reverse-geocode requests may race. The existing `setErrorVisible` guard already handles failures. Queue eviction on rapid clicks will evict the oldest pin repeatedly — acceptable behaviour; no guard needed.
- **`unpin()` returning a value is a contract change**: Any existing callers of `unpin()` that ignore the return value are unaffected (TypeScript allows ignoring return values). No breaking change.
- **`prefers-reduced-motion` read at click time**: Using `window.matchMedia` in an event handler (not in `useEffect`) is safe in a client component; it always reads the current media query value.

## Migration Plan

All changes are additive or behavioural-only within `app/`. No database, no API, no cookie changes. Rollback = revert the PR. No migration steps required.

## Open Questions

_(none — all decisions are resolved above)_
