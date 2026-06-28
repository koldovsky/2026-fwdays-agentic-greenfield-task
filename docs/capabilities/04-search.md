# Capability 4 — search

Real-time debounced name search that filters the list and persists state in the URL.

**Depends on:** pokemon-list  
**Unlocks:** filters (shares URL-state pattern)

## Functional requirements

| ID | Description |
|---|---|
| FR-SEARCH-01 | User types a name; the list filters in real time (debounced) |
| FR-SEARCH-02 | Active search term reflected in URL as `?search=` |
| FR-SEARCH-03 | Clearing the search input restores the full unfiltered list |

## Technical notes

- Use `SearchInput` from `@/components/ds` — already has a clear (×) button
- URL state: use `useRouter` + `useSearchParams` from `next/navigation` in a Client Component; the list grid itself stays a Server Component fed by `searchParams`
- Debounce: 300 ms on the client before pushing to the URL
- Filtering strategy: PokéAPI's `/pokemon?limit=N` endpoint doesn't support name search; fetch the full name+id list once (`/pokemon?limit=1500`) and filter client-side, OR use `/pokemon/{name}` for exact lookup. Recommended: cache the full list in a Route Handler and filter server-side on `searchParams.search`
- Clearing search (FR-SEARCH-03): set `?search=` to empty / remove param; reset to page 1
- `lib/` helpers: `filterByName(list, query)` — pure, no framework imports
