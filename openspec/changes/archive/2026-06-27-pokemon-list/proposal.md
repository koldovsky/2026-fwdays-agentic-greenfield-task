## Why

The app shell exists but renders an empty page. Capability 2 delivers the core product value: a browsable, paginated grid of all 1 025 Pokémon fetched from PokéAPI, giving users their first real interaction with the Pokédex Explorer.

## What Changes

- Add `app/pokemon/page.tsx` — Server Component that fetches the first page of Pokémon and renders the grid
- Redirect `app/page.tsx` (root) to `/pokemon` so the list is the landing page
- Add `lib/pokemon.ts` — pure data-fetch helpers (`fetchPokemonList`, `fetchPokemon`) with no framework imports
- Add `lib/i18n/en.ts` — UI strings (empty state copy)
- Wire `PokemonCard` DS component per tile (sprite, dex number, name, type badges)
- Wire `EmptyState` DS component for zero-result state (FR-LIST-04)
- Each card links to `/pokemon/[id]` for the detail page (capability 3)

## Capabilities

### New Capabilities

- `pokemon-list`: Paginated grid of Pokémon cards — fetching, rendering, empty state, and card navigation

### Modified Capabilities

<!-- No existing capability specs are changing -->

## Impact

- **New files:** `app/pokemon/page.tsx`, `lib/pokemon.ts`, `lib/i18n/en.ts`
- **Modified files:** `app/page.tsx` (root redirect → `/pokemon`)
- **DS components used:** `PokemonCard`, `TypeBadge`, `EmptyState` (already in `src/components/ds/`)
- **External API:** `https://pokeapi.co/api/v2/pokemon?limit=20&offset=N` + per-Pokémon detail endpoint
- **No client JS added** — all data fetching in Server Components (NFR-PERF-02)
