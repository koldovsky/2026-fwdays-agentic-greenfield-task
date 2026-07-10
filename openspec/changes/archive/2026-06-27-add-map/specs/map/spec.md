# Map — Implementation Delta

## ADDED Requirements

### Requirement: Interactive OSM map

The system SHALL render a Leaflet map with OpenStreetMap raster tiles centered on
the active location when one is selected (`FR-MAP-01`).

#### Scenario: Map centers on active location

- **GIVEN** an active city location with latitude and longitude
- **WHEN** the map panel renders on the client
- **THEN** the map shows OSM tiles
- **AND** the viewport is centered on the active coordinates

### Requirement: Location marker and popup

The system SHALL show a marker at the active location with a popup naming the city
(`FR-MAP-02`).

#### Scenario: Marker popup names the city

- **GIVEN** an active city location
- **WHEN** the map renders
- **THEN** a marker is placed at the coordinates
- **AND** the popup shows the city name

### Requirement: Click to set location

The system SHALL update the active location when the visitor clicks the map, using
Open-Meteo reverse geocoding for the clicked coordinates (`FR-MAP-03`).

#### Scenario: Map click reverse-geocodes and refetches forecast

- **GIVEN** the map is interactive
- **WHEN** the visitor clicks a map point
- **THEN** the app requests Open-Meteo reverse geocoding for that latitude and
  longitude
- **AND** the active location updates
- **AND** URL search params sync to the new location
- **AND** the forecast panel refetches for the new location

### Requirement: OSM attribution

The system SHALL display "© OpenStreetMap contributors" attribution at the
bottom-right of the map panel (`FR-MAP-04`).

#### Scenario: Attribution is visible

- **WHEN** the map panel renders on the client
- **THEN** OSM attribution text is visible in the map corner

### Requirement: Client-only rendering

The system SHALL load the interactive map only on the client and show an SSR
skeleton with the same footprint when JavaScript is not ready (`FR-MAP-05`).

#### Scenario: SSR placeholder matches map footprint

- **GIVEN** the page is rendered on the server
- **WHEN** the map panel mounts
- **THEN** a skeleton placeholder occupies the map panel area
- **AND** the interactive map replaces it after client hydration
