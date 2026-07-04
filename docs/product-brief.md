# Product Brief — MotoRoute Agent / AI Motorcycle Trip Planner

> Companion to `docs/requirements.md`. The requirements document is the numbered,

> traceable source of truth; this brief is the business narrative behind it.

> Tone throughout the product is Ukrainian-first, calm and practical, with no

> exclamation marks (BC-BRAND-01).

## What this is

MotoRoute Agent is a keyless, privacy-first, Ukrainian-first client-side web app that automates and optimizes multi-day trip planning for motorcyclists. Unlike standard navigators that calculate the absolute shortest path, this system focuses on rider endurance and comfort. It takes a start and end point, respects user-defined daily mileage limits and resting intervals, and uses deterministic execution loops entirely on the client side to split the journey into optimized daily segments with rest stops. The entire experience runs on free, keyless open services.

## Who it is for

The single actor is an **anonymous motorcycle rider planning a long-distance trip**. There are no user accounts, no sign-in, and no profile persistence. The rider inputs travel parameters and reviews the generated itinerary. Anyone with the live URL has full access to the system. The codebase and live deployment serve as the primary, publicly demonstrable artifacts of modern client-side software engineering practices (BC-DEMO-01).

## The pain it addresses

Planning a long-distance motorcycle tour is tedious. Riders must manually balance daily fatigue limits, map out fuel and rest stops every 150-200 km, and ensure that overnight stays land in areas with adequate infrastructure. Juggling Google Maps, hotel booking platforms, and Excel sheets is slow and fragmented.

This product reduces that friction to a single interactive dashboard. By declaring comfort constraints up front, the rider receives a fully structured, validated, multi-day itinerary instantly, completely computed in-browser without waiting for backend server processing or dealing with network latency.

## End-to-end usage

1. **Land.** On first load, the visitor sees a minimalist interface with a prominently centered route configuration panel (FR-SHELL-03). There is no default route and no automatic geolocation on load (BC-PRIVACY-02). The header features a live local-time clock and a theme toggle (FR-SHELL-01, FR-CLOCK-01).

2. **Configure constraints.** The visitor inputs a starting city and a destination city via debounced autocomplete fields powered by an open API (FR-SEARCH-01/02). They also specify two critical numeric constraints: the desired distance between short rest stops and the maximum total mileage per day (FR-INPUT-01). Selecting locations updates the URL query string as `?start=&end=&rest=&day=`, making the active state instantly shareable (FR-SEARCH-03).

3. **Review the itinerary.** Upon submission, the computational core instantly processes the data. The UI reveals the final results split into two main sections: an interactive map with custom waypoint markers (FR-MAP-01) and a structured sidebar detailing the daily breakdown, total travel times, average speeds, and specific rest locations (FR-VIEW-01/02).

## MVP vs Future boundary

**In the MVP:**

- Responsive shell, live header clock, and deterministic Ukrainian weather/moto footer context.

- Debounced location search using open geocoding APIs.

- Interactive map with client-only rendering and explicit attribution.

- Pure-function route decomposition and segmentation logic in TypeScript.

- Total anonymity with zero tracking, cookies, or server-side persistence.

**Future (deferred):**

- Real-time GPX/KML file export for standalone motorcycle GPS navigators.

- Integration with external hotel and weather APIs to evaluate road quality or real-time lodging availability.

- Persistent user profiles, saved routes, or social sharing mechanics.

- Support for complex multi-destination routing beyond a single start-and-end point sequence.

## Operating principles

- **Privacy-first.** No analytics, no third-party tracking scripts, no browser fingerprinting, and zero application cookies (BC-PRIVACY-01/03).

- **Keyless and free-tier.** Maximizing open-tier infrastructure. All primary map layers use OpenStreetMap, and geocoding leverages keyless open endpoints (NFR-COST-01).

- **Honest under failure.** External call or routing execution failures degrade gracefully to visible, calm warning states instead of breaking the UI layout (NFR-OBS-01).

- **Ukrainian-first and calm.** All interface elements and routing outputs use a practical, non-intrusive Ukrainian tone with no exclamation marks (NFR-I18N-01, BC-BRAND-01).

## Verification

Requirement traceability and manual checklists: [docs/test-plan.md](test-plan.md) (BC-DEMO-01). CI entry point: `npm run check`.