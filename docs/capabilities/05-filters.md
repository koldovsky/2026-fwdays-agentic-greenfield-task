# Capability 5 — filters

Type multi-select, generation single-select, legendary/mythical toggle — all URL-param-driven and shareable.

**Depends on:** search (URL-state pattern established)  
**Unlocks:** pagination (needs stable filter set for page reset logic)

## Functional requirements

| ID | Description |
|---|---|
| FR-FILTER-01 | Type filter — multi-select of all 18 types; list shows Pokémon matching any selected type |
| FR-FILTER-02 | Generation filter — single-select Gen 1–9; list shows only Pokémon from that generation |
| FR-FILTER-03 | Legendary / Mythical toggle — when active, shows only legendary or mythical Pokémon |
| FR-FILTER-04 | All active filters reflected in URL params; URL is shareable and bookmarkable |
| FR-FILTER-05 | "Clear filters" control resets search and all filters and returns to page 1 |

## Technical notes

- URL params: `?type=fire,water&gen=1&legendary=1` (or similar)
- Use `TypeBadge` with `selectable` prop for the type multi-select (FR-FILTER-01) — already supports toggle/selected state
- Use `Select` from `@/components/ds` for generation filter (FR-FILTER-02)
- Use `Switch` from `@/components/ds` for legendary toggle (FR-FILTER-03)
- Use `Button` variant `"ghost"` for "Clear filters" (FR-FILTER-05)
- Filter bar is a Client Component (manages URL writes); list grid is a Server Component (reads `searchParams`)
- `POKEMON_TYPES` constant exported from `@/components/ds` — use for rendering the 18 type buttons
- Filtering strategy: generation and legendary data comes from the species endpoint; pre-fetch or cache a full index (id → name, types, generation, is_legendary, is_mythical) in a Route Handler at `/api/pokemon-index`
- This full index also fixes the search limitation from cap 4: search currently only covers the fetched 20-item page. Once the full index exists, `filterByName` should run against it so all 1025 Pokémon are searchable. Update `app/pokemon/page.tsx` to fetch from the index and apply all filters (name, type, generation, legendary) before slicing the page.
- `lib/` helpers: `filterByName` (already exists — reuse), `filterByType`, `filterByGeneration`, `filterByLegendary` — all pure functions
- Clear filters (FR-FILTER-05): remove all URL params, reset page to 1
