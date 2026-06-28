## Why

The list page is live and every card links to `/pokemon/[id]`, but that route doesn't exist yet — clicking any card yields a 404. This capability closes the core browse → click → read → back loop by delivering a full Pokémon profile page.

## What Changes

- Add `app/pokemon/[id]/page.tsx` — Server Component rendering the full detail page
- Add `lib/pokemon.ts` additions: `fetchPokemonDetail` and `fetchPokemonSpecies` helpers
- Extend `lib/i18n/en.ts` — stat labels (HP, Attack, …), generation names, "Legendary", "Mythical", "Hidden ability" strings
- Wire DS components: `TypeBadge` (size lg), `Badge` variant `"legendary"`, `StatBar` (max 255), back link to `/pokemon`

## Capabilities

### New Capabilities

- `pokemon-detail`: Full Pokémon profile — artwork, dex number, name, genus, types, flavor text, base stats, abilities, height/weight, generation, legendary/mythical label, and back link

### Modified Capabilities

- `pokemon-list`: FR-LIST-03 is satisfied now that `/pokemon/[id]` exists (no requirement text change — implementation only)

## Impact

- **New files:** `app/pokemon/[id]/page.tsx`
- **Modified files:** `src/lib/pokemon.ts` (two new exports), `src/lib/i18n/en.ts` (new string keys)
- **DS components used:** `TypeBadge`, `Badge`, `StatBar`, `artworkUrl` — all already in `@/components/ds`
- **External API:** `GET /pokemon/{id}` + `GET /pokemon-species/{id}` per page load (both cached 24 h)
- **No client JS added** — Server Component throughout
