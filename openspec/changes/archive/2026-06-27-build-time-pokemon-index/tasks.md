## 1. Build script

- [x] 1.1 Create `scripts/generate-pokemon-index.mjs` — plain ESM script that fetches `GET /pokemon?limit=1025`, then for each id fetches `/pokemon/{id}` and `/pokemon-species/{id}` in batches of 50, assembles `PokemonIndexEntry[]`, and writes the result to `src/data/pokemon-index.json`; exits with code 1 and a clear message if any fetch fails
- [x] 1.2 Add `src/data/` to `.gitignore` so the generated JSON is not committed

## 2. npm scripts

- [x] 2.1 Add `"generate": "node scripts/generate-pokemon-index.mjs"` to `package.json` scripts
- [x] 2.2 Update `"build"` script to `"node scripts/generate-pokemon-index.mjs && next build"` so generation always runs before the Next.js build

## 3. TypeScript type declaration

- [x] 3.1 Create `src/data/pokemon-index.d.ts` declaring the module so TypeScript accepts `import index from '@/data/pokemon-index.json'` as `PokemonIndexEntry[]`

## 4. Wire static import into the list page

- [x] 4.1 In `app/pokemon/page.tsx` — replace `import { fetchPokemonIndex } from '@/lib/pokemon'` and the `await fetchPokemonIndex()` call with `import pokemonIndex from '@/data/pokemon-index.json'` (used directly as `PokemonIndexEntry[]`)

## 5. Clean up now-unused code

- [x] 5.1 Delete `app/api/pokemon-index/route.ts` (route handler no longer needed)
- [x] 5.2 Remove `fetchPokemonIndex` and `fetchIndexEntry` from `src/lib/pokemon.ts` (no longer called at runtime)

## 6. Verify

- [x] 6.1 Run `npm run generate` and confirm `src/data/pokemon-index.json` is created with 1025 entries
- [x] 6.2 Run `tsc --noEmit` — no TypeScript errors
- [x] 6.3 Run `npm run build` — build succeeds, generation runs automatically as part of it
- [x] 6.4 Start the server (`npm start`) and confirm `/pokemon` loads correctly with all filters and pagination working
