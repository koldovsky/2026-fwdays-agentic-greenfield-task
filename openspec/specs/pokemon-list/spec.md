# Spec: Pokémon List

## Purpose

Defines the requirements for the Pokémon list page (`/pokemon`), including the paginated card grid, card content, navigation, empty state, data-fetching constraints, and responsive layout.

## Requirements

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
When the list has no items to display, the page SHALL render an empty state with a descriptive message instead of an empty grid. When the empty state is caused by an active search term, the message SHALL indicate that no Pokémon match the current search, distinct from a data-load failure message.

#### Scenario: Empty state renders on zero results from failed fetch
- **WHEN** the fetched Pokémon list is empty due to a data-load error
- **THEN** the `EmptyState` component is shown with a title and description indicating a load failure

#### Scenario: Empty state renders on zero search results
- **WHEN** the active search term matches no Pokémon in the fetched list
- **THEN** the `EmptyState` component is shown with a message indicating no Pokémon match the search term

### Requirement: Data is fetched server-side only
The full Pokémon index (id, name, types, generation, legendary/mythical flags) SHALL be generated at build time by a script that calls PokéAPI and writes a static JSON file. At runtime, the list page SHALL import this static JSON directly — no PokéAPI requests SHALL be made during a page render for the index. PokéAPI requests for individual Pokémon detail data SHALL continue to be made in Server Components. PokéAPI URLs SHALL NOT appear in the client-side JavaScript bundle.

#### Scenario: No runtime fetch for index data
- **WHEN** the list page is rendered (any filter or page combination)
- **THEN** no `fetch` calls to `pokeapi.co` are made during the render

#### Scenario: Static index is available on first request
- **WHEN** the server handles its very first request after a cold start
- **THEN** the full Pokémon index is available instantly without any warm-up API call

#### Scenario: Build fails when PokéAPI is unreachable
- **WHEN** `npm run build` is executed and PokéAPI is unreachable
- **THEN** the build script exits with a non-zero code and the build fails with a clear error message

### Requirement: Grid is responsive across breakpoints
The Pokémon grid SHALL display 1 column below 768 px, 2 columns from 768–1023 px, 3 columns from 1024–1279 px, and 4 columns at 1280 px and above.

#### Scenario: Single column on mobile
- **WHEN** viewport width is below 768 px
- **THEN** the grid renders one card per row

#### Scenario: Four columns on wide desktop
- **WHEN** viewport width is 1280 px or wider
- **THEN** the grid renders four cards per row
