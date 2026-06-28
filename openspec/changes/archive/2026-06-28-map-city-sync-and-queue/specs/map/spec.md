## MODIFIED Requirements

### Requirement: OSM-tiled interactive map bounded to active location

The system SHALL render a Leaflet/react-leaflet map with OSM raster tiles. The map SHALL pan and zoom to the active location coordinates **whenever the active location changes** — not only on initial mount. The map SHALL NOT render until a location is active.

#### Scenario: Active location is set on initial load

- **WHEN** the URL contains valid `?lat=` and `?lon=` params on first render
- **THEN** the map renders, centered on those coordinates at an appropriate zoom level

#### Scenario: No active location

- **WHEN** no location is set (app is in empty/hero state)
- **THEN** the map component is not rendered (or renders a placeholder instructing the user to search first)

#### Scenario: Active location changes after mount

- **WHEN** the active location changes (via chip click, search selection, or map click) while the map is already mounted
- **THEN** the map viewport pans and zooms to the new coordinates without a full remount

#### Scenario: Reduced motion preference

- **WHEN** the user has `prefers-reduced-motion: reduce` set and the active location changes
- **THEN** the map viewport jumps instantly to the new coordinates (no animated pan/zoom)

#### Scenario: Motion allowed

- **WHEN** `prefers-reduced-motion` is not set and the active location changes
- **THEN** the map smoothly animates (flyTo) to the new coordinates

---

### Requirement: Map click sets active location and pins the resolved city

Clicking anywhere on the map (outside the marker) SHALL:

1. Call the internal `/api/reverse-geocode?lat=<lat>&lon=<lon>` Route Handler.
2. Receive the nearest city name, latitude, and longitude.
3. Update the URL to `?lat=<lat>&lon=<lon>&name=<name>` via client-side navigation, triggering a forecast re-fetch.
4. **Pin the resolved city** using the queue eviction rule (see `weekend-compare` spec).

No reverse-geocoding request SHALL be made directly to Open-Meteo from the client.

#### Scenario: User clicks on the map

- **WHEN** the user clicks on a map tile (not the marker)
- **THEN** the system calls `/api/reverse-geocode?lat=<lat>&lon=<lon>`, receives a city result, updates the URL to `?lat=…&lon=…&name=…`, and the resolved city is added to the pinned list (with queue eviction if at capacity)

#### Scenario: Map click when pinned list is full

- **WHEN** the user clicks the map and 5 cities are already pinned
- **THEN** the oldest pinned city is evicted and the newly resolved city is appended; the active location updates to the new city

#### Scenario: Reverse-geocode returns no result

- **WHEN** the reverse-geocode call returns an empty or error response
- **THEN** the active location is unchanged, the pinned list is unchanged, and an unobtrusive error indicator is shown (no full-page error)

## ADDED Requirements

### Requirement: Map viewport syncer child component

The system SHALL include a child component inside `MapContainer` (e.g. `MapViewSyncer`) that imperative-controls the Leaflet map instance via `useMap()`. This component SHALL call `map.flyTo()` (motion allowed) or `map.setView()` (reduced motion) in a `useEffect` keyed on `lat` and `lon` props, ensuring the viewport reflects every active-location change without remounting the map.

#### Scenario: MapViewSyncer receives new coordinates

- **WHEN** `MapViewSyncer` receives updated `lat` / `lon` props
- **THEN** it calls the appropriate Leaflet method to update the viewport so the marker for the new location is visible at the center

#### Scenario: MapViewSyncer on initial render

- **WHEN** `MapViewSyncer` mounts for the first time
- **THEN** no duplicate pan is triggered (the `MapContainer center` prop already positions the map on mount)
