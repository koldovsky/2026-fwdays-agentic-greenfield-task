## 1. Pokémon Index Route Handler

- [x] 1.1 Add `PokemonIndexEntry` type to `src/lib/pokemon.ts` (id, name, types, generation, isLegendary, isMythical, spriteUrl)
- [x] 1.2 Implement `fetchPokemonIndex()` in `src/lib/pokemon.ts`: batch-fetch all 1025 Pokémon + species in parallel (batches of 50), return `PokemonIndexEntry[]` with `next.revalidate = 86400`
- [x] 1.3 Create `app/api/pokemon-index/route.ts` Route Handler: call `fetchPokemonIndex()` and return JSON response

## 2. Pure Filter Helpers

- [x] 2.1 Create `src/lib/filters.ts` with pure functions: `filterByType(list, types)`, `filterByGeneration(list, gen)`, `filterByLegendary(list)` — all framework-free (TC-PURE-01)
- [x] 2.2 Extend `src/lib/i18n/en.ts` with filter labels: type filter heading, generation options (Gen 1–Gen 9), legendary toggle label, "Clear filters" button text

## 3. FilterBar Client Component

- [x] 3.1 Create `src/components/features/FilterBar.tsx` (`"use client"`) accepting `initialTypes`, `initialGen`, `initialLegendary` props; reads/writes URL params via `useRouter`
- [x] 3.2 Render 18 type buttons using `TypeBadge` with `selectable` prop for multi-select (FR-FILTER-01)
- [x] 3.3 Render generation `Select` from `@/components/ds` for single-select Gen 1–9 (FR-FILTER-02)
- [x] 3.4 Render legendary/mythical `Switch` from `@/components/ds` (FR-FILTER-03)
- [x] 3.5 Render "Clear filters" `Button` variant `"ghost"` — visible only when at least one filter or search param is active (FR-FILTER-05)
- [x] 3.6 On any filter change: update URL params (`type`, `gen`, `legendary`), preserve or clear `search`, reset `page` to 1

## 4. Update List Page

- [x] 4.1 Update `app/pokemon/page.tsx` to fetch from `/api/pokemon-index` instead of PokéAPI list endpoint; destructure `searchParams` for `search`, `type`, `gen`, `legendary`, `page`
- [x] 4.2 Apply filter pipeline in order: `filterByName` → `filterByType` → `filterByGeneration` → `filterByLegendary` using helpers from `src/lib/filters.ts` and `src/lib/search.ts`
- [x] 4.3 Slice filtered results to 20 items for the current page (pagination slice stays for capability 6)
- [x] 4.4 Pass `initialTypes`, `initialGen`, `initialLegendary` props to `FilterBar` derived from `searchParams`
- [x] 4.5 Pass `initialValue` to `SearchBar` derived from `searchParams.search`

## 5. Verification

- [x] 5.1 Run `tsc --noEmit` — zero errors
- [x] 5.2 Run `npm run build` — clean build
- [x] 5.3 Manually verify: select "fire" type → only fire Pokémon shown; select "Gen 1" → only Gen 1 shown; activate legendary toggle → only legendary/mythical shown
- [x] 5.4 Manually verify: combine type + gen + legendary filters; URL params update correctly; reload page restores filter state
- [x] 5.5 Manually verify: search "mewtwo" → Mewtwo (#150) appears (proves full-index search scope fix)
- [x] 5.6 Manually verify: "Clear filters" removes all params and shows full list
