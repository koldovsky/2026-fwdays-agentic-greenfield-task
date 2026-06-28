## Context

Every `/pokemon` server render calls `fetchPokemonIndex()`, which loops through 1025 Pokémon in 21 sequential batches of 50 parallel fetch pairs (`/pokemon/{id}` + `/pokemon-species/{id}`). Even though Next.js caches individual fetch responses, the assembly loop re-runs on every request. The result is slow initial loads and sluggish filter/page interactions.

The Pokédex is effectively static — it changes only when Nintendo ships a new game (~once a year). Fetching it at runtime is unnecessary.

## Goals / Non-Goals

**Goals:**
- Eliminate all runtime PokéAPI calls for the index (list page, filters, pagination)
- Make every `/pokemon` page request instant regardless of filter state
- Zero user-visible behaviour change

**Non-Goals:**
- Changing how the detail page fetches individual Pokémon
- Adding a mechanism to auto-refresh the index without a redeploy
- Changing the filter, search, or pagination logic

## Decisions

### 1. Build-time script over `unstable_cache`

`unstable_cache` would cache the assembled array across requests but still runs the 21-batch loop once on cold start. A build-time script runs the loop exactly once per deploy and the result is available instantly from the very first request — including cold starts.

**Alternative rejected:** `unstable_cache` — still slow on first request, adds Next.js-specific API coupling.

### 2. Plain ESM `.mjs` script over TypeScript + tsx

The project has no `tsx` or `ts-node`. Adding one as a dev dependency just to run a one-off script is unnecessary overhead. The generation script is self-contained fetch logic that translates trivially to plain ESM.

**Alternative rejected:** TypeScript + tsx — requires a new devDependency and runner configuration.

### 3. Direct JSON import over fetching the route handler

`app/api/pokemon-index/route.ts` has ISR but the page bypasses it. Importing the static JSON directly is simpler, zero runtime overhead, and doesn't depend on Next.js ISR timing.

**Alternative rejected:** fetching `/api/pokemon-index` from the page — still a runtime network call, even if internal.

### 4. `src/data/pokemon-index.json` added to `.gitignore`

The JSON is a generated build artifact, not source. Committing it would cause noisy diffs whenever PokéAPI data changes and creates a false impression it needs manual maintenance.

### 5. `package.json` build script: `node scripts/generate-pokemon-index.mjs && next build`

npm's `prebuild` hook runs automatically before `build`. Using it keeps the script wiring in one place. Alternatively the `build` script itself can be updated to chain both commands — either works, chaining in `build` is more explicit.

## Risks / Trade-offs

- [Risk] Build fails if PokéAPI is unreachable during CI → Mitigation: script exits with a non-zero code and a clear error message; CI will surface it. No silent empty JSON.
- [Risk] Pokédex data becomes stale between deploys → Accepted trade-off; the Pokédex rarely changes and a redeploy is the correct mechanism to pick up new generations.
- [Risk] `src/data/` in `.gitignore` means a fresh checkout without running the build script has no index → Mitigation: `build` script always regenerates it; local dev uses `npm run generate` or `npm run build` before `npm run dev`.
