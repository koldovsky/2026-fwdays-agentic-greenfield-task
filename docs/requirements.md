# PRD — Pokémon Explorer

Last updated: 2026-06-27

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, tests,
PRs, and recordings reference these IDs to keep traceability intact.

Refer to [docs/product-brief.md](product-brief.md) for narrative context.

## ID conventions

| Prefix   | Meaning                    | Example                                        |
| -------- | -------------------------- | ---------------------------------------------- |
| `FR-*`   | Functional Requirement     | `FR-LIST-01` — paginated grid of Pokémon cards |
| `NFR-*`  | Non-Functional Requirement | `NFR-PERF-01` — TTFB < 300 ms                  |
| `TC-*`   | Technical Constraint       | `TC-STACK-01` — Next.js 16 App Router          |
| `BC-*`   | Business / UX Constraint   | `BC-PRIVACY-01` — no analytics                 |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

## Functional requirements

### Shell & navigation

| ID          | Description                                                                                                        | Status   |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-SHELL-01 | Single-page app with a top bar (app name/logo) and a main content area                                             | proposed |
| FR-SHELL-02 | Layout adapts at 768 px and 1280 px breakpoints; mobile single-column, tablet two-column, desktop multi-column grid | proposed |

### Pokémon list (capability `pokemon-list`)

| ID         | Description                                                                                   | Status   |
| ---------- | --------------------------------------------------------------------------------------------- | -------- |
| FR-LIST-01 | Display a paginated grid of Pokémon cards, 20 per page                                        | proposed |
| FR-LIST-02 | Each card shows: official sprite, dex number (e.g. #001), name, type badge(s)                 | proposed |
| FR-LIST-03 | Clicking a card navigates to the detail page for that Pokémon                                  | proposed |
| FR-LIST-04 | Empty state shown when no Pokémon match the active search and filters                          | proposed |

### Search (capability `search`)

| ID           | Description                                                                           | Status   |
| ------------ | ------------------------------------------------------------------------------------- | -------- |
| FR-SEARCH-01 | User types a Pokémon name into a search input; the list filters in real time (debounced) | proposed |
| FR-SEARCH-02 | Active search term is reflected in the URL as `?search=`                              | proposed |
| FR-SEARCH-03 | Clearing the search input restores the full unfiltered list                            | proposed |

### Filters (capability `filters`)

| ID           | Description                                                                                                        | Status   |
| ------------ | ------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-FILTER-01 | Type filter — multi-select of all 18 Pokémon types; list shows Pokémon matching any selected type                  | proposed |
| FR-FILTER-02 | Generation filter — single-select Gen 1–9; list shows only Pokémon introduced in that generation                   | proposed |
| FR-FILTER-03 | Legendary / Mythical toggle — when active, shows only legendary or mythical Pokémon                                | proposed |
| FR-FILTER-04 | All active filters reflected in URL params; the resulting URL is shareable and bookmarkable                        | proposed |
| FR-FILTER-05 | "Clear filters" control resets search and all filters and returns to page 1                                        | proposed |

### Pagination (capability `pagination`)

| ID          | Description                                                                              | Status   |
| ----------- | ---------------------------------------------------------------------------------------- | -------- |
| FR-PAGE-01  | Pagination controls at the bottom of the list: previous, page numbers, next             | proposed |
| FR-PAGE-02  | Current page reflected in the URL as `?page=`; changing any filter resets to page 1     | proposed |

### Pokémon detail (capability `pokemon-detail`)

| ID            | Description                                                                                       | Status   |
| ------------- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-DETAIL-01  | Detail page at `/pokemon/[id]` shows: large official artwork, dex number, name, genus             | proposed |
| FR-DETAIL-02  | Types displayed as colored badges                                                                  | proposed |
| FR-DETAIL-03  | Pokédex flavor text — latest English entry from the species endpoint                               | proposed |
| FR-DETAIL-04  | Base stats displayed: HP, Attack, Defense, Sp. Atk, Sp. Def, Speed                               | proposed |
| FR-DETAIL-05  | Abilities listed; hidden ability marked as such                                                    | proposed |
| FR-DETAIL-06  | Height and weight shown in metric units                                                            | proposed |
| FR-DETAIL-07  | Generation introduced                                                                              | proposed |
| FR-DETAIL-08  | Legendary or Mythical label shown only when applicable                                             | proposed |
| FR-DETAIL-09  | Back link returns to the list page preserving the previous URL params (search, filters, page)     | proposed |

## Non-functional requirements

| ID          | Description                                                                                         | Status   |
| ----------- | --------------------------------------------------------------------------------------------------- | -------- |
| NFR-PERF-01 | TTFB ≤ 300 ms on p95 for the list page                                                              | proposed |
| NFR-PERF-02 | Initial client JS payload ≤ 200 KB gzipped                                                          | proposed |
| NFR-A11Y-01 | All interactive elements have visible focus styles and accessible names                             | proposed |
| NFR-A11Y-02 | Color palette meets WCAG AA contrast ratio                                                          | proposed |
| NFR-OBS-01  | Console is silent at runtime (no warnings, no errors) on a healthy session                          | proposed |
| NFR-DX-01   | `npm run lint && tsc --noEmit && npm run build` finish in < 60 s on a clean checkout                | proposed |

## Technical constraints

| ID           | Description                                                                                                                    | Status   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| TC-STACK-01  | Next.js 16.2 App Router; TypeScript strict; React 19.2                                                                         | accepted |
| TC-STACK-02  | Tailwind CSS 4 (PostCSS plugin)                                                                                                | accepted |
| TC-STACK-03  | PokéAPI (`https://pokeapi.co/api/v2/`) as the sole data source; no other Pokémon data provider                                  | accepted |
| TC-DATA-01   | All PokéAPI calls happen in Server Components or Route Handlers; PokéAPI URLs are never exposed in the client bundle           | proposed |
| TC-PURE-01   | `lib/` is framework-free: no `next/*`, no `react`, no DOM globals — enables 100% unit-testability                              | proposed |
| TC-I18N-01   | UI strings centralised in `lib/i18n/en.ts`; no runtime i18n library                                                           | proposed |

## Business / UX constraints

| ID            | Description                                                                               | Status   |
| ------------- | ----------------------------------------------------------------------------------------- | -------- |
| BC-PRIVACY-01 | No analytics, no third-party trackers, no fingerprinting                                  | accepted |
| BC-PRIVACY-02 | No cookies set by the application code                                                    | accepted |
| BC-BRAND-01   | Visual style is clean and minimal; content-first, no decorative chrome                   | proposed |
| BC-BRAND-02   | Footer credits PokéAPI with a hyperlink                                                   | proposed |

## Out of scope (MVP)

- User accounts, favorites, or any personalization persisted client- or server-side
- Pokémon comparison view
- Evolution chain display
- Move list
- Location / encounter data
- Non-English language support
- Native mobile app
