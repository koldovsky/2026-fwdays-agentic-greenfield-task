## Why

The Pokémon list currently supports only name search; users cannot narrow by type, generation, or legendary status. Adding multi-dimensional filtering unlocks the core discovery use case and is a prerequisite for pagination (which must reset to page 1 when filters change).

## What Changes

- Add a `FilterBar` client component with three controls: type multi-select (18 types), generation single-select (Gen 1–9), and a legendary/mythical toggle
- Build a `/api/pokemon-index` Route Handler that pre-fetches and caches a full id → name, types, generation, is_legendary, is_mythical index for all 1025 Pokémon
- Add pure filter helpers in `lib/`: `filterByType`, `filterByGeneration`, `filterByLegendary`
- Update `app/pokemon/page.tsx` to apply all four filters (name, type, generation, legendary) against the full index before rendering the card grid
- Persist all active filters in URL params (`?type=fire,water&gen=1&legendary=1`); URL is shareable and bookmarkable
- Add a "Clear filters" control that removes all params and resets to page 1
- Fix the existing search limitation: `filterByName` currently covers only 20 items; once the full index exists, it will cover all 1025

## Capabilities

### New Capabilities

- `filters`: Type multi-select, generation single-select, legendary/mythical toggle — all URL-param-driven and shareable

### Modified Capabilities

- `search`: Search is extended from the 20-item fetched page to all 1025 Pokémon via the new full index

## Impact

- **New files**: `app/api/pokemon-index/route.ts`, `src/lib/filters.ts`, `src/components/features/FilterBar.tsx`
- **Modified files**: `app/pokemon/page.tsx` (fetch from index, apply all filters), `src/lib/i18n/en.ts` (filter labels), `src/lib/pokemon.ts` (index fetch helper)
- **No breaking changes** to existing routes or components
- PokéAPI calls stay server-side only (TC-DATA-01 maintained)
