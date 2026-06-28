## Context

The list page exists and cards link to `/pokemon/[id]`, but the route returns 404. This design covers the detail page: a server-rendered profile layout using two PokéAPI endpoints and several DS components already in the codebase.

Key constraints:
- All PokéAPI calls must stay in Server Components (TC-DATA-01)
- `lib/` helpers must be framework-free (TC-PURE-01)
- UI strings (stat labels, generation names) in `lib/i18n/en.ts` (TC-I18N-01)
- DS components: `TypeBadge` (lg), `Badge` (legendary variant), `StatBar` (max 255)

## Goals / Non-Goals

**Goals:**
- Render `/pokemon/[id]` with artwork, name, genus, types, flavor, stats, abilities, height/weight, generation, legendary badge
- Add `fetchPokemonDetail` and `fetchPokemonSpecies` to `src/lib/pokemon.ts`
- Extend `src/lib/i18n/en.ts` with stat labels and generation names
- Static back link to `/pokemon`

**Non-Goals:**
- Back link preserving search/filter URL params (depends on capabilities 4–6; placeholder `/pokemon` link for now)
- Evolution chain, move list, or any data beyond the 9 FRs
- Client-side interactivity on the detail page

## Decisions

### D1 — Two parallel PokéAPI fetches with `Promise.all`

The detail page needs both `GET /pokemon/{id}` (types, stats, abilities, height, weight) and `GET /pokemon-species/{id}` (genus, flavor text, generation, is_legendary, is_mythical). Fetching both in parallel with `Promise.all` is the fastest approach (~same latency as one request vs. sequential doubling it). Both fetches use `{ next: { revalidate: 86400 } }` for 24 h caching.

### D2 — Dynamic route with `params` as Promise

Next.js 16 App Router passes `params` as a `Promise<{ id: string }>` to page components. The page must `await params` before using `id`. Attempting to read `params.id` synchronously triggers a build-time warning.

### D3 — Flavor text: last English entry

`flavor_text_entries` is an ordered array; the last entry where `language.name === "en"` is the most recent game's dex text. Control characters `\n` and `\f` are replaced with a space. Implemented in `fetchPokemonSpecies` transformer — no presentation-layer string cleaning needed.

### D4 — Generation label mapping in `lib/i18n/en.ts`

The species endpoint returns `generation.name` as `"generation-i"` through `"generation-ix"`. A mapping object in `en.ts` converts these to human-readable labels (e.g. `"Gen 1 — Kanto"`). Keeping this in `i18n` rather than hardcoding in the component allows future localisation.

### D5 — Layout: two-column grid on desktop, stacked on mobile

Follows the `DetailScreen` ui-kit reference exactly:
- Desktop (≥ 1024 px): `grid-template-columns: 440px 1fr`, art panel sticky at `top: 84px` (below the 60 px TopBar + padding)
- Mobile (< 1024 px): single column, art panel static, max-width 380 px
- All styles via DS tokens (no raw hex, no raw px except where token equivalents don't exist for layout geometry)

### D6 — `notFound()` for invalid IDs

If either `fetchPokemonDetail` or `fetchPokemonSpecies` returns `null` (non-200 from PokéAPI), the page calls `notFound()` from `next/navigation`, rendering the app's 404 page rather than crashing.

## Risks / Trade-offs

- **PokéAPI missing species data** — a small number of high-id Pokémon lack a `/pokemon-species/{id}` entry. Mitigation: `fetchPokemonSpecies` returns `null` on non-200; page calls `notFound()`.
- **Back link loses context** — until search/filter/pagination are added (cap. 4–6), the back link always goes to `/pokemon` page 1. Acceptable now; will be addressed in those capabilities.
- **Sticky art panel on Safari** — `position: sticky` + `overflow: hidden` on a parent can break in older Safari. The art `<div>` has no overflow-hidden parent in our layout, so this should not be an issue.

## Open Questions

None — all decisions resolved for this capability scope.
