# OpenSpec capability map — MotoRoute Agent MVP

Last updated: 2026-07-01

This document splits [requirements.md](requirements.md) into **OpenSpec changes** (one change per capability), defines **implementation order**, and maps every requirement ID for traceability.

Each capability becomes an OpenSpec change via `/opsx:propose <change-name>`. After implementation, archive with `/opsx:archive` so specs accumulate under `openspec/specs/`.

---

## Summary

| Phase | Change name           | Capability        | Depends on                          |
| ----- | --------------------- | ----------------- | ----------------------------------- |
| 1     | `app-foundation`      | Shell & platform  | — (Next.js scaffold exists)         |
| 2     | `top-clock`           | Header live clock | `app-foundation`                    |
| 3     | `route-input`         | Search & config   | `app-foundation`                    |
| 4     | `route-engine`        | Segmentation core | `route-input`                       |
| 5     | `routing-integration` | OSRM wiring       | `route-input`, `route-engine`       |
| 6     | `map-rendering`       | Interactive map   | `routing-integration`               |
| 7     | `route-details`       | Itinerary sidebar | `routing-integration`               |
| 8     | `quality-gate`        | NFR verification  | phases 1–7                          |

Phases 6 and 7 can run **in parallel** once phase 5 is complete.

---

## Dependency graph

```
                    ┌─────────────────┐
                    │ app-foundation  │  Phase 1
                    └────────┬────────┘
              ┌──────────────┼──────────────┐
              ▼              ▼              │
       ┌────────────┐  ┌────────────┐       │
       │ top-clock  │  │route-input │      │  Phases 2–3
       └────────────┘  └─────┬──────┘       │
                             ▼              │
                      ┌─────────────┐       │
                      │route-engine │       │  Phase 4
                      └──────┬──────┘       │
                             ▼              │
                 ┌───────────────────────┐  │
                 │ routing-integration   │  │  Phase 5
                 └───────────┬───────────┘  │
                    ┌────────┴────────┐     │
                    ▼                 ▼     │
             ┌────────────┐   ┌─────────────┐
             │map-rendering│   │route-details│  Phases 6–7 (parallel)
             └──────┬─────┘   └──────┬──────┘
                    └────────┬───────┘
                             ▼
                    ┌─────────────────┐
                    │  quality-gate   │  Phase 8
                    └─────────────────┘
```

---

## End-to-end user flow vs build order

The **rider journey** (product-brief) is: land → configure → review map + breakdown.

The **build order** front-loads platform and input, then pure logic, then external routing, then presentation. That lets each change ship a testable vertical slice without blocking on map tiles or OSRM until the domain model exists.

```
Land (shell) ──► Configure (input + URL) ──► Compute (engine + OSRM) ──► Review (map + sidebar)
     │                    │                           │                        │
 Phase 1            Phases 2–3                  Phases 4–5               Phases 6–7
```

---

## Cross-cutting constraints (every change)

Apply these in **every** OpenSpec change; they are not owned by a single capability.

| ID            | Constraint                                      | How to enforce                          |
| ------------- | ----------------------------------------------- | --------------------------------------- |
| TC-STACK-01   | Next.js 16 App Router, React 19, strict TS      | Already accepted; maintain in all code  |
| BC-PRIVACY-01 | No analytics, trackers, fingerprinting          | No Vercel Analytics, GA, etc.           |
| BC-PRIVACY-02 | No persistent cookies or client profile storage | URL-only shareable state (FR-SEARCH-03) |
| NFR-COST-01   | No premium or key-gated APIs                    | OSM, public geocoding, public OSRM      |
| NFR-OBS-01    | Silent console in normal workflow               | No stray `console.*` in production paths|
| BC-DEMO-01    | Open source, spec-to-test traceability          | Reference requirement IDs in tests/PRs  |

Stack choices already **accepted** and assumed from the scaffold:

| ID          | Stack element                          |
| ----------- | -------------------------------------- |
| TC-STACK-02 | Tailwind CSS 4, shadcn/ui, CVA         |
| TC-STACK-03 | OSM tiles + Leaflet / react-leaflet    |
| TC-STACK-04 | Open geocoding + OSRM public endpoints |

---

## Capability details

### Phase 1 — `app-foundation`

**Purpose:** Runnable app shell with Ukrainian-first UI, theme, responsive layout, empty state, and footer attribution. Establishes conventions every later change inherits.

**OpenSpec command:** `/opsx:propose app-foundation`

| Type | IDs |
| ---- | --- |
| Functional | FR-SHELL-01, FR-SHELL-02, FR-SHELL-03 |
| Business / UX | BC-BRAND-01, BC-BRAND-02 |
| Non-functional | NFR-I18N-01 |
| Technical | TC-STACK-02 (component library wiring) |

