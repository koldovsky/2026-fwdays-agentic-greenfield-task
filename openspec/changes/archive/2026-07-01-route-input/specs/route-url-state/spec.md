## ADDED Requirements

### Requirement: URL query parameter sync

Active route configuration MUST be reflected in the URL query string using the parameters `start`, `end`, `rest`, and `day` so the visitor can share the current configuration.

#### Scenario: Location parameters encoded

- **WHEN** the visitor selects Start and End locations
- **THEN** the URL includes `start` and `end` query parameters encoding coordinates and a human-readable label

#### Scenario: Constraint parameters encoded

- **WHEN** the visitor sets valid rest interval and daily limit values
- **THEN** the URL includes `rest` and `day` query parameters with integer kilometer values

#### Scenario: URL updates on change

- **WHEN** the visitor changes a committed configuration value
- **THEN** the browser URL updates without a full page reload
- **THEN** navigation scroll position is preserved

### Requirement: State restoration from URL

The application MUST parse URL query parameters on load and restore the configuration form to the encoded state.

#### Scenario: Reload restores configuration

- **WHEN** the visitor loads or reloads the page with valid `start`, `end`, `rest`, and `day` parameters
- **THEN** the form fields display the corresponding locations and numeric constraints

#### Scenario: Partial URL parameters

- **WHEN** the URL contains only a subset of valid parameters
- **THEN** the application restores the present values and leaves missing fields at defaults or empty

#### Scenario: Invalid URL parameters ignored

- **WHEN** the URL contains malformed parameter values
- **THEN** the application ignores invalid segments without breaking the layout
- **THEN** no error is logged to the console during normal operation
