## Context

The app shell is live but the root page is a blank stub. This design covers the Pokémon list screen: a server-rendered grid that fetches from PokéAPI and delegates all visual work to DS components.

Key constraints:
- PokéAPI is keyless; no auth, no rate-limit headers needed for normal use
- All PokéAPI calls must stay in Server Components (TC-DATA-01) — no URLs in client bundle
- Pure data helpers in `lib/` with no framework imports (TC-PURE-01)
- DS components (`PokemonCard`, `EmptyState`) are already built and exported from `@/components/ds`

## Goals / Non-Goals

**Goals:**
- Render `/pokemon` as a server-rendered list page with 20 Pokémon per page (first page)
- Wire `PokemonCard` for each tile with sprite, dex number, name, type badges
- Show `EmptyState` when the list is empty
- Redirect root `/` to `/pokemon`
- Keep all PokéAPI URLs server-side

**Non-Goals:**
- Pagination controls (capability 6 — `Pagination` DS component exists but is not wired yet)
- Search or type/generation filters (capabilities 4–5)
- Detail page (capability 3)
- Loading skeletons or streaming (can be added as enhancement later)

## Decisions

### D1 — Two-step fetch per Pokémon (list → detail)

PokéAPI's `GET /pokemon?limit=20&offset=0` returns only `name` and `url` per entry. To get types and the sprite id, a second call `GET /pokemon/{id}` is needed per Pokémon. Alternatives considered:

- **Batch all 20 in parallel with `Promise.all`** (chosen) — 20 parallel requests from a Server Component; typical cold response under 200 ms combined on PokéAPI CDN.
- **Use `/pokemon-species`** — would also need a second call for types; no advantage.
- **Cache with `next/cache`** — Next.js 16 `fetch` with `cache: "force-cache"` tags each request; individual Pokémon data rarely changes, so this is a good fit. Use `{ next: { revalidate: 86400 } }` (24 h).

### D2 — `lib/pokemon.ts` as the data layer

All PokéAPI logic lives in `lib/pokemon.ts`, exporting:
- `fetchPokemonList(offset: number, limit: number): Promise<PokemonListItem[]>`
- `fetchPokemon(id: number | string): Promise<PokemonData>`

No `next/*` or `react` imports. Types are plain interfaces. This keeps the helpers testable in isolation and prevents accidental client-bundle inclusion.

### D3 — `app/pokemon/page.tsx` as a Server Component (no `"use client"`)

The list page has no client interactivity in this capability — card clicks use `<a>` navigation via `PokemonCard`'s `href` prop. Keeping it a Server Component gives us free server-side data fetching and zero client JS for the grid itself (NFR-PERF-02).

### D4 — Root redirect via `next/navigation` redirect

`app/page.tsx` calls `redirect("/pokemon")` from `next/navigation` at the top of the component. This produces a 307 server-side redirect — no client JS executed.

### D5 — Responsive grid via Tailwind breakpoint classes

Grid columns: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` where breakpoints map to the DS spec (sm=768, lg=1024, xl=1280). This matches the `ListScreen` ui-kit reference exactly.

## Risks / Trade-offs

- **PokéAPI cold starts** — 20 parallel requests on first load may hit 300 ms p95 (NFR-PERF-01) on a cold CDN edge. Mitigation: `revalidate: 86400` so subsequent renders use the Next.js data cache.
- **No pagination yet** — page always shows offset 0. Users cannot browse beyond the first 20 Pokémon until capability 6. Acceptable for now; pagination is a separate capability.
- **Official artwork missing for some IDs** — PokéAPI artwork CDN has gaps above id ~1008. `PokemonCard` renders gracefully with `alt` text if the image 404s (browser default broken-image). No special handling needed.

## Open Questions

None — all decisions are resolved for this capability scope.
