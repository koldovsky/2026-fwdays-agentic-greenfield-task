## Context

`/pokemon` currently renders a 20-item server-fetched page with a debounced name search. The search filter runs against only those 20 items — users cannot discover Pokémon beyond the first page by name, and there is no way to filter by type, generation, or legendary status. Pagination (capability 6) requires a stable, complete filtered set to calculate total pages and reset to page 1 on filter change.

The existing URL-state pattern (search term → `?search=`) established in capability 4 is the right model for all filters. Filter state belongs in the URL so any filtered view is shareable and bookmarkable.

## Goals / Non-Goals

**Goals:**
- Provide type multi-select (18 types), generation single-select (Gen 1–9), and legendary/mythical toggle
- Persist all filter state in URL params; the resulting URL is shareable
- Fix search scope: `filterByName` runs against all 1025 Pokémon, not just the current 20
- Keep PokéAPI calls server-side only (TC-DATA-01)
- Keep filter helpers in `lib/` as pure functions (TC-PURE-01)

**Non-Goals:**
- Server-side streaming / incremental filtering via PokéAPI (adds complexity, breaks TC-DATA-01 simplicity)
- Saved/pinned filter presets or user preferences
- Pagination (capability 6 — consuming the filtered result set, not building it)

## Decisions

### Decision 1: Full Pokémon index via a Route Handler

**Choice:** Build a `/api/pokemon-index` Route Handler that fetches all 1025 Pokémon (name + types + species data for generation/legendary) and returns a compact JSON array. The `app/pokemon/page.tsx` Server Component fetches this index, applies all filters in memory, and renders the matching cards.

**Rationale:** Type, generation, and legendary data requires both `/pokemon/{id}` and `/pokemon-species/{id}` from PokéAPI. Fetching per-card on the list page would be 1025+ sequential requests per page load. Centralising this in a cached Route Handler (Next.js `fetch` with `revalidate`) means the heavy work runs once and is served from the cache on subsequent hits.

**Alternatives considered:**
- *Build-time static JSON* — simpler, but requires a build step and can't pick up PokéAPI updates during runtime. Route Handler with `revalidate: 86400` (24 h) gives the same caching benefit with live data.
- *Filter only via PokéAPI query params* — PokéAPI supports `/pokemon?type=fire` but not multi-type OR queries. Cannot satisfy FR-FILTER-01 (match any selected type) server-side without client-side logic anyway.

### Decision 2: FilterBar as a Client Component, page as a Server Component

**Choice:** `FilterBar` is a `"use client"` component that reads current URL params and writes new ones via `useRouter`. `app/pokemon/page.tsx` remains a Server Component reading `searchParams`.

**Rationale:** Mirrors the pattern already established by `SearchBar` in capability 4. The page re-renders on the server when URL params change; the client only manages the URL update. This avoids client-side state diverging from the URL.

### Decision 3: URL param format

**Choice:** `?type=fire,water&gen=1&legendary=1&search=bulba`
- Types: comma-separated multi-value string (`type=fire,water`)
- Generation: integer string (`gen=1`)  
- Legendary toggle: `1` when active, omitted when inactive
- Search: unchanged (`search=bulba`)

**Rationale:** Comma-separated multi-value is compact and human-readable in the address bar. Single param per filter keeps the URL clean and avoids repeated-key parsing complexity (`?type=fire&type=water`).

### Decision 4: Pokemon index shape

**Choice:** The index is a flat array of lightweight objects:
```ts
type PokemonIndexEntry = {
  id: number
  name: string
  types: string[]       // e.g. ["fire", "flying"]
  generation: number    // 1–9
  isLegendary: boolean
  isMythical: boolean
}
```

Sprites are not included; each card still fetches its own sprite via the existing `fetchPokemon` call (or the sprite URL is derived from the id: `https://raw.githubusercontent.com/.../official-artwork/{id}.png`). Including sprites in the index would balloon its size by ~1025 URLs.

Alternatively, the sprite URL can be derived deterministically from the id and included in the index to avoid 20 extra card-level fetches. The index fetch already hits the full Pokémon endpoint for each entry, so sprites are available at no extra cost — include them to eliminate per-card fetches on the list page.

## Risks / Trade-offs

**Risk: Index build time** → The Route Handler must fetch `/pokemon/{id}` and `/pokemon-species/{id}` for all 1025 Pokémon. At ~10–20 ms per pair with Next.js parallel fetch, the cold build takes ~10–20 s. Mitigation: use `Promise.all` in batches of 50; set `revalidate: 86400` so the build runs at most once per day.

**Risk: Index staleness** → With 24 h revalidation, newly added Pokémon won't appear immediately. Acceptable given PokéAPI rarely adds new entries and this is an MVP demo.

**Risk: FilterBar hydration flash** → The filter controls briefly render without their pre-selected state until React hydrates. Mitigation: read initial values from the URL in the Server Component and pass them as props to `FilterBar` via `initialValues`, matching the `SearchBar` pattern.

## Migration Plan

No schema migration or breaking deployment steps. The change is additive:
1. Deploy Route Handler — establishes the index endpoint; existing pages unaffected
2. Deploy updated `page.tsx` — switches from 20-item fetch to full-index fetch; search scope widens automatically
3. Deploy `FilterBar` — adds filter controls above the grid; URL params are optional so the page remains functional with no params set

Rollback: revert `page.tsx` to the 20-item fetch; the Route Handler can remain harmlessly.
