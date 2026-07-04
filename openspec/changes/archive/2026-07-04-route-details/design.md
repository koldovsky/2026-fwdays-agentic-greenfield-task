## Context

Phases 1–5 produce a structured `Itinerary` in `RoutePlanProvider` with days, stops, distances, and polylines. A minimal two-metric summary is insufficient for FR-VIEW-01/02. DESIGN.md defines sidebar width (320–380 px), Card day groups, Geist Mono metrics, and mobile stacking below the map.

Constraints: deterministic client calculations (FR-VIEW-02); Ukrainian copy (NFR-I18N-01, BC-BRAND-01); itinerary data duplicated for screen readers (NFR-A11Y-01). Map rendering is a parallel change — this change owns sidebar column only.

## Goals / Non-Goals

**Goals:**

- Sidebar visible when `itinerary` is non-null and planning succeeded
- Header block: total distance, total days, estimated total duration
- Per-day sections: day number, day distance, stop list with kind labels
- Pure functions for duration estimate from km (fixed average speed constant)
- Replace `RoutePlanSummary` with sidebar content
- Responsive sidebar: full width below map area on mobile; fixed width beside content from 768 px

**Non-Goals:**

- Leaflet map (`map-rendering`)
- Editing stops, drag-and-drop replanning
- Hotel/weather/infrastructure scoring
- GPX export
- Persisting sidebar state across refresh

## Decisions

### 1. Module layout

```
lib/itinerary-metrics/
  constants.ts           # ASSUMED_AVERAGE_SPEED_KMH = 60 (lab MVP)
  format-duration.ts     # minutes → "X год Y хв" Ukrainian
  estimate-duration.ts   # distanceKm → minutes at constant speed
  index.ts
lib/itinerary-metrics/__tests__/
  estimate-duration.test.ts
components/
  route-details/
    itinerary-sidebar.tsx
    day-group-card.tsx
    stop-list-item.tsx
  layout/
    route-results-layout.tsx   # shared with map phase — sidebar column here
```

**Rationale:** Duration not in engine by design; isolated pure helpers keep TC-PURE-01 boundaries for new math.

### 2. Duration model (FR-VIEW-01)

- Constant average speed: **60 km/h** (documented in code comment; lab estimate only)
- Total duration: `estimateDurationMinutes(itinerary.totalDistanceKm)`
- Per-day duration: `estimateDurationMinutes(day.distanceKm)`
- Format without exclamation marks: e.g. `12 год 30 хв`, `45 хв`

**Alternative considered:** OSRM leg durations — rejected; engine/itinerary does not store OSRM duration per day in MVP.

### 3. Sidebar structure

```
┌─ ItinerarySidebar ─────────────────┐
│ Загальний огляд                    │
│  Відстань: 540 km                  │
│  Днів: 2                           │
│  Час у дорозі: ~9 год              │
├─ Day 1 ────────────────────────────┤
│  400 km · ~6 год 40 хв             │
│  • Початок                         │
│  • Зупинка (150 km)                │
│  • Ночівля                         │
├─ Day 2 ────────────────────────────┤
│  ...                               │
└────────────────────────────────────┘
```

Use shadcn `Card` per day (DESIGN.md). Stop rows show kind label from i18n + distance from start where useful.

### 4. Stop kind labels (i18n)

| Kind | Key | Ukrainian |
| ---- | --- | --------- |
| start | `itinerary.stopStart` | Початок |
| end | `itinerary.stopEnd` | Кінець |
| rest | `itinerary.stopRest` | Зупинка |
| overnight | `itinerary.stopOvernight` | Ночівля |

Section headings: `itinerary.overviewTitle`, `itinerary.dayTitle` (with day number), `itinerary.distance`, `itinerary.duration`, `itinerary.days`.

### 5. Replace RoutePlanSummary

Remove `RoutePlanSummary` from `ConfigPanel`; render `ItinerarySidebar` in results layout when itinerary present.

Update `route-planning` spec via delta: minimal summary requirement superseded by sidebar.

**Alternative considered:** keep both — rejected; redundant UI.

### 6. Layout integration

`RouteResultsLayout` (client):

| Viewport | Layout |
| -------- | ------ |
| <768 px | config → map slot (empty if map not shipped) → sidebar full width |
| ≥768 px | row: `[config optional top/side] [map flex-1] [sidebar w-80 xl:w-96]` |

When map-rendering not yet applied: sidebar + config centered column still valid.

Provider at page level (same as map phase) — coordinate when both merge.

### 7. Accessibility

- Sidebar uses semantic headings (`h2`, `h3`) and lists
- Metrics exposed as text; map remains supplementary per DESIGN.md
- `aria-live="polite"` on sidebar when itinerary updates

### 8. Testing

- Vitest for `estimateDurationMinutes`, `formatDurationUk`
- Optional snapshot-free component tests deferred — pure lib tests sufficient for MVP

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Fixed 60 km/h inaccurate | Label as estimate; calm copy; no false precision (round minutes) |
| Layout conflict with map-rendering | Shared `RouteResultsLayout`; apply either order |
| Duplicate totals vs map bounds | Same `itinerary` source of truth |

## Migration Plan

1. Add `lib/itinerary-metrics/` + tests
2. Build sidebar components + i18n
3. Add/update `RouteResultsLayout`; move provider to page if not done
4. Remove `RoutePlanSummary`
5. Verify lint, test, build
6. Manual: plan route → sidebar day groups match engine output

Rollback: restore `RoutePlanSummary`; remove sidebar components.

## Open Questions

- None blocking. Shared layout file may be introduced by whichever change applies first; second change merges columns.