**Key deliverables**

- App layout: top bar (logo placeholder, theme toggle slot), main content area
- Responsive breakpoints at 768 px and 1280 px
- Centered empty-state configuration panel on first load (no default route)
- Ukrainian UI dictionary structure (local trees, no i18n middleware)
- Footer with OSM / routing provider credits and external links
- shadcn/ui + Tailwind theme tokens aligned with [DESIGN.md](../DESIGN.md)

**Blockers / notes**

- None for visual identity — see root `DESIGN.md`.

**Acceptance sketch**

- Visitor lands on calm Ukrainian empty state; theme toggle works; layout adapts at both breakpoints; footer links present.

---

### Phase 2 — `top-clock`

**Purpose:** Live local-time clock in the header without blocking core UI.

**OpenSpec command:** `/opsx:propose top-clock`

| Type | IDs |
| ---- | --- |
| Functional | FR-CLOCK-01 |

**Depends on:** `app-foundation` (top bar exists)

**Key deliverables**

- Clock component in header, 1 s tick via non-blocking pattern (e.g. isolated client component, `requestAnimationFrame` or interval outside hot render path)
- No layout shift or main-thread jank on tick

**Acceptance sketch**

- Clock updates every second; route configuration and map areas remain responsive.

---

### Phase 3 — `route-input`

**Purpose:** Capture start/end locations and rider constraints; sync active state to the URL for sharing.

**OpenSpec command:** `/opsx:propose route-input`

| Type | IDs |
| ---- | --- |
| Functional | FR-SEARCH-01, FR-SEARCH-02, FR-SEARCH-03, FR-INPUT-01 |
| Technical | TC-DATA-01 (geocoding leg), TC-STACK-04 (geocoding endpoints) |
| Non-functional | NFR-A11Y-01, NFR-COST-01 |

**Depends on:** `app-foundation` (configuration panel, i18n, form primitives)

**Key deliverables**

- Debounced Start / End fields calling a CORS-safe open geocoding API
- Autocomplete rows: name, region, country
- Numeric fields: rest interval (km), max daily distance (km) with strict validation
- URL query sync: `?start=&end=&rest=&day=` (parse on load, write on change)
- Keyboard-navigable inputs with visible focus rings

**Acceptance sketch**

- Selecting locations updates the URL; reloading restores state; invalid numbers are rejected with calm Ukrainian messages.

---

### Phase 4 — `route-engine`

**Purpose:** Deterministic, pure-function route segmentation — the product core independent of DOM and network.

**OpenSpec command:** `/opsx:propose route-engine`

| Type | IDs |
| ---- | --- |
| Functional | FR-VIEW-02 (computation semantics) |
| Technical | TC-PURE-01, TC-TEST-01 |
| Non-functional | NFR-PERF-02 |

**Depends on:** `route-input` (domain types for rest/day limits and coordinate pairs)

**Key deliverables**

- Pure modules under `lib/` (e.g. segment polyline by rest interval, split into travel days by max daily km)
- Typed inputs/outputs: waypoints, rest stops, overnight points, per-day metrics
- Vitest suite with fixture geometries (no network in unit tests)
- Benchmark or test asserting segmentation completes in &lt; 50 ms on representative datasets

**Acceptance sketch**

- Given mock OSRM-like coordinate arrays + constraints, engine returns stable day groups and stop lists; tests pass without browser or map.

---

### Phase 5 — `routing-integration`

**Purpose:** Connect user configuration to real open routing data, then feed the pure engine.

**OpenSpec command:** `/opsx:propose routing-integration`

| Type | IDs |
| ---- | --- |
| Technical | TC-DATA-01 (OSRM leg), TC-STACK-04 (OSRM endpoints) |
| Non-functional | NFR-COST-01, NFR-OBS-01 |

**Depends on:** `route-input`, `route-engine`

**Key deliverables**

- Browser-side OSRM route fetch (CORS-compliant public instance)
- Orchestration: geocoded start/end → OSRM geometry → `route-engine` → structured itinerary model
- Graceful degradation: visible calm warning UI on geocoding or routing failure (no broken layout)
- Trigger on explicit user action (submit / plan route), not on page load (privacy)

**Acceptance sketch**

- Valid start/end produces a full itinerary object; API failures show Ukrainian warning state; console stays clean in happy path.

---

### Phase 6 — `map-rendering`

**Purpose:** Client-only interactive map bounded to the active itinerary with distinct markers.

**OpenSpec command:** `/opsx:propose map-rendering`

| Type | IDs |
| ---- | --- |
| Functional | FR-MAP-01, FR-MAP-02, FR-MAP-03, FR-MAP-04 |
| Technical | TC-STACK-03 |

