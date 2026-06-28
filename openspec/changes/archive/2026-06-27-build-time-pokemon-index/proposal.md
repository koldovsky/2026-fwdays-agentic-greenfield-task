## Why

Every `/pokemon` page request — initial load, filter change, page navigation — runs a 21-batch loop of 2050+ HTTP requests to PokéAPI to assemble the full 1025-entry index, even though only 20 cards are ever displayed. The Pokédex is static data that changes only when a new game ships; there is no reason to fetch it at runtime at all.

## What Changes

- Add `scripts/generate-pokemon-index.mjs` — a Node.js script that fetches the full index from PokéAPI and writes it to `src/data/pokemon-index.json`
- Add a `generate` npm script and wire it into `build` so the JSON is always fresh at deploy time
- Replace `fetchPokemonIndex()` call in `app/pokemon/page.tsx` with a direct `import` of the generated JSON
- Remove the now-unused `app/api/pokemon-index/route.ts` route handler
- `fetchPokemonIndex()` in `src/lib/pokemon.ts` is no longer called at runtime (kept or removed)

## Capabilities

### New Capabilities

None — this is a pure performance optimization with no user-visible behaviour change.

### Modified Capabilities

- `pokemon-list`: data source changes from runtime API calls to a build-time static import; no functional requirement changes, but the NFR constraint `TC-DATA-01` ("all PokéAPI calls happen in Server Components or Route Handlers") needs a carve-out for build-time scripts

## Impact

- `scripts/generate-pokemon-index.mjs` — new build script (plain ESM, no TypeScript runner needed)
- `src/data/pokemon-index.json` — generated artifact, added to `.gitignore`
- `src/data/pokemon-index.d.ts` — type declaration so TypeScript accepts the JSON import
- `package.json` — new `generate` script, `build` script updated to `node scripts/generate-pokemon-index.mjs && next build`
- `app/pokemon/page.tsx` — replaces `fetchPokemonIndex()` call with JSON import
- `app/api/pokemon-index/route.ts` — deleted (no longer needed)
- `src/lib/pokemon.ts` — `fetchPokemonIndex` and `fetchIndexEntry` can be removed (only used by the deleted route and the page)
