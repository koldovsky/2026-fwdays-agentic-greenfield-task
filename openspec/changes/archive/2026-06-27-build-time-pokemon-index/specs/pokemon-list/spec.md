## MODIFIED Requirements

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
