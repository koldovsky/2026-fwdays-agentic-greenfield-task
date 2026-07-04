## Context

Phases 1–5 deliver shell, route input, segmentation engine, OSRM integration, and `RoutePlanProvider` holding `Itinerary | null`. Successful planning shows a compact summary only. FR-MAP-01/02/03/04 require a client-only Leaflet map. DESIGN.md defines marker colors, polyline styling, results layout (map flex-1 + sidebar slot), and OSM attribution placement.

Constraints: TC-STACK-03 (Leaflet + OSM tiles); no API keys (NFR-COST-01); map supplementary to text (NFR-A11Y-01); silent console (NFR-OBS-01). `route-details` adds sidebar in parallel — this change owns the map column only.

## Goals / Non-Goals

**Goals:**

- Interactive OSM map when `itinerary` is non-null and planning succeeded
- Route polyline from `itinerary.polyline`; fit bounds with padding
- Markers for each stop in `itinerary.stops` with distinct colors/shapes per DESIGN.md
- `dynamic(..., { ssr: false })` map island with Skeleton placeholder during SSR / before hydration
- Attribution overlay: "© OpenStreetMap contributors" bottom-right on map
- Results layout: map occupies primary main area; config panel accessible for replanning

**Non-Goals:**

- Itinerary sidebar (`route-details`)
- Replacing `RoutePlanSummary` (kept until sidebar ships)
- GPX export, tile server proxy, custom map styles
- Re-fetching OSRM or mutating itinerary
- 3D terrain, routing overlays, live traffic

## Decisions

### 1. Dependencies and dynamic loading

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

Map entry: `components/map/route-map.tsx` (`"use client"`).

Page-level lazy load:

```tsx
const RouteMap = dynamic(() => import("@/components/map/route-map").then(m => m.RouteMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
```

Import `leaflet/dist/leaflet.css` inside `route-map.tsx` only.

**Rationale:** FR-MAP-03 compliance; keeps Leaflet out of server bundle.

### 2. Component layout

```
components/
  map/
    route-map.tsx          # MapContainer, TileLayer, Polyline, markers, attribution
    route-map-markers.tsx  # stop markers by kind
    map-attribution.tsx    # FR-MAP-04 overlay
    map-skeleton.tsx       # shadcn Skeleton block
  layout/
    route-results-layout.tsx  # client wrapper: config + map when itinerary present
```

`RouteResultsLayout` reads `useRoutePlan()`:

| State | Main layout |
| ----- | ----------- |
| No itinerary | centered `ConfigPanel` (current) |
| Itinerary + success | config strip/card top or side + map `min-h-[320px] flex-1` |

On mobile (<768 px): config above map, map full width, min height 280–320 px.

From 768 px: optional horizontal split — config narrow column or collapsible; map flex-1. Sidebar column reserved as empty/spacer until `route-details` lands (no layout break).

### 3. Tile layer and attribution

- Tiles: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- `TileLayer` `attribution` prop set for Leaflet control
- Additional visible overlay per FR-MAP-04: `© OpenStreetMap contributors` in `text-xs text-muted` bottom-right inside map container (DESIGN.md)

### 4. Polyline and bounds

- Single polyline: `itinerary.polyline` mapped to `[lat, lon][]` for Leaflet
- Style: color `var(--primary)` or `#b45309`, weight 4, opacity 0.85
- `fitBounds` on polyline with `padding: [24, 24]` when itinerary changes
- Use `useMap` + `useEffect` in child component for bounds update

### 5. Markers (FR-MAP-02)

| Kind | Color | Marker |
| ---- | ----- | ------ |
| start | `#16a34a` | circle |
| end | `#dc2626` | circle |
| rest | `#2563eb` | small circle |
| overnight | `#9333ea` | diamond (divIcon rotated square) |

Use `CircleMarker` or custom `DivIcon` — no external marker image assets.

Popup optional (MVP: no popup text required; markers visually distinct enough).

### 6. Map visibility rules

- Render map only when `status === "success"` and `itinerary !== null`
- During `loading`, keep previous map visible if itinerary exists, or show skeleton
- On planning `error`, hide map (itinerary cleared)

### 7. App wiring

Update `app/page.tsx`:

```tsx
<RoutePlanProvider>
  <RouteResultsLayout />
</RoutePlanProvider>
```

Move provider from `ConfigPanel` to page level so layout can access itinerary. `ConfigPanel` remains form-only inside results layout.

**Alternative considered:** keep provider inside ConfigPanel — rejected; map layout needs same context at page level.

### 8. Leaflet default icon fix

If default marker icons needed, set `L.Icon.Default.imagePath` or use DivIcons only — prefer DivIcons/CircleMarker to avoid asset path issues in Next.js.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Leaflet SSR/hydration issues | `dynamic` + `ssr: false` only on map |
| Large bundle size | Single dynamic chunk; quality-gate Lighthouse follow-up |
| Map without sidebar on first ship | Summary card remains; sidebar parallel change |
| Tile usage policy | Standard OSM attribution; no bulk scraping |

## Migration Plan

1. Add npm dependencies
2. Build map components and skeleton
3. Add `RouteResultsLayout`; move `RoutePlanProvider` to page
4. Wire map to itinerary context
5. `npm test && npm run lint && npm run build`
6. Manual: plan route → map with polyline and markers visible

Rollback: remove map components; restore centered ConfigPanel-only layout.

## Open Questions

- None blocking. Exact config-panel placement in results view may refine when both map and sidebar are integrated.
