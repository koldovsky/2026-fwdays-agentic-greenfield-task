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
- **THEN** a minimal planning summary may appear below the form
- **THEN** no interactive map or full itinerary sidebar is shown in this phase

#### Scenario: Planned route without map

- **WHEN** route planning completes successfully
- **THEN** the main area remains the centered configuration layout without a map canvas
- **THEN** the visitor can submit again to replan with updated constraints
