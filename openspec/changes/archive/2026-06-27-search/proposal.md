## Why

The Pokémon list page currently shows all 20 Pokémon with no way to narrow results. Users need to find a specific Pokémon by name quickly; search is the most fundamental discovery affordance for a Pokédex.

## What Changes

- Add a `SearchInput` bar above the Pokémon grid on `/pokemon`
- Client-side debounced input (300 ms) writes `?search=` into the URL
- Server Component reads `searchParams.search` and filters the fetched list by name before rendering
- Clearing the input removes the param and restores the full list
- Add `lib/filterByName` pure helper (no framework imports)
- Add i18n strings for search placeholder and no-results messaging

## Capabilities

### New Capabilities

- `search`: Real-time debounced name search that filters the Pokémon list and persists the active query in the URL as `?search=`

### Modified Capabilities

- `pokemon-list`: The list page gains a `searchParams.search` input and renders a filtered subset when a query is active; the empty-state message adapts to distinguish "no search results" from a load error

## Impact

- **New files:** `src/components/features/SearchBar.tsx` (Client Component wrapping DS `SearchInput`)
- **Modified files:** `app/pokemon/page.tsx` (accept `searchParams`, pass query to filter helper), `src/lib/pokemon.ts` (no change needed — filtering happens after fetch), `src/lib/i18n/en.ts` (add search strings)
- **New lib helper:** `src/lib/search.ts` — `filterByName(list, query)` pure function
- **External APIs:** No change — PokéAPI usage unchanged; all 20 Pokémon are still fetched and filtered in memory
- **DS components used:** `SearchInput` from `@/components/ds`
