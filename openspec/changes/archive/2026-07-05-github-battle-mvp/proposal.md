## Why

The GitHub Battle concept, stack, and design system are in place, but no product
behavior has been built yet — the app is a branded landing smoke test only. This
change delivers the full MVP: a keyless web app that turns public GitHub activity
into an interactive experience (explore one developer's aggregate stats, or battle
two head-to-head). It realizes every `proposed` functional requirement in
[docs/requirements.md](../../../docs/requirements.md) so the repo and live URL
become the workshop's demonstrable artifacts (BC-DEMO-01).

## What Changes

- Add the three-route App Router shell with responsive layout, header/footer, and a
  dark-default theme toggle (FR-SHELL-01..04).
- Add the landing screen with a **View Stats / Battle** mode toggle, one or two
  username inputs, pre-navigation existence validation with inline error flagging,
  empty/pending guards, and parallel validation in battle mode (FR-LAND-01..08).
- Add a keyless GitHub REST data layer: fetch profile, paginated repos, and events;
  descriptive `User-Agent`; graceful 404 and 403/rate-limit handling; in-memory
  session cache (FR-DATA-01..07).
- Add fifteen **pure** metric-aggregation functions in framework-free `lib/` that
  turn raw API payloads into a typed `UserStats` (FR-DATA-04, FR-METRIC-01..15).
- Add the single-user stats view: profile block, fifteen labelled metric cards with
  staggered reveal, a CSS language-breakdown chart, skeleton loading, shareable URL
  (FR-STATS-01..05, FR-LANG-01..03).
- Add the battle view: parallel two-user fetch, side-by-side layout, sequential
  metric reveal with per-round winner highlighting, animated score tally, winner
  banner, per-side error degradation, reduced-motion instant result (FR-BATTLE-01..07).
- Add a **pure** `scoreBattle` function producing a typed `BattleResult`
  (FR-SCORE-01..04).
- Add Vitest unit tests over the metric and scoring functions (TC-STACK-06).
- Centralize UI strings in a single module; no runtime i18n library (NFR-I18N-01).

No breaking changes — this is greenfield behavior on an existing scaffold.

## Capabilities

### New Capabilities
- `shell`: App routes, responsive layout, header/footer branding, theme toggle
  (dark by default) driven by semantic design-system tokens.
- `landing-entry`: Landing screen mode toggle, username inputs, and pre-navigation
  existence validation with inline error handling.
- `github-data`: Keyless GitHub REST fetch layer, error/rate-limit handling, session
  cache, and the fifteen pure metric-aggregation functions producing `UserStats`.
- `user-stats`: Single-user stats page — profile, fifteen metric cards, language
  breakdown chart, skeleton loading, shareable route.
- `battle`: Two-user battle page (parallel fetch, sequential reveal, per-round
  winners, animated tally, winner banner, error degradation) and the pure
  `scoreBattle` scoring function.

### Modified Capabilities
<!-- None — greenfield MVP; no existing specs in openspec/specs/. -->

## Impact

- **New code:** `app/` routes (`/`, `/stats/[username]`, `/battle/[user1]/[user2]`),
  route-level UI components, `lib/` (GitHub client, metric aggregation, scoring,
  types, strings), and `lib/**/*.test.ts` (Vitest).
- **Dependencies:** add Vitest (dev) for `lib/` unit tests; optionally shadcn/ui +
  class-variance-authority per TC-STACK-02. No runtime data/animation/chart
  libraries (TC-STACK-04/05), no paid API keys (NFR-COST-01).
- **External APIs:** unauthenticated `api.github.com` only (TC-STACK-03); subject to
  the 60 req/h limit (NFR-RATE-01).
- **Design system:** all UI styled through existing semantic tokens and DS chart /
  effect primitives; no raw hex or new colors (DESIGN.md, BC-BRAND-01/03).
- **Docs:** requirement statuses advance toward `shipped`; `docs/current-state.md`
  updated per project convention.
