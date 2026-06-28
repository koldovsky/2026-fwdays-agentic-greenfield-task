## MODIFIED Requirements

### Requirement: Active search term is persisted in the URL
The active search term SHALL be reflected in the URL as `?search=<term>`. A URL containing `?search=<term>` SHALL pre-populate the search input and render the filtered list on page load. When the search term changes, the `?page=` param SHALL be reset to 1 in the same URL push so the visitor always lands on the first page of new results.

#### Scenario: URL updates as user types
- **WHEN** the user types into the search input
- **THEN** the URL is updated to `?search=<term>` after the debounce period

#### Scenario: Shareable URL pre-filters the list
- **WHEN** a visitor loads `/pokemon?search=bulba`
- **THEN** the search input is pre-populated with "bulba" and only matching Pokémon are shown

#### Scenario: Empty search removes the param
- **WHEN** the search input is empty
- **THEN** the URL does not contain a `?search=` parameter

#### Scenario: Search change resets page to 1
- **WHEN** the user types a new search term while on page 3
- **THEN** the URL is updated with `?search=<term>` and `page=1` (or no `?page=` param), and the first page of matching results is shown
