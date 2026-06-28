## MODIFIED Requirements

### Requirement: Location selection sets active location and URL

Selecting a suggestion (via click or keyboard) SHALL set the active location and update the URL to `?lat=<latitude>&lon=<longitude>&name=<city name>` using client-side navigation. No full page reload SHALL occur. After selection, the search input SHALL be cleared to an empty string and the suggestion list SHALL be hidden. The search interaction is a discrete zero-to-zero flow: the input starts empty, the user searches and selects, and the input returns to empty — both on the hero/home page and on the weather-info page.

#### Scenario: User clicks a suggestion

- **WHEN** the user clicks on a suggestion row
- **THEN** the URL is updated to `?lat=…&lon=…&name=…` reflecting the selected city
- **AND** the suggestion list is dismissed
- **AND** the search input value is cleared to an empty string

#### Scenario: User confirms single suggestion with Enter

- **WHEN** the user presses Enter and a single suggestion is visible
- **THEN** that suggestion is selected, the URL is updated, the suggestion list is dismissed, and the search input is cleared

#### Scenario: URL reflects selection

- **WHEN** a city is selected
- **THEN** the browser address bar shows `?lat=<lat>&lon=<lon>&name=<name>` and copying the URL reproduces the same selected location on reload

#### Scenario: Input is empty after selection on the hero page

- **WHEN** the user selects a city from the hero/home page search bar
- **THEN** the search input value is empty and the suggestion dropdown is not visible

#### Scenario: Input is empty after selection on the weather-info page

- **WHEN** a city is already active and the user searches for and selects another city
- **THEN** the search input value is empty and the suggestion dropdown is not visible after the new city is selected
