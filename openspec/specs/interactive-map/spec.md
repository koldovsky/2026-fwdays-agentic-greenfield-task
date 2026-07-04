# interactive-map Specification

## Purpose
Client-only interactive Leaflet map showing the active itinerary route, stop markers, and OSM attribution. Implements FR-MAP-01, FR-MAP-02, FR-MAP-03, FR-MAP-04, and TC-STACK-03.
## Requirements
### Requirement: Client-only map rendering

The map SHALL load only on the client using a dynamic import with server-side rendering disabled, and MUST display a structured placeholder skeleton until the map is ready.

#### Scenario: SSR and initial HTML

- **WHEN** the page is server-rendered before hydration
- **THEN** the map region shows a structured skeleton placeholder instead of an interactive map canvas
- **THEN** no Leaflet runtime executes during SSR

#### Scenario: Hydrated interactive map

- **WHEN** the client bundle loads and a successful itinerary is available
- **THEN** the interactive map replaces the skeleton
- **THEN** the visitor can pan and zoom the map

### Requirement: Route polyline display

The map SHALL render the active itinerary route polyline and fit the viewport bounds tightly to that geometry.

#### Scenario: Polyline visible after planning

- **WHEN** route planning completes successfully
- **THEN** the map draws the itinerary polyline
- **THEN** the map viewport fits the route with reasonable padding

#### Scenario: No polyline without itinerary

- **WHEN** no successful itinerary is available
- **THEN** the interactive map is not shown

### Requirement: Stop markers

The map SHALL display distinctive markers for start, end, rest, and overnight stops from the itinerary stop list.

#### Scenario: Marker kinds distinguishable

- **WHEN** the itinerary includes stops of multiple kinds
- **THEN** each stop kind uses a distinct color and shape consistent with DESIGN.md
- **THEN** all itinerary stops appear on the map at their coordinate locations

### Requirement: OpenStreetMap tiles and attribution

The map SHALL use OpenStreetMap raster tiles and display required attribution on the map canvas.

#### Scenario: Tile layer

- **WHEN** the interactive map renders
- **THEN** it loads tiles from an OpenStreetMap tile service
- **THEN** no API key is required

#### Scenario: Visible attribution

- **WHEN** the map is visible
- **THEN** the text "© OpenStreetMap contributors" appears at the bottom-right of the map region

