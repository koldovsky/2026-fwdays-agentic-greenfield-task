# Capability 2 — pokemon-list

Paginated grid of Pokémon cards fetched from PokéAPI, with empty state. No URL-driven filtering yet — that comes in capabilities 4–6.

**Depends on:** shell  
**Unlocks:** pokemon-detail, search, filters, pagination

## Functional requirements

| ID | Description |
|---|---|
| FR-LIST-01 | Display a paginated grid of Pokémon cards, 20 per page |
| FR-LIST-02 | Each card shows: official sprite, dex number (e.g. `#0001`), name, type badge(s) |
| FR-LIST-03 | Clicking a card navigates to the detail page for that Pokémon |
| FR-LIST-04 | Empty state shown when no Pokémon match active search and filters |

## Technical constraints

| ID | Description |
|---|---|
| TC-STACK-03 | PokéAPI (`https://pokeapi.co/api/v2/`) is the sole data source |
| TC-DATA-01 | All PokéAPI calls in Server Components or Route Handlers; URLs never in client bundle |
| TC-PURE-01 | Data-transform helpers in `lib/` — no `next/*`, no `react`, no DOM globals |
| TC-I18N-01 | UI strings (empty state copy, etc.) in `lib/i18n/en.ts` |

## Non-functional requirements

| ID | Description |
|---|---|
| NFR-PERF-01 | TTFB ≤ 300 ms on p95 for the list page |
| NFR-PERF-02 | Initial client JS payload ≤ 200 KB gzipped |

## Technical notes

- Use `PokemonCard` from `@/components/ds` for each tile
- Use `EmptyState` from `@/components/ds` for FR-LIST-04
- PokéAPI list endpoint: `GET /pokemon?limit=20&offset=N`; species + type data requires a second call per Pokémon (`GET /pokemon/{id}`)
- Artwork URL: `artworkUrl(id)` exported from `@/components/ds` (PokéAPI sprites CDN)
- Dex number format: zero-padded to 4 digits with `#` prefix (`#0025`) — see DESIGN.md
- Type names lowercase from API; `TypeBadge` lowercases internally
- Link each card to `/pokemon/[id]` (FR-LIST-03)
- `lib/` helpers: `fetchPokemonList`, `fetchPokemon` — pure functions, no framework imports
