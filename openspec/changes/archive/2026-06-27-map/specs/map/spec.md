# Map Spec

## Purpose

Provides an interactive OpenStreetMap-tiled map that lets users set the active location by clicking anywhere on the map. The map is bounded to the current active location, shows a marker with a city-name popup, reverse-geocodes click coordinates via a server route handler, and updates the shared active-location URL state to trigger a forecast re-fetch. The component loads client-only to avoid SSR conflicts with Leaflet DOM globals.

---

## ADDED Requirements

### Requirement: OSM-tiled interactive map bounded to active location

The system SHALL render a Leaflet/react-leaflet map with OSM raster tiles that is centered on and bounded to the active location coordinates whenever a location is set. The map SHALL NOT render until a location is active.

#### Scenario: Active location is set

- **WHEN** the URL contains valid `?lat=` and `?lon=` params
- **THEN** the map renders, centered on those coordinates at an appropriate zoom level

#### Scenario: No active location

- **WHEN** no location is set (app is in empty/hero state)
- **THEN** the map component is not rendered (or renders a placeholder instructing the user to search first)

---

### Requirement: Location marker with city-name popup

The system SHALL render a marker at the active location's coordinates. Clicking the marker SHALL open a Leaflet popup showing the active city name.

#### Scenario: Marker visible on load

- **WHEN** the map renders with an active location
- **THEN** a marker is visible at the active location's coordinates

#### Scenario: Popup on marker click

- **WHEN** the user clicks the marker
- **THEN** a popup opens displaying the active city name

---

### Requirement: Map click sets active location via reverse-geocoding

Clicking anywhere on the map (outside the marker) SHALL:

1. Call the internal `/api/reverse-geocode?lat=<lat>&lon=<lon>` Route Handler.
2. Receive the nearest city name, latitude, and longitude.
3. Update the URL to `?lat=<lat>&lon=<lon>&name=<name>` via client-side navigation, triggering a forecast re-fetch.

No reverse-geocoding request SHALL be made directly to Open-Meteo from the client.

#### Scenario: User clicks on the map

- **WHEN** the user clicks on a map tile (not the marker)
- **THEN** the system calls `/api/reverse-geocode?lat=<lat>&lon=<lon>`, receives a city result, updates the URL to `?lat=…&lon=…&name=…`, and the forecast re-fetches for the new location

#### Scenario: Reverse-geocode returns no result

- **WHEN** the reverse-geocode call returns an empty or error response
- **THEN** the active location is unchanged and an unobtrusive error indicator is shown (no full-page error)

---

### Requirement: OSM attribution displayed on the map

The map SHALL display the text "© OpenStreetMap contributors" at the bottom-right corner of the map, linked to the OSM copyright page, as required by the OpenStreetMap Tile Usage Policy (TC-MAP-01).

#### Scenario: Attribution always visible

- **WHEN** the map is rendered
- **THEN** "© OpenStreetMap contributors" is visible and linked at the bottom-right of the map tile area, regardless of zoom level or pan position

---

### Requirement: Client-only loading with SSR skeleton

The map component SHALL be imported via `next/dynamic` with `{ ssr: false }`. While the Leaflet bundle is loading, a skeleton placeholder with the same visual footprint (height and width) as the map SHALL be rendered.

#### Scenario: Map chunk loading

- **WHEN** the page first loads and the Leaflet bundle has not yet been fetched
- **THEN** a skeleton div with identical dimensions is shown in place of the map, preventing layout shift

#### Scenario: Map chunk loaded

- **WHEN** the Leaflet bundle finishes loading and hydration completes
- **THEN** the skeleton is replaced by the interactive map with no layout shift

#### Scenario: Reduced motion preference

- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** the skeleton placeholder renders as a static surface with no pulse animation

---

### Requirement: Reverse-geocode Route Handler

The system SHALL expose a GET Route Handler at `/api/reverse-geocode` that accepts `lat` and `lon` query parameters and returns the nearest city name, latitude, and longitude by proxying to the Open-Meteo geocoding API. The handler SHALL run server-side only; the Open-Meteo URL SHALL NOT appear in the client bundle.

#### Scenario: Valid coordinates supplied

- **WHEN** a GET request is made to `/api/reverse-geocode?lat=<lat>&lon=<lon>` with valid numeric coordinates
- **THEN** the handler returns `{ name: string, lat: number, lon: number }` with HTTP 200

#### Scenario: Missing or invalid coordinates

- **WHEN** `lat` or `lon` are missing, non-numeric, or out of range
- **THEN** the handler returns HTTP 400 with a descriptive error message; no upstream request is made
