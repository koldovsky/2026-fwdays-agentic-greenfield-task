## Why

The list page currently fetches and filters the full Pokémon index but always renders the first 20 results with no way for the visitor to navigate further pages. FR-PAGE-01 and FR-PAGE-02 require working pagination controls that integrate with the existing search and filter URL state.

## What Changes

- Add a `paginate(list, page, pageSize)` pure helper in `src/lib/` (returns `{ items, totalPages }`)
- Add a `Pagination` client component that renders previous / page-numbers / next controls
- Wire `app/pokemon/page.tsx` to accept a `?page=` URL param and pass `page` + `totalPages` to the component
- Update URL-write helpers in `SearchBar` and `FilterBar` to reset `?page=1` whenever search or any filter changes

## Capabilities

### New Capabilities

- `pagination`: Bottom-of-list page controls — renders previous, numbered pages (with ellipsis), and next; reads and writes `?page=` in the URL while preserving all other params; changing any filter or search term resets to page 1

### Modified Capabilities

- `pokemon-list`: Page slice now driven by `?page=` param (was hard-coded to first 20); `filteredCount` surfaced to compute `totalPages`
- `filters`: `FilterBar` URL writes must reset `?page=1` on any filter change
- `search`: `SearchBar` URL write must reset `?page=1` on search change

## Impact

- `src/lib/paginate.ts` — new pure helper (TC-PURE-01)
- `src/components/features/Pagination.tsx` — new client component
- `app/pokemon/page.tsx` — reads `page` from `searchParams`, passes `page` + `totalPages` to `Pagination`
- `src/components/features/FilterBar.tsx` — `pushParams` includes `page=1` reset
- `src/components/features/SearchBar.tsx` — URL push includes `page=1` reset
- `src/lib/i18n/en.ts` — pagination aria labels and screen-reader text
