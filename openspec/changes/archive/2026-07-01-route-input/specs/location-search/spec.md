## ADDED Requirements

### Requirement: Debounced location search

The application SHALL provide Start and End location input fields that query an open geocoding API after the visitor stops typing. Search requests MUST be debounced and MUST NOT fire on every keystroke.

#### Scenario: Debounced query on input

- **WHEN** the visitor types in the Start or End field
- **THEN** the application waits for a debounce interval before sending a geocoding request
- **THEN** no geocoding request is sent until the query meets a minimum length threshold

#### Scenario: No geocoding on page load

- **WHEN** the visitor loads the application without interacting with location fields
- **THEN** no geocoding API request is made automatically

### Requirement: Autocomplete suggestion content

Each autocomplete suggestion MUST display the location name, administrative region, and country label derived from geocoding results.

#### Scenario: Suggestion row layout

- **WHEN** geocoding returns matching places
- **THEN** each suggestion row shows the place name as primary text
- **THEN** each suggestion row shows region and country as secondary text

#### Scenario: Selection commits a place

- **WHEN** the visitor selects a suggestion via click or keyboard
- **THEN** the input field displays the selected place name
- **THEN** the application stores the place coordinates and metadata for URL encoding

### Requirement: Geocoding API constraints

Location search MUST use a CORS-safe public geocoding endpoint accessible from the browser without an API key.

#### Scenario: Browser-side fetch

- **WHEN** a debounced search executes
- **THEN** the request is made directly from the client runtime
- **THEN** no server-side proxy or API key is required

### Requirement: Accessible location combobox

Location fields MUST be keyboard navigable with visible focus indicators and appropriate ARIA roles for the combobox and suggestion list.

#### Scenario: Keyboard navigation

- **WHEN** suggestions are visible
- **THEN** the visitor can move through suggestions with arrow keys and confirm with Enter
- **THEN** Escape closes the suggestion list

#### Scenario: Focus visibility

- **WHEN** a location field receives keyboard focus
- **THEN** a visible focus ring is displayed per the design system
