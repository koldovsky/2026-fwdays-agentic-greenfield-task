## 1. Data & i18n layer

- [x] 1.1 Create `src/lib/search.ts` with `filterByName(list: PokemonListItem[], query: string): PokemonListItem[]` — pure, case-insensitive, no framework imports
- [x] 1.2 Add i18n strings to `src/lib/i18n/en.ts`: `search.placeholder`, `search.label`, `search.noResults.title`, `search.noResults.description`

## 2. SearchBar Client Component

- [x] 2.1 Create `src/components/features/SearchBar.tsx` as a `"use client"` component
- [x] 2.2 Use DS `SearchInput` component inside `SearchBar`
- [x] 2.3 Implement 300 ms debounce — on change, push `?search=<term>` via `useRouter`; on clear, remove the param from the URL
- [x] 2.4 Accept an `initialValue` prop so the Server Component can pre-populate the input from `searchParams.search`

## 3. List page integration

- [x] 3.1 Update `app/pokemon/page.tsx` to accept `searchParams` prop (Next.js App Router convention)
- [x] 3.2 Read `searchParams.search` and pass it to `filterByName` after `fetchPokemonList`
- [x] 3.3 Render `SearchBar` above the grid, passing `initialValue={searchParams.search ?? ''}`
- [x] 3.4 Update the empty state to use `search.noResults.*` strings when a search query is active, and keep the existing load-error strings otherwise

## 4. Verification

- [x] 4.1 `tsc --noEmit` passes with no errors
- [x] 4.2 `npm run build` completes cleanly
- [x] 4.3 Typing a Pokémon name (e.g. "bulb") filters the grid to matching cards after ~300 ms
- [x] 4.4 URL updates to `?search=bulb` while typing
- [x] 4.5 Loading `/pokemon?search=pika` pre-populates the input and shows only matching cards
- [x] 4.6 Clearing the input restores all 20 cards and `?search=` is removed from the URL
- [x] 4.7 Typing a string with no matches (e.g. "zzz") shows the no-results empty state with the search-specific message
