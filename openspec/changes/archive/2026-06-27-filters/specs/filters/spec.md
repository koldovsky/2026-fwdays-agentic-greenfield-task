## ADDED Requirements

### Requirement: Type multi-select filters the Pokémon list
The app SHALL display a multi-select type filter showing all 18 Pokémon types. When one or more types are selected, the list SHALL show only Pokémon that have at least one of the selected types (OR semantics). When no type is selected, all types are shown.

#### Scenario: Single type selected
- **WHEN** the user selects "fire" from the type filter
- **THEN** only Pokémon with the "fire" type are shown in the list

#### Scenario: Multiple types selected (OR semantics)
- **WHEN** the user selects "fire" and "water"
- **THEN** Pokémon that are fire-type OR water-type are shown (including dual-type Pokémon with either type)

#### Scenario: No types selected shows all
- **WHEN** no type filter is active
- **THEN** the type filter does not restrict the list

### Requirement: Generation single-select filters the Pokémon list
The app SHALL display a single-select generation filter for Gen 1–9. When a generation is selected, the list SHALL show only Pokémon introduced in that generation. The default state (no generation selected) shows all generations.

#### Scenario: Generation selected
- **WHEN** the user selects "Gen 1"
- **THEN** only the 151 Pokémon introduced in Generation 1 are shown

#### Scenario: Generation cleared shows all
- **WHEN** the user clears the generation filter
- **THEN** all generations are shown

### Requirement: Legendary / Mythical toggle filters the Pokémon list
The app SHALL display a toggle that, when active, restricts the list to only Pokémon that are legendary or mythical. When inactive, all Pokémon (legendary and non-legendary) are shown.

#### Scenario: Toggle activated
- **WHEN** the user activates the legendary/mythical toggle
- **THEN** only legendary or mythical Pokémon are shown in the list

#### Scenario: Toggle deactivated shows all
- **WHEN** the legendary/mythical toggle is inactive
- **THEN** the toggle does not restrict the list

### Requirement: All active filters are reflected in URL params
All active filter values SHALL be reflected in URL query parameters: `?type=<comma-separated-types>`, `?gen=<number>`, `?legendary=1`. A URL containing these params SHALL pre-populate the filter controls and render the filtered list on page load. The resulting URL SHALL be shareable and bookmarkable.

#### Scenario: Type filter updates URL
- **WHEN** the user selects "fire"
- **THEN** the URL contains `?type=fire`

#### Scenario: Multiple filters in URL
- **WHEN** the user selects "fire", "Gen 1", and activates the legendary toggle
- **THEN** the URL contains `?type=fire&gen=1&legendary=1`

#### Scenario: Shareable URL pre-filters the list
- **WHEN** a visitor loads `/pokemon?type=fire&gen=1`
- **THEN** the type filter shows "fire" selected, "Gen 1" is selected in the generation filter, and the list shows only matching Pokémon

### Requirement: Clear filters resets all active filters
The app SHALL provide a "Clear filters" control that removes all active filters (search, type, generation, legendary) and resets the page to 1. The control SHALL be visible only when at least one filter or search is active.

#### Scenario: Clear filters removes all params
- **WHEN** the user clicks "Clear filters" with `?type=fire&gen=1&search=char` active
- **THEN** all URL params are removed, the filter controls reset to their default state, and the full unfiltered list is shown

#### Scenario: Clear filters resets to page 1
- **WHEN** the user is on page 3 with active filters and clicks "Clear filters"
- **THEN** the page resets to 1 and the URL contains no filter or page params

#### Scenario: Clear filters hidden when no filters active
- **WHEN** no search term, type, generation, or legendary filter is active
- **THEN** the "Clear filters" control is not visible
