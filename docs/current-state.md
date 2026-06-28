# Current state

**Last action:** 2026-06-27T14:00:00Z

## What was done

### Build-time Pokémon index (COMPLETE, ARCHIVED)

- `scripts/generate-pokemon-index.mjs` — plain ESM build script; fetches all 1025 Pokémon from PokéAPI in batches of 50, writes `src/data/pokemon-index.json`; exits with code 1 on failure
- `src/data/pokemon-index.d.ts` — TypeScript declaration for the generated JSON module
- `src/data/pokemon-index.json` — generated at build time, gitignored
- `.gitignore` updated — `src/data/pokemon-index.json` excluded
- `package.json` updated — `"generate"` script added; `"build"` now runs generation before `next build`
- `app/pokemon/page.tsx` updated — replaced `fetchPokemonIndex()` with `import pokemonIndex from '@/data/pokemon-index.json'`
- `app/api/pokemon-index/route.ts` deleted — no longer needed
- `src/lib/pokemon.ts` cleaned — `fetchPokemonIndex`, `fetchIndexEntry`, `GENERATION_NUMBER` removed
- `openspec/specs/pokemon-list/spec.md` updated — "Data is fetched server-side only" requirement updated to reflect build-time generation
- `openspec/changes/archive/2026-06-27-build-time-pokemon-index/` — archived

## Current state

All 6 capabilities shipped + performance optimisation:

| Capability | Status |
|---|---|
| Shell / navigation | ✅ Complete |
| Pokémon list | ✅ Complete |
| Pokémon detail | ✅ Complete |
| Search | ✅ Complete |
| Filters | ✅ Complete |
| Pagination | ✅ Complete |
| Build-time index (perf) | ✅ Complete |

- Zero runtime PokéAPI calls for the list page — index imported as static JSON
- Detail page (`/pokemon/[id]`) still fetches at runtime (cached with `revalidate: 86400`)
- `npm run generate` regenerates the index; `npm run build` always regenerates before compiling
- `tsc --noEmit` and `npm run build` pass clean
- Verified: 0 PokéAPI browser calls on list page, all filters and pagination working

## Known issues

None.

## Suggested next steps

1. Address non-functional requirements (NFR-*): TTFB audit, JS payload size check
2. Accessibility audit (NFR-A11Y-01, NFR-A11Y-02)
3. Verify PokéAPI footer credit (BC-BRAND-02)
4. Final QA pass across all capabilities
