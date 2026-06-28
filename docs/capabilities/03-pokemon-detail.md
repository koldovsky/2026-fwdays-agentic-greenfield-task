# Capability 3 — pokemon-detail

Full Pokémon profile page at `/pokemon/[id]`: artwork, stats, abilities, flavor text, back link.

**Depends on:** pokemon-list (navigation target)  
**Unlocks:** completes the core browse → click → read → back loop

## Functional requirements

| ID | Description |
|---|---|
| FR-DETAIL-01 | Large official artwork, dex number, name, genus |
| FR-DETAIL-02 | Types displayed as colored badges |
| FR-DETAIL-03 | Pokédex flavor text — latest English entry from the species endpoint |
| FR-DETAIL-04 | Base stats: HP, Attack, Defense, Sp. Atk, Sp. Def, Speed |
| FR-DETAIL-05 | Abilities listed; hidden ability marked as such |
| FR-DETAIL-06 | Height and weight in metric units |
| FR-DETAIL-07 | Generation introduced |
| FR-DETAIL-08 | Legendary or Mythical label shown only when applicable |
| FR-DETAIL-09 | Back link returns to list preserving previous URL params (search, filters, page) |

## Technical constraints

| ID | Description |
|---|---|
| TC-DATA-01 | All PokéAPI calls in Server Components; URLs never in client bundle |
| TC-PURE-01 | Data-transform helpers in `lib/` — framework-free |
| TC-I18N-01 | UI strings (stat labels, "Legendary", "Hidden", etc.) in `lib/i18n/en.ts` |

## Technical notes

- Route: `app/pokemon/[id]/page.tsx` — Server Component
- PokéAPI calls needed:
  - `GET /pokemon/{id}` — sprite, types, stats, abilities, height, weight
  - `GET /pokemon-species/{id}` — genus, flavor text, generation, is_legendary, is_mythical
- Use `StatBar` from `@/components/ds` for FR-DETAIL-04 (max = 255)
- Use `TypeBadge` from `@/components/ds` for FR-DETAIL-02
- Use `Badge` variant `"legendary"` for FR-DETAIL-08
- Flavor text: pick the latest `flavor_text_entries` where `language.name === "en"`; strip `\n`/`\f` whitespace
- Back link (FR-DETAIL-09): read the referring URL params from `searchParams` and reconstruct `/?search=…&page=…` etc. — passed as a prop or read from a cookie-free mechanism
- Height: divide API value by 10 → meters; weight: divide by 10 → kg
- `lib/` helpers: `fetchPokemonDetail`, `fetchPokemonSpecies`
