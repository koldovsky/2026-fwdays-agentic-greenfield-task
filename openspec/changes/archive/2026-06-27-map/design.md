## Context

The app's city-search capability already owns the active-location state contract: selecting a city sets `?lat=&lon=&name=` URL params and triggers a forecast re-fetch. The map capability plugs into that same contract from the other end — a click on the map reverse-geocodes the point, then feeds the result into the same URL-state update. Leaflet is the accepted map library (TC-STACK-04). All Open-Meteo API calls must be server-side (TC-DATA-01). Leaflet depends on browser DOM globals and cannot be server-rendered.

## Goals / Non-Goals

**Goals:**

- Render an OSM-tiled Leaflet map bounded to the active location with a city-name marker popup.
- On map click, reverse-geocode the point (server-side route handler) and update active location + URL state, triggering the existing forecast re-fetch.
- Keep the initial JS bundle under 200 KB gz by loading Leaflet only on the client via `dynamic({ ssr: false })`.
- Provide a skeleton placeholder with the same dimensions as the map while the bundle loads.
- Display OSM attribution as required by the Tile Usage Policy (TC-MAP-01).

**Non-Goals:**

- Multiple simultaneous map markers (that is part of `weekend-compare`).
- Custom tile providers — OSM raster only.
- Map-based clustering, routing, or drawing tools.
- Persisting map zoom/center beyond the active location change.

## Decisions

### 1. SSR exclusion via `next/dynamic`

**Decision:** Wrap the map in `dynamic(() => import('./MapClient'), { ssr: false })` from `components/Map/index.tsx`.

**Rationale:** Leaflet accesses `window`, `document`, and `L` globals on import. Running it in Node (SSR/RSC) throws. `ssr: false` prevents the import entirely on the server; the exported wrapper renders the skeleton in its place until hydration completes.

**Alternatives considered:**

- `"use client"` alone — insufficient; Next.js still imports the module during the server pass even for client components when they're in the module graph.
- Conditional `typeof window !== 'undefined'` guard — fragile and not the idiomatic Next.js pattern.

---

### 2. Reverse-geocoding via a server Route Handler

**Decision:** Add `app/api/reverse-geocode/route.ts` that accepts `?lat=&lon=` and proxies to the Open-Meteo geocoding API's reverse endpoint. The map client calls this route on click, not Open-Meteo directly.

**Rationale:** TC-DATA-01 requires all Open-Meteo calls to originate from server components or route handlers, not client code. This also keeps the Open-Meteo URL out of the client bundle and allows future caching headers at the edge.

**Alternatives considered:**

- Leaflet click handler calling Open-Meteo directly from the browser — violates TC-DATA-01.
- Server Action — appropriate for mutations; an HTTP GET fetch from a client event is a cleaner fit for a Route Handler.

---

### 3. Reuse existing active-location URL state

**Decision:** After reverse-geocoding, the map component calls the same URL-state setter used by city-search (i.e., uses `router.push` / `useRouter` with the `?lat=&lon=&name=` params), triggering the forecast re-fetch through the existing data path.

**Rationale:** Avoids duplicating location-state logic. The spec says map click "updates the active location" — city-search already defines what "active location" means and how it propagates.

**Alternatives considered:**

- A separate Zustand/context store for map-selected location — would create two sources of truth for the same state.

---

### 4. Skeleton placeholder

**Decision:** The `loading` prop of `dynamic()` renders a `<div>` skeleton with the same `height` and `width` as the map container, using design-system surface tokens and a CSS pulse animation respecting `prefers-reduced-motion`.

**Rationale:** Leaflet chunk is large (~140 KB gz); without a placeholder the map area is blank for a visible flash. A skeleton with the same footprint prevents layout shift (NFR-PERF-02 Lighthouse CLS).

## Risks / Trade-offs

- **Leaflet bundle size** → chunk-split via `dynamic()` keeps it out of the initial bundle, but the Leaflet + react-leaflet chunk is ~140 KB gz — approaching NFR-PERF-03's 200 KB client-JS limit. Monitor with `next build --analyze` after integration. Mitigation: load only on the page that uses the map; do not eagerly import elsewhere.

- **Reverse-geocoding accuracy** → Open-Meteo's reverse endpoint returns the nearest named location, which may differ from the exact clicked coordinates. Mitigation: show the resolved city name in the marker popup before committing the selection; if the result is wrong, the user can search instead.

- **Leaflet CSS conflicts** → Leaflet requires its own CSS (`leaflet/dist/leaflet.css`). Next.js allows importing CSS in client components; import it inside `MapClient.tsx` to scope it. Risk: global `.leaflet-*` styles may leak. Mitigation: import inside the dynamic component file, not in `globals.css`.

- **tile-level attribution** → OSM requires attribution to appear on the rendered map, not just in the footer. The `TileLayer` `attribution` prop handles this automatically. Mitigation: never override or hide the default attribution string.
