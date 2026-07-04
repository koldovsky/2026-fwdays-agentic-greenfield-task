## ADDED Requirements

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

On initial execution with no active route, the application SHALL display a prominently centered configuration panel in the main content area. The application MUST NOT show a default route, map, or pre-filled itinerary.

#### Scenario: First visit empty state

- **WHEN** the visitor loads the application without query parameters or computed route data
- **THEN** a configuration panel is centered on screen with a heading indicating route planning intent
- **THEN** no map or route sidebar is visible

#### Scenario: No default route

- **WHEN** the application initializes
- **THEN** no route geometry, markers, or itinerary data are rendered
