# Tasks: add-nace-catalog

## 1. Setup

- [x] 1.1 Run `npm run capability:check -- --capability nace-catalog`; confirm unblocked. Re-read `package.json`: if `vitest` + `test` script already landed (e.g. via `add-invoice-calc`), reuse; otherwise add `vitest` (devDependency) and `"test": "vitest run"` (design D5). Verify: `npm run test` executes (0 tests is fine).

## 2. Types and seed catalog

- [x] 2.1 Create `src/lib/nace/types.ts`: `NaceEntry` with stable kebab-case `id`, `naceClass` (non-unique `XX.XX` string), `officialNameUa`, `lineTextEn`, `lineTextUa`, `legacyKvedClass` (data-only), `keywords` (lowercase UA + EN). `MatchResult` discriminated union `matched | ambiguous | none` (design D1–D3). Verify: `npm run typecheck`.
- [x] 2.2 Create `src/lib/nace/catalog.ts` with the four seed entries from the delta spec (FR-NACE-02/03/04): 74.12 graphic design, 74.12 3D visualization, 74.14 specialized design, 59.12 video post-production — bilingual texts exactly as specified, official UA names from `docs/191_2025.pdf`, legacy КВЕД correspondences (74.10 → 74.12/74.14, 59.12 → 59.12). Verify: `npm run typecheck && npm run lint`.
- [x] 2.3 Create `src/lib/nace/catalog.test.ts`: all four entries present with exact bilingual texts; two entries share `naceClass` 74.12 with distinct ids (FR-NACE-01); no `КВЕД`/`ДК 009` substrings in any `lineTextEn`/`lineTextUa` (BC-NACE-01). Verify: `npm run test` green.

## 3. Keyword matcher

- [x] 3.1 Create `src/lib/nace/match.ts`: normalize input (trim, lowercase, strip punctuation), score entries by matched keywords, return `matched` on a single top score, `ambiguous` with tied candidates, `none` on zero score (FR-NACE-05, design D3). Pure function, no I/O. Verify: `npm run typecheck && npm run lint`.
- [x] 3.2 Create `src/lib/nace/match.test.ts`: each seed entry found by its own UA and EN keywords in mixed case; overlap input («3D дизайн»-style) returns `ambiguous` with both design candidates, never a silent pick; gibberish returns `none`; UA and EN descriptions of the same service resolve to the same entry. Verify: `npm run test` green.

## 4. Verification and handoff

- [x] 4.1 Full gate: `npm run test && npm run typecheck && npm run lint && npm run build` all green (NFR-DX-01); confirm no React/storage imports in `src/lib/nace/` (TC-STACK-04) and no barrel `index.ts` (design D4).
- [x] 4.2 Update `docs/current-state.md`: session log entry, active change status, next up (`/opsx:sync add-nace-catalog` then archive; capability-map `nace-catalog` → `shipped` after sync). Verify: statuses consistent with `openspec status --change add-nace-catalog`.
