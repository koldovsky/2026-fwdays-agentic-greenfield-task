## Context

The `/pokemon` list page already applies search and filter state from URL params server-side and renders a 20-card slice. Currently the slice is always the first 20 results. The DS `Pagination` component already exists and handles the rendering model (previous, numbered pages with ellipsis, next); it only needs to be wired to URL state.

The `FilterBar` and `SearchBar` client components both write URL params via `useRouter`. Any change to search or filters must reset `?page=1` at the point of URL writes, not inside `Pagination`, so that all state transitions that could change the result count automatically land on page 1.

## Goals / Non-Goals

**Goals:**
- Expose page navigation controls at the bottom of the list (FR-PAGE-01)
- Persist and restore `?page=N` in the URL; default to page 1 when absent or invalid (FR-PAGE-02)
- Reset `?page=1` whenever search or any filter changes
- Keep `paginate()` pure and framework-free (TC-PURE-01)

**Non-Goals:**
- Infinite scroll or virtual scrolling
- Changing the page size (20 per page is fixed by FR-LIST-01)
- Prefetching adjacent pages

## Decisions

### 1. `paginate(list, page, pageSize)` pure helper

All page-slice logic lives in `src/lib/paginate.ts`. It takes the full filtered list, a 1-based page number, and page size; returns `{ items, totalPages }`. The page.tsx server component calls this after the filter pipeline.

**Alternatives considered:** computing `items = list.slice(...)` inline in page.tsx — rejected because it would be untestable inline logic and harder to reuse.

### 2. Page resets in client URL writers, not in `Pagination`

`FilterBar` and `SearchBar` already have URL-write helpers. Each one will add `page: '1'` to the params object it pushes. This is the only place page resets need to happen; the `Pagination` component only pushes `?page=N` for explicit user navigation.

**Alternative:** reset page on the server side by redirecting when `page > totalPages` — still needed as a safety measure, but the primary reset is in client URL writers for instant feedback.

### 3. Reuse existing DS `Pagination` component

`src/components/ds/` already exports `Pagination`. It receives `page`, `totalPages`, and `onPageChange`. The new `src/components/features/Pagination.tsx` wrapper will be a thin `"use client"` bridge that reads/writes the URL param while delegating rendering to the DS component.

**Alternative:** use the DS component directly in page.tsx — rejected because page.tsx is a Server Component and cannot pass a client callback directly.

### 4. Server-side guard: redirect when `page > totalPages`

If `?page=5` is in the URL but filtered results only have 2 pages, the server component redirects to `?page=2` (or `?page=1` if `totalPages === 0`). This handles stale/bookmarked URLs gracefully.

## Risks / Trade-offs

- [Risk] Filter changes from `FilterBar` that come back through the router hit the server with the new params; the redirect guard adds a round-trip if the old page is now out of range → Mitigation: client-side reset to page 1 in `FilterBar`/`SearchBar` means the stale-page case should rarely occur in practice.
- [Risk] DS `Pagination` ellipsis behavior untested for very large `totalPages` — 1025 Pokémon ÷ 20 = 52 pages max; the component handles this well.
