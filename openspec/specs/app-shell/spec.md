# app-shell

## Purpose

Single-page application layout with header, main, and footer zones for MotoRoute.
## Requirements
### Requirement: Single-page application shell

The application SHALL render a single-page layout with three zones: a top header bar, a main content area, and a compact footer. The header MUST contain a logo or wordmark placeholder and a slot for a theme toggle. The main area MUST occupy remaining vertical space between header and footer.

#### Scenario: Visitor loads the home page

- **WHEN** the visitor navigates to the application root URL
- **THEN** the page displays a header, main content area, and footer in a single view without route navigation

#### Scenario: Header structure

- **WHEN** the shell renders
- **THEN** the header displays the "MotoRoute" wordmark on the left and a theme toggle control on the right

### Requirement: Responsive layout breakpoints

The layout SHALL adapt at viewport widths of 768 px and 1280 px. Below 768 px, content MUST use full width with horizontal padding. At 768 px and above, the header items MUST remain on one row. At 1280 px and above, page padding MUST increase per design tokens.

#### Scenario: Mobile viewport

- **WHEN** the viewport width is below 768 px
- **THEN** the main content uses full width with `px-4` padding and remains readable without horizontal scroll

#### Scenario: Tablet viewport

- **WHEN** the viewport width is at least 768 px
- **THEN** header elements align in a single horizontal row

#### Scenario: Desktop viewport

- **WHEN** the viewport width is at least 1280 px
- **THEN** the layout applies wider page padding consistent with design specifications

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

#### Scenario: Results state with sidebar

- **WHEN** route planning completes successfully
- **THEN** the main area includes an itinerary sidebar with total and per-day breakdown
- **THEN** the configuration panel remains available for replanning

### Requirement: Results layout map region

When an itinerary is available, the application SHALL allocate primary main content space to the interactive map region according to responsive shell breakpoints.

#### Scenario: Mobile map stacking

- **WHEN** the viewport width is below 768 px and an itinerary is present
- **THEN** the map region spans the content width below the configuration panel
- **THEN** the map maintains a usable minimum height

#### Scenario: Desktop map sizing

- **WHEN** the viewport width is at least 768 px and an itinerary is present
- **THEN** the map region expands to fill remaining horizontal space in the results layout

### Requirement: Results layout sidebar region

When an itinerary is available, the application SHALL allocate a dedicated sidebar region for itinerary breakdown according to responsive shell breakpoints.

#### Scenario: Mobile sidebar stacking

- **WHEN** the viewport width is below 768 px and an itinerary is present
- **THEN** the sidebar appears below the primary content column at full width

#### Scenario: Desktop sidebar width

- **WHEN** the viewport width is at least 768 px and an itinerary is present
- **THEN** the sidebar renders beside the primary content column at a fixed width between 320 px and 380 px

