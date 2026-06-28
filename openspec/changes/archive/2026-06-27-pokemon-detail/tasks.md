## 1. Data layer

- [x] 1.1 Add `fetchPokemonDetail(id)` to `src/lib/pokemon.ts` — fetches `GET /pokemon/{id}`, returns `{ id, name, types, stats, abilities, height, weight }` with `{ next: { revalidate: 86400 } }`; returns `null` on non-200
- [x] 1.2 Add `fetchPokemonSpecies(id)` to `src/lib/pokemon.ts` — fetches `GET /pokemon-species/{id}`, returns `{ genus, flavorText, generation, isLegendary, isMythical }` with `{ next: { revalidate: 86400 } }`; strip `\n`/`\f` from flavor text; returns `null` on non-200
- [x] 1.3 Extend `src/lib/i18n/en.ts` — add `statLabels` (HP, Attack, Defense, Sp. Atk, Sp. Def, Speed), `generationNames` map (`generation-i` → `"Gen 1 — Kanto"` … `generation-ix` → `"Gen 9 — Paldea"`), and `detail` strings (legendary, mythical, hiddenAbility, backLink)

## 2. Detail page route

- [x] 2.1 Create `app/pokemon/[id]/page.tsx` — async Server Component that `await`s `params`, calls `fetchPokemonDetail` and `fetchPokemonSpecies` in `Promise.all`, calls `notFound()` if either returns `null`
- [x] 2.2 Render artwork panel: sticky `<div>` (top: 84px on desktop) with dex number and official artwork `<img>`
- [x] 2.3 Render info header: genus (mono, uppercase), name (`<h1>`), `TypeBadge size="lg"` per type, and `Badge variant="legendary"` for legendary/mythical (conditional)
- [x] 2.4 Render flavor text paragraph
- [x] 2.5 Render base stats section: six `StatBar` components using `statLabels` from i18n (max = 255)
- [x] 2.6 Render profile section: height (m), weight (kg), generation — use DS token card styling
- [x] 2.7 Render abilities section: pill badges, "Hidden" label for hidden abilities
- [x] 2.8 Render back link `<a href="/pokemon">` with "Back to results" label (DS token styling)
- [x] 2.9 Apply two-column grid layout: `440px 1fr` on desktop (≥ 1024 px), single column on mobile

## 3. Verification

- [x] 3.1 Run `tsc --noEmit` — no type errors
- [x] 3.2 Run `npm run build` — compiles clean
- [x] 3.3 Start dev server, navigate to `/pokemon/25` (Pikachu) — confirm artwork, `#0025`, name, types, flavor text, stats, abilities, height/weight, generation all visible
- [x] 3.4 Navigate to a legendary (`/pokemon/150` — Mewtwo) — confirm "Legendary" badge present
- [x] 3.5 Navigate to `/pokemon/99999` — confirm 404 page shown (not a crash)
- [x] 3.6 Click back link — confirm navigation to `/pokemon`
