## MODIFIED Requirements

### Requirement: Empty state on initial load

On initial execution with no active route, the application SHALL display a prominently centered configuration panel in the main content area. The panel MUST contain route input fields for Start, End, rest interval, and daily distance limit. The application MUST NOT show a default route, map, or pre-filled itinerary beyond values restored from URL query parameters.

#### Scenario: First visit empty state

- **WHEN** the visitor loads the application without query parameters or computed route data
- **THEN** a configuration panel is centered on screen with a heading indicating route planning intent
- **THEN** the panel includes Start, End, rest interval, and daily limit input fields
- **THEN** no map or route sidebar is visible

#### Scenario: No default route

- **WHEN** the application initializes
- **THEN** no route geometry, markers, or itinerary data are rendered

#### Scenario: Submit triggers route planning

- **WHEN** the visitor activates the route planning submit control with valid inputs
- **THEN** the form validates all inputs and syncs the URL
- **THEN** the application fetches OSRM geometry and computes a segmented itinerary

#### Scenario: Results state with map

- **WHEN** route planning completes successfully
- **THEN** the main area transitions to a results layout that includes an interactive map of the itinerary
- **THEN** the configuration panel remains available for replanning
- **THEN** the map uses responsive sizing per shell breakpoints

## ADDED Requirements

### Requirement: Results layout map region

When an itinerary is available, the application SHALL allocate primary main content space to the interactive map region according to responsive shell breakpoints.

#### Scenario: Mobile map stacking

- **WHEN** the viewport width is below 768 px and an itinerary is present
- **THEN** the map region spans the content width below the configuration panel
- **THEN** the map maintains a usable minimum height

#### Scenario: Desktop map sizing

- **WHEN** the viewport width is at least 768 px and an itinerary is present
- **THEN** the map region expands to fill remaining horizontal space in the results layout
