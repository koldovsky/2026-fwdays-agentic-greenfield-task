# Explorer — UI kit

A high-fidelity, interactive recreation of the **Pokémon Explorer** product
(see `docs/requirements.md` in the source repo). It composes the design
system's component primitives — it does not re-implement them.

## Files

| File | Role |
| --- | --- |
| `index.html` | Interactive entry. Switches between the list and detail screens; filter/page/selection state persists to `localStorage`. |
| `data.js` | Curated sample dataset (`window.PokedexData`) — a slice of the National Dex with full detail across types, generations, and legendary/mythical status. |
| `icons.jsx` | Inline Lucide icon set (`window.PokeIcons`). |
| `AppShell.jsx` | Sticky top bar with the wordmark + footer crediting PokéAPI. |
| `FilterBar.jsx` | Search, type multi-select chips, generation select, legendary switch, clear. |
| `ListScreen.jsx` | Results grid (PokemonCard), pagination, empty state. |
| `DetailScreen.jsx` | Full profile: artwork, dex/name/genus, types, flavor, base stats, abilities, height/weight, generation, legendary label. |

## Requirements coverage

- **List** — FR-LIST-01..04 (grid, card content, navigation, empty state)
- **Search** — FR-SEARCH-01..03 (real-time name filter, clear)
- **Filters** — FR-FILTER-01..05 (types, generation, legendary, clear)
- **Pagination** — FR-PAGE-01..02
- **Detail** — FR-DETAIL-01..09
- **Shell** — FR-SHELL-01..02 (top bar; responsive grid at 768/1024/1280)
- **Brand** — BC-BRAND-01 (clean, content-first), BC-BRAND-02 (PokéAPI credit)

## Notes / fidelity cuts

- Data is a fixed local sample, not live PokéAPI calls. URL-state (FR-SEARCH-02,
  FR-FILTER-04, FR-PAGE-02) is mocked via `localStorage` rather than real query
  params, since the kit is a single static file.
- Page size is 12 here for grid density; production spec is 20/page.
- Official artwork loads from the public PokéAPI sprites CDN by dex id.
