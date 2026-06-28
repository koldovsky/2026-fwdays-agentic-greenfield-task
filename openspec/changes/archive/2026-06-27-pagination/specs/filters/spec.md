## MODIFIED Requirements

### Requirement: All active filters are reflected in URL params
All active filter values SHALL be reflected in URL query parameters: `?type=<comma-separated-types>`, `?gen=<number>`, `?legendary=1`. A URL containing these params SHALL pre-populate the filter controls and render the filtered list on page load. The resulting URL SHALL be shareable and bookmarkable. Whenever a filter value changes, the `?page=` param SHALL be reset to 1 in the same URL push.

#### Scenario: Type filter updates URL
- **WHEN** the user selects "fire" from the type filter
- **THEN** the URL contains `?type=fire`

#### Scenario: Multiple filters in URL
- **WHEN** the user selects "fire", "Gen 1", and activates the legendary toggle
- **THEN** the URL contains `?type=fire&gen=1&legendary=1`

#### Scenario: Shareable URL pre-filters the list
- **WHEN** a visitor loads `/pokemon?type=fire&gen=1`
- **THEN** the type filter shows "fire" selected, "Gen 1" is selected in the generation filter, and the list shows only matching Pokémon

#### Scenario: Filter change resets page to 1
- **WHEN** the user changes any filter while on page 3
- **THEN** the URL is updated with the new filter value and `page=1` (or no `?page=` param), and the first page of filtered results is shown
