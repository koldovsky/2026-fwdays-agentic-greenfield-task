# PRD — MotoRoute Agent / AI Motorcycle Trip Planner

Last updated: 2026-07-04

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, tests,
PRs, and recordings reference these IDs to keep traceability intact.

Refer to [docs/product-brief.md](product-brief.md) for narrative context.

## ID conventions

| Prefix   | Meaning                  | Example                                   |
| -------- | ------------------------ | ----------------------------------------- |
| `FR-*`   | Functional Requirement   | `FR-SEARCH-01` — location autocomplete    |
| `NFR-*`  | Non-Functional Requirement | `NFR-PERF-01` — client rendering latency  |
| `TC-*`   | Technical Constraint     | `TC-STACK-01` — Next.js App Router        |
| `BC-*`   | Business / UX Constraint | `BC-PRIVACY-01` — zero tracker policy     |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

## Functional requirements

### Shell & navigation

| ID          | Description                                                                                           | Status     |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| FR-SHELL-01 | Single-page application layout containing a top bar (logo, theme toggle) and a main content area      | shipped    |
| FR-SHELL-02 | Fully responsive layout adapting at 768 px and 1280 px breakpoints                                    | shipped    |
| FR-SHELL-03 | Empty state behavior: prominent configuration panel centered on screen on initial execution           | shipped    |

### Top clock (capability `top-clock`)

| ID          | Description                                                                                           | Status     |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| FR-CLOCK-01 | Header displays a live local-time clock updating every second without blocking core UI rendering      | shipped    |

### Route Input & Search (capability `route-input`)

| ID          | Description                                                                                           | Status     |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| FR-SEARCH-01| Debounced input fields for 'Start' and 'End' locations, querying an open geocoding API                | shipped    |
| FR-SEARCH-02| Autocomplete choices present location name, administrative region, and country labels                | shipped    |
| FR-SEARCH-03| Active route state maps directly to URL query string as `?start=&end=&rest=&day=` for shareability     | shipped    |
| FR-INPUT-01 | Numeric input fields forcing strict validations for resting interval (km) and maximum daily limit (km) | shipped    |

### Map visualization (capability `map-rendering`)

| ID          | Description                                                                                           | Status     |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| FR-MAP-01   | Renders an OpenStreetMap-tiled interactive canvas bounded tightly to the active generated itinerary   | shipped    |
| FR-MAP-02   | Marks rest stops, overnight points, and terminal stations with distinctive color-coded UI indicators  | shipped    |
| FR-MAP-03   | Map is client-only (`dynamic({ ssr: false })`) falling back to a structured placeholder skeleton    | shipped    |
| FR-MAP-04   | Display "© OpenStreetMap contributors" attribution at the bottom-right; required by OSM Tile Policy   | shipped    |

### Route Breakdown (capability `route-details`)

| ID          | Description                                                                                           | Status     |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| FR-VIEW-01  | Renders a nested chronological sidebar breaking down the total travel duration, distance, and days   | shipped    |
| FR-VIEW-02  | Groups segments by active traveling day, detailing metrics computed deterministically inside client  | shipped    |

## Non-functional requirements

| ID            | Description                                                                                                            | Status     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| NFR-PERF-01   | Production build achieves Lighthouse Performance metric score ≥ 90 on mobile and desktop targets                      | shipped    |
| NFR-PERF-02   | Client routing computation and UI update must complete in under 50 ms upon receiving external map dataset             | shipped    |
| NFR-A11Y-01   | Form input elements must be fully navigable via keyboard, supporting visible focus indicators                         | shipped    |
| NFR-COST-01   | Zero premium or key-restricted external API dependencies for production deployment                                     | shipped    |
| NFR-OBS-01    | Production application console must remain entirely silent during a normal operational workflow execution              | shipped    |
| NFR-I18N-01   | Direct encapsulation of UI dictionary elements inside local translation trees without runtime middleware dependencies | shipped    |
| NFR-DX-01     | `npm run lint && tsc --noEmit && npm test && npm run build` finish in < 60 s on a clean checkout                       | shipped    |

## Technical constraints

| ID            | Description                                                                                                                            | Status     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-STACK-01   | Implementation on Next.js 16 (App Router), React 19, and strict mode TypeScript architectures                                         | accepted   |
| TC-STACK-02   | Tailwind CSS 4 (PostCSS plugin); shadcn/ui base components; class-variance-authority                                                   | accepted   |
| TC-STACK-03   | OpenStreetMap raster tiles paired with Leaflet (`react-leaflet`) for interactive route mapping                                         | accepted   |
| TC-STACK-04   | Open geocoding and OSRM (Open Source Routing Machine) public endpoints for telemetry calculations; no API keys required                | accepted   |
| TC-PURE-01    | Pure function boundaries established inside `lib/` modules for all path segmentation calculations, isolating logic from DOM globals    | shipped    |
| TC-DATA-01    | All downstream geocoding/routing queries happen through native CORS-compliant endpoints directly available in browser runtimes         | shipped    |
| TC-TEST-01    | Verification of pure computational modules relies completely on Vitest infrastructure engines                                         | shipped    |

## Business / UX constraints

| ID             | Description                                                                                                          | Status     |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | ---------- |
| BC-PRIVACY-01  | Rejection of analytical tooling trackers, tracking hooks, or browser fingerprinting technologies                      | shipped    |
| BC-PRIVACY-02  | Absolute prohibition of persistent device cookies or client profile tracking records inside the application runtime  | shipped    |
| BC-BRAND-01    | Visual identity follows DESIGN.md. UI is Ukrainian-first; tone is calm, practical, with no exclamation marks          | shipped    |
| BC-BRAND-02    | Footer credits OpenStreetMap and underlying open routing providers with clear external hyperlinks                    | shipped    |
| BC-DEMO-01     | Codebase and deployment are entirely open source, mapping 100% of labeled specifications to testable verification loops| shipped    |

## Out of scope (MVP)

- Direct file generation or binary downloads of standard `.gpx` or `.kml` tracking assets.
- Live integration with premium commercial APIs for weather analysis, hotel check-ins, or road quality checking.
- State persistence architectures across distinct sessions (no database records or caching layer cross-sessions).
- Multi-destination cross-routing configurations (only straight sequential processing between a single start and end coordinates pair).
- Background server workers, push notifications, or backend synchronization pipelines.