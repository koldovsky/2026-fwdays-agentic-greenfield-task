## 1. Foundations & tooling

- [x] 1.1 Read `node_modules/next/dist/docs/` for App Router routing, layouts, dynamic
  `params`/`searchParams`, and server/client component conventions (TC-NEXT-01)
- [x] 1.2 Add and configure Vitest for `lib/` unit tests; add `test` script; ensure
  `npm run lint && tsc --noEmit && npm test && npm run build` runs (TC-STACK-06, NFR-DX-01)
- [x] 1.3 Create `lib/types.ts` with `UserStats` (fifteen fields) and `BattleResult`
  (per-metric outcomes, totals, winner/draw) types (FR-DATA-04, FR-SCORE-03)
- [x] 1.4 Create `lib/strings.ts` centralizing all UI copy incl. "User not found",
  "Enter a username", "GitHub rate limit reached, try again later" (NFR-I18N-01)

## 2. GitHub data layer (capability `github-data`)

- [x] 2.1 Implement `lib/github/client.ts`: unauthenticated fetch with descriptive
  `User-Agent` + `Accept: application/vnd.github+json` (FR-DATA-02, TC-STACK-03)
- [x] 2.2 Implement profile, paginated repos (`per_page=100`, cap 5 pages/500 repos),
  and events fetches (FR-DATA-01, FR-DATA-03)
- [x] 2.3 Map responses to a discriminated result (`ok`/`not-found`/`rate-limited`) for
  404 and 403 rate-limit exhaustion; never throw to an error boundary (FR-DATA-05/06)
- [x] 2.4 Add module-level in-memory session cache keyed by username for `UserStats`
  (FR-DATA-07, NFR-RATE-01)
- [x] 2.5 Add a validation helper hitting `GET /users/{username}` for existence
  checks, returning found/not-found (FR-LAND-04)

## 3. Pure metrics (capability `github-data`)

- [x] 3.1 Implement the fifteen pure aggregators in `lib/metrics/` returning
  `UserStats` from raw payloads; inject reference date for account age
  (FR-METRIC-01..15, FR-DATA-04, TC-PURE-01)
- [x] 3.2 Implement language-breakdown aggregation (rank by count, exclude null
  language, count + share per language) (FR-LANG-01/02)
- [x] 3.3 Vitest: unit tests covering all fifteen metrics + language breakdown,
  including empty/tie/null-language edge cases (TC-STACK-06)

## 4. Pure scoring (capability `battle`)

- [x] 4.1 Implement `scoreBattle(a, b): BattleResult` in `lib/scoring/battle.ts`:
  1 pt higher, 0.5 each on tie, out of 15; winner or draw; per-metric outcomes;
  document "higher is better" (FR-SCORE-01..04)
- [x] 4.2 Vitest: unit tests for win/loss/tie per metric, total math, draw, and
  per-metric outcome shape (TC-STACK-06)

## 5. Shell & navigation (capability `shell`)

- [x] 5.1 Define the three routes `/`, `/stats/[username]`, `/battle/[user1]/[user2]`
  in the App Router (FR-SHELL-01)
- [x] 5.2 Build responsive root layout: header (logo links home) + footer (GitHub REST
  API credit link); single-column mobile, side-by-side ≥768px (FR-SHELL-02/03, BC-BRAND-02)
- [x] 5.3 Implement theme toggle (light/dark, dark default) via the `.dark` class over
  semantic tokens; persist within session (FR-SHELL-04)

## 6. Landing & entry (capability `landing-entry`)

- [x] 6.1 Build the landing client island: mode toggle (View Stats / Battle) swapping
  one input + "Explore" vs two inputs + "Fight" (FR-LAND-01/02)
- [x] 6.2 Trim whitespace; empty-input guard with "Enter a username" and no API call
  (FR-LAND-03/07)
- [x] 6.3 On submit, validate existence before navigation; pending + disabled submit
  state (FR-LAND-04/08)
- [x] 6.4 Flag 404 inputs with red border + inline "User not found"; battle validates
  both in parallel, flags only failures, requires both to resolve (FR-LAND-05/06)

## 7. User stats view (capability `user-stats`)

- [x] 7.1 `/stats/[username]` server-fetches data → `UserStats`; renders profile
  (avatar, name, login, bio, location, links) (FR-STATS-01)
- [x] 7.2 Render fifteen labelled metric cards with staggered DS fade/slide reveal,
  reduced-motion instant fallback (FR-STATS-02/03, NFR-A11Y-03)
- [x] 7.3 Build the CSS language-breakdown chart with GitHub per-language colors,
  count/share tooltip, WCAG AA both themes (FR-LANG-01/02/03, NFR-A11Y-02)
- [x] 7.4 Add skeleton loading matching the loaded footprint (no layout shift); render
  not-found / rate-limit states in-page (FR-STATS-05, FR-DATA-05/06)

## 8. Battle view (capability `battle`)

- [x] 8.1 `/battle/[user1]/[user2]` fetches both users in parallel, lays out
  side-by-side, degrades to per-side error on failure (FR-BATTLE-01/06)
- [x] 8.2 Sequential metric reveal with stagger; each row shows both values;
  per-round winner highlight; tie marked draw (FR-BATTLE-02/03)
- [x] 8.3 Animated score counter tally + winner banner from `scoreBattle`
  (FR-BATTLE-04)
- [x] 8.4 Collapse reveal/tally/banner to instant under `prefers-reduced-motion`
  (FR-BATTLE-07, NFR-A11Y-03)

## 9. Verification & docs

- [x] 9.1 Verify shareable deep links load directly for `/stats/{u}` and
  `/battle/{u1}/{u2}` (FR-STATS-04, FR-BATTLE-05)
- [x] 9.2 Confirm silent console, focus styles/accessible names, and DS-only styling
  (no raw hex, near-iconless, sentence case) (NFR-OBS-01, NFR-A11Y-01, BC-BRAND-01/03)
- [x] 9.3 Run the full gate `npm run lint && tsc --noEmit && npm test && npm run build`
  and drive the flows via the `verify` skill (NFR-DX-01)
- [x] 9.4 Advance requirement statuses toward `shipped` in `docs/requirements.md` and
  add a `docs/current-state.md` log entry (project convention)
