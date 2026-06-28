## 1. Data layer

- [x] 1.1 Create `lib/pokemon.ts` — export `fetchPokemonList(offset, limit)` and `fetchPokemon(id)` as pure async functions using `fetch` with `{ next: { revalidate: 86400 } }`
- [x] 1.2 Create `lib/i18n/en.ts` — export `strings` object with `emptyState.title` and `emptyState.description` keys

## 2. List page route

- [x] 2.1 Create `app/pokemon/page.tsx` — Server Component that calls `fetchPokemonList(0, 20)` then fans out to `fetchPokemon` for each entry with `Promise.all`
- [x] 2.2 Render a responsive grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5`) of `PokemonCard` components, each with `id`, `name`, `types`, and `href="/pokemon/[id]"`
- [x] 2.3 Render `EmptyState` (from `@/components/ds`) when the Pokémon list is empty, using `strings.emptyState` copy

## 3. Root redirect

- [x] 3.1 Replace `app/page.tsx` stub with `redirect("/pokemon")` from `next/navigation`

## 4. Verification

- [x] 4.1 Run `tsc --noEmit` — no type errors
- [x] 4.2 Run `npm run build` — compiles clean
- [x] 4.3 Start dev server, navigate to `/` — confirm redirect to `/pokemon`
- [x] 4.4 Confirm 20 Pokémon cards visible, each with sprite, dex number (`#NNNN`), name, and type badge(s)
- [x] 4.5 Confirm clicking a card navigates to `/pokemon/[id]`
- [x] 4.6 Resize viewport — confirm 1 col < 768 px, 4 col ≥ 1280 px
