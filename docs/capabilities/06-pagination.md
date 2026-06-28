# Capability 6 — pagination

Bottom-of-list page controls that integrate with all active search and filter state.

**Depends on:** filters (any filter change must reset to page 1 — FR-PAGE-02)  
**Unlocks:** nothing (final capability)

## Functional requirements

| ID | Description |
|---|---|
| FR-PAGE-01 | Pagination controls at the bottom: previous, page numbers, next |
| FR-PAGE-02 | Current page reflected in URL as `?page=`; changing any filter resets to page 1 |

## Technical notes

- Use `Pagination` from `@/components/ds` — already implements the page-number model with ellipsis collapsing
- `?page=` is 1-based; default to page 1 when param is absent or invalid
- Changing search or any filter (capabilities 4–5) must reset `?page=1` — enforce this in the URL-write helpers, not in `Pagination` itself
- Total page count: `Math.ceil(filteredCount / 20)`; `filteredCount` comes from the server after applying all active filters
- `Pagination` is a Client Component (`"use client"` already set) — receives `page`, `totalPages`, `onPageChange` as props
- `onPageChange` pushes `?page=N` to the URL while preserving all other params (search, type, gen, legendary)
- `lib/` helper: `paginate(list, page, pageSize)` — pure, returns `{ items, totalPages }`
