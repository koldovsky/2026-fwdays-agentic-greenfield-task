## MODIFIED Requirements

### Requirement: List page displays a paginated grid of Pokémon cards
The app SHALL render a route at `/pokemon` that displays Pokémon cards in a responsive grid, 20 cards per page. The page slice SHALL be determined by the `?page=` URL param (1-based); when absent or invalid, page 1 SHALL be shown. The total page count SHALL be computed as `Math.ceil(filteredCount / 20)` after applying all active search and filter constraints.

#### Scenario: Grid renders on first load
- **WHEN** a visitor navigates to `/pokemon`
- **THEN** a grid of 20 Pokémon cards is visible (the first 20 from the full index)

#### Scenario: Root redirects to list
- **WHEN** a visitor navigates to `/`
- **THEN** the browser is redirected to `/pokemon`

#### Scenario: Page 2 shows the next 20 Pokémon
- **WHEN** a visitor navigates to `/pokemon?page=2`
- **THEN** Pokémon 21–40 from the (filtered) index are displayed

#### Scenario: Out-of-range page redirects to the last valid page
- **WHEN** `?page=` exceeds the total page count for the current filter state
- **THEN** the server redirects to `?page=<totalPages>` and renders that page