**Depends on:** `routing-integration` (itinerary geometry and stop coordinates)

**Key deliverables**

- Leaflet map via `dynamic(..., { ssr: false })` with structured placeholder skeleton
- Fit bounds to active route; color-coded markers for rest, overnight, terminal
- OSM raster tiles with required “© OpenStreetMap contributors” attribution (bottom-right)

**Acceptance sketch**

- After planning, map shows route and markers; SSR shows skeleton only; attribution visible.

---

### Phase 7 — `route-details`

**Purpose:** Chronological sidebar presenting total and per-day breakdown from computed itinerary.

**OpenSpec command:** `/opsx:propose route-details`

| Type | IDs |
| ---- | --- |
| Functional | FR-VIEW-01, FR-VIEW-02 (presentation) |

**Depends on:** `routing-integration` (same itinerary model as map)

**Key deliverables**

- Nested sidebar: total duration, distance, day count
- Groups by travel day with per-segment metrics (from client-side deterministic calculations)
- Responsive layout alongside map (inherits shell breakpoints)

**Acceptance sketch**

- Sidebar mirrors engine output; day groups match map markers; totals consistent with map route.

---

### Phase 8 — `quality-gate`

**Purpose:** Verify non-functional targets and demo readiness after feature-complete MVP.

**OpenSpec command:** `/opsx:propose quality-gate`

| Type | IDs |
| ---- | --- |
| Non-functional | NFR-PERF-01, NFR-PERF-02 (re-verify), NFR-OBS-01, NFR-DX-01 |
| Business | BC-DEMO-01 |

**Depends on:** all feature phases (1–7)

**Key deliverables**

- Lighthouse Performance ≥ 90 (mobile + desktop) on production build
- CI script: `npm run lint && tsc --noEmit && npm test && npm run build` under 60 s
- Requirement-ID trace matrix: each `FR-*` / `NFR-*` maps to a test or manual check
- Final console-audit pass

**Acceptance sketch**

- Documented test plan with requirement IDs; Lighthouse and CI thresholds met.

---

## Requirements coverage matrix

Every MVP requirement appears exactly once in a primary owning change (cross-cutting items repeated in the table above only).

| Requirement | Primary change        |
| ----------- | --------------------- |
| FR-SHELL-01 | app-foundation        |
| FR-SHELL-02 | app-foundation        |
| FR-SHELL-03 | app-foundation        |
| FR-CLOCK-01 | top-clock             |
| FR-SEARCH-01| route-input           |
| FR-SEARCH-02| route-input           |
| FR-SEARCH-03| route-input           |
| FR-INPUT-01 | route-input           |
| FR-MAP-01   | map-rendering         |
| FR-MAP-02   | map-rendering         |
| FR-MAP-03   | map-rendering         |
| FR-MAP-04   | map-rendering         |
| FR-VIEW-01  | route-details         |
| FR-VIEW-02  | route-engine + route-details |
| NFR-PERF-01 | quality-gate          |
| NFR-PERF-02 | route-engine + quality-gate |
| NFR-A11Y-01 | route-input           |
| NFR-COST-01 | cross-cutting         |
| NFR-OBS-01  | cross-cutting + quality-gate |
| NFR-I18N-01 | app-foundation        |
| NFR-DX-01   | quality-gate          |
| TC-STACK-01 | cross-cutting         |
| TC-STACK-02 | app-foundation        |
| TC-STACK-03 | map-rendering         |
| TC-STACK-04 | route-input + routing-integration |
| TC-PURE-01  | route-engine          |
| TC-DATA-01  | route-input + routing-integration |
| TC-TEST-01  | route-engine          |
| BC-PRIVACY-01 | cross-cutting       |
| BC-PRIVACY-02 | cross-cutting       |
| BC-BRAND-01 | app-foundation        |
| BC-BRAND-02 | app-foundation        |
| BC-DEMO-01  | quality-gate          |

---

## Out of scope (no OpenSpec change)

Per [requirements.md](requirements.md) — do **not** propose changes for:

- GPX / KML export
- Weather, hotels, road-quality APIs
- Cross-session persistence (DB, localStorage profiles)
- Multi-destination routing
- Backend workers, push, server sync

---

## Recommended workflow

1. Install / verify OpenSpec CLI (`openspec doctor`) if not on PATH.
2. Run `/opsx:propose app-foundation` and complete artifacts (proposal → design → specs → tasks).
3. Implement with `/opsx:apply app-foundation`, then `/opsx:archive` when done.
4. Repeat phases 2–8 in order; parallelize phases 6–7 after phase 5.
5. Reference requirement IDs in commits, tests, and PR descriptions.

**First change to start:** `app-foundation` — everything else hangs off the shell and shared UI conventions.
