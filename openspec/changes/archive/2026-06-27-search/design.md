## Context

The Pokémon list page (`/pokemon`) is a Server Component that fetches 20 Pokémon from PokéAPI and renders them as a static grid. There is no way to narrow results. FR-SEARCH-01..03 require a debounced name search that filters the list in real time and persists the active query in the URL.

The challenge is that Next.js App Router Server Components cannot hold local state or respond to user events. A Client Component is needed for the input, but the filtering and rendering must remain server-side to avoid shipping the full dataset to the browser.

## Goals / Non-Goals

**Goals:**
- Real-time debounced name filtering of the 20-item list
- URL persistence of the active query (`?search=`)
- Pure, framework-free filter helper for testability
- Empty state message that distinguishes "no results for query" from "data failed to load"

**Non-Goals:**
- Server-side search against PokéAPI (not supported — the API has no name-search endpoint that returns partial matches efficiently)
- Type or generation filtering (capability 5)
- Pagination coordination with search (capability 6)
- Fuzzy or phonetic matching

## Decisions

**D1: Split input (Client) from grid (Server)**
`SearchBar` is a `"use client"` component that owns the debounce timer and pushes `?search=` via `useRouter`. The list grid remains a Server Component that reads `searchParams.search` and renders a filtered subset. This avoids hydrating the dataset on the client and keeps PokéAPI calls server-only (TC-DATA-01).

Alternative considered: fully client-rendered filter with in-memory state. Rejected — would expose PokéAPI response data in the bundle and break TC-DATA-01.

**D2: Fetch all 20 then filter in memory**
`fetchPokemonList(0, 20)` returns at most 20 items. Filtering after the fetch is O(20) — negligible. No new PokéAPI endpoint or route handler is needed.

Alternative considered: a `/api/pokemon?search=` route handler. Rejected — adds a network round-trip for no benefit at this list size.

**D3: `filterByName` lives in `src/lib/search.ts`**
The filter function is pure (string → string[]) with no Next.js or React imports, consistent with TC-PURE-01. It can be unit-tested in isolation.

**D4: `?search=` URL param, removed when empty**
The router push removes the param entirely (not `?search=`) when the input is cleared, keeping URLs clean and matching FR-SEARCH-02/03.

**D5: 300 ms debounce**
Balances responsiveness against router navigation thrash. The debounce timer lives in the Client Component; the Server Component is stateless and re-renders only when `searchParams` change.

## Risks / Trade-offs

- **Full list always fetched** → Mitigation: list is capped at 20 items with 24 h ISR cache; no performance concern at this scale. If the cap grows (capability 6), the fetch strategy will need revisiting.
- **Navigation on every keystroke (post-debounce)** → each URL push triggers a Server Component re-render. With ISR caching this is fast, but adds latency vs. pure client filter. Accepted trade-off for URL persistence.
- **No loading indicator between keystrokes and re-render** → capability 6 (pagination) will introduce a loading state; deferred to that change.
