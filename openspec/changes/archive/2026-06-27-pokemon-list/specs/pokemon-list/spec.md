## ADDED Requirements

### Requirement: List page displays a paginated grid of Pokémon cards
The app SHALL render a route at `/pokemon` that displays Pokémon cards in a responsive grid, 20 cards per page.

#### Scenario: Grid renders on first load
- **WHEN** a visitor navigates to `/pokemon`
- **THEN** a grid of 20 Pokémon cards is visible

#### Scenario: Root redirects to list
- **WHEN** a visitor navigates to `/`
- **THEN** the browser is redirected to `/pokemon`

### Requirement: Each card shows sprite, dex number, name, and type badges
Each Pokémon card SHALL display the official artwork sprite, the zero-padded dex number (e.g. `#0025`), the Pokémon name, and one or more type badges.

#### Scenario: Card content is complete
- **WHEN** a Pokémon card is rendered
- **THEN** it shows the official artwork image, the dex number formatted as `#NNNN`, the Pokémon name, and at least one type badge

#### Scenario: Dex number is zero-padded
- **WHEN** a Pokémon with id 1 is rendered
- **THEN** the dex number reads `#0001`

### Requirement: Clicking a card navigates to the detail page
Each Pokémon card SHALL be a navigable link to `/pokemon/[id]`.

#### Scenario: Card click navigates to detail
- **WHEN** a visitor clicks a Pokémon card
- **THEN** the browser navigates to `/pokemon/[id]` where `[id]` is the Pokémon's numeric dex id

### Requirement: Empty state is shown when no Pokémon are available
When the list has no items to display, the page SHALL render an empty state with a descriptive message instead of an empty grid.

#### Scenario: Empty state renders on zero results
- **WHEN** the fetched Pokémon list is empty
- **THEN** the `EmptyState` component is shown with a title and description

### Requirement: Data is fetched server-side only
All PokéAPI requests SHALL be made in Server Components or Route Handlers. PokéAPI URLs SHALL NOT appear in the client-side JavaScript bundle.

#### Scenario: No client-side fetch
- **WHEN** the list page is rendered
- **THEN** no `fetch` calls to `pokeapi.co` are present in client-executed JavaScript

### Requirement: Grid is responsive across breakpoints
The Pokémon grid SHALL display 1 column below 768 px, 2 columns from 768–1023 px, 3 columns from 1024–1279 px, and 4 columns at 1280 px and above.

#### Scenario: Single column on mobile
- **WHEN** viewport width is below 768 px
- **THEN** the grid renders one card per row

#### Scenario: Four columns on wide desktop
- **WHEN** viewport width is 1280 px or wider
- **THEN** the grid renders four cards per row
