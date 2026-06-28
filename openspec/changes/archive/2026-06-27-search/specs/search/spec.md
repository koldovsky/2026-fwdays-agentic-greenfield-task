## ADDED Requirements

### Requirement: Name search input filters the Pokémon list
The app SHALL display a search input above the Pokémon grid on `/pokemon`. As the user types, the list SHALL filter in real time to show only Pokémon whose names contain the search term (case-insensitive). The filter SHALL be applied after a 300 ms debounce.

#### Scenario: Typing narrows the list
- **WHEN** the user types a partial Pokémon name into the search input
- **THEN** only Pokémon whose names contain the typed string (case-insensitive) are displayed after the debounce period

#### Scenario: No results shows empty state
- **WHEN** the user types a string that matches no Pokémon name in the current page
- **THEN** the empty state is shown with a message indicating no Pokémon match the search

#### Scenario: Clearing the input restores the full list
- **WHEN** the user clears the search input (backspace or the clear button)
- **THEN** all 20 Pokémon are shown and the `?search=` param is removed from the URL

### Requirement: Active search term is persisted in the URL
The active search term SHALL be reflected in the URL as `?search=<term>`. A URL containing `?search=<term>` SHALL pre-populate the search input and render the filtered list on page load.

#### Scenario: URL updates as user types
- **WHEN** the user types into the search input
- **THEN** the URL is updated to `?search=<term>` after the debounce period

#### Scenario: Shareable URL pre-filters the list
- **WHEN** a visitor loads `/pokemon?search=bulba`
- **THEN** the search input is pre-populated with "bulba" and only matching Pokémon are shown

#### Scenario: Empty search removes the param
- **WHEN** the search input is empty
- **THEN** the URL does not contain a `?search=` parameter
