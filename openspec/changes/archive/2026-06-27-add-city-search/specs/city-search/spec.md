# City Search — Implementation Delta

## ADDED Requirements

### Requirement: Debounced city suggestions

The system SHALL let the user type a free-form city name into one search input
and fetch debounced suggestions from the Open-Meteo geocoding API
(`FR-SEARCH-01`, `BC-PRIVACY-02`).

#### Scenario: Suggestions are requested only for useful queries

- **GIVEN** the visitor types a query shorter than 2 characters
- **WHEN** the debounce interval completes
- **THEN** no geocoding request is sent
- **AND** the suggestion list remains empty

#### Scenario: Debounced search uses Open-Meteo geocoding

- **GIVEN** the visitor types at least 2 characters
- **WHEN** the debounce interval completes
- **THEN** the client requests `https://geocoding-api.open-meteo.com/v1/search`
- **AND** the request includes `name`, `count`, `language`, and `format=json`

### Requirement: Suggestion display

The system SHALL show each suggestion with city name, administrative region,
country, and optional country flag emoji (`FR-SEARCH-02`).

#### Scenario: Suggestion label includes location context

- **GIVEN** Open-Meteo returns a city with `name`, `admin1`, `country`, and
  `country_code`
- **WHEN** the suggestion is rendered
- **THEN** the visible label includes the city name
- **AND** it includes the region and country when present
- **AND** it may include a flag derived from the country code

### Requirement: Active location and URL sync

The system SHALL set the active location when a suggestion is selected and
reflect it in the URL as `?lat=&lon=&name=` (`FR-SEARCH-03`).

#### Scenario: Selecting a suggestion updates location state

- **GIVEN** the visitor selects a suggestion
- **WHEN** selection completes
- **THEN** the active location includes name, latitude, longitude, country code,
  and timezone when available
- **AND** the URL search params include `lat`, `lon`, and `name`

### Requirement: Enter auto-select

The system SHALL auto-select the single visible suggestion when Enter is pressed
(`FR-SEARCH-04`).

#### Scenario: Enter selects only unambiguous suggestion

- **GIVEN** exactly one suggestion is visible
- **WHEN** the visitor presses Enter in the city input
- **THEN** that suggestion becomes the active location

#### Scenario: Enter does not select ambiguous suggestions

- **GIVEN** more than one suggestion is visible
- **WHEN** the visitor presses Enter in the city input
- **THEN** no suggestion is auto-selected

### Requirement: Zero-results inline message

The system SHALL show an inline "Nothing found" message when the geocoding API
returns zero results, without using an error toast (`FR-SEARCH-05`).

#### Scenario: Empty results render inline feedback

- **GIVEN** the geocoding API responds successfully with no `results`
- **WHEN** the debounce request resolves
- **THEN** an inline muted empty-results message is shown below the input
- **AND** no toast, modal, or full-page error appears
