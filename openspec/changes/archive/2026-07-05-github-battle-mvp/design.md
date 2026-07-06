## Context

The scaffold exists (Next.js 16.2 App Router, React 19.2, Tailwind 4, the GitHub
Battle design system wired into `app/tokens/` + `globals.css`), but no product
behavior is built. This change is a cross-cutting greenfield build spanning routing,
a data layer against an external API, a pure computation core, and animated UI — so a
design doc is warranted. The constraints are fixed by `docs/requirements.md`: keyless
public GitHub REST only, no runtime data/animation/chart libraries, pure/testable
`lib/`, dark-default DS tokens, `prefers-reduced-motion` respected, and a ~60 req/h
unauthenticated rate ceiling. AGENTS.md also warns that this Next.js has breaking
changes vs. training data — its docs must be consulted before writing route/layout
code (TC-NEXT-01).

## Goals / Non-Goals

**Goals:**
- Ship all `proposed` FRs across the five capabilities as one coherent MVP.
- Keep aggregation and scoring in framework-free `lib/` with full Vitest coverage.
- Minimize GitHub calls (parallel fetch + in-memory session cache) to survive the
  unauthenticated rate limit during a demo.
- Style exclusively through DS semantic tokens and DS chart/effect primitives.

**Non-Goals:**
- Authenticated mode / tokens, GraphQL, persisted history, >2 combatants,
  server-side caching, i18n beyond the shipped strings (all explicitly out of scope).
- Introducing an animation or chart library (dropped per TC-STACK-04/05).

## Decisions

- **Data fetching in Server Components / Route context (TC-DATA-01).** `/stats` and
  `/battle` fetch on the server where possible; landing username validation is a
  client interaction that calls a small server route/action so the pending/disabled
  UX (FR-LAND-08) stays client-driven. Rationale: keeps the public API calls off a
  secret path (there are none) while allowing the interactive validation flow.
- **Pure core split (`lib/`).** `lib/github/` holds the fetch client + pagination +
  error mapping (impure, but framework-free); `lib/metrics/` holds the fifteen
  aggregators; `lib/scoring/battle.ts` holds `scoreBattle`; `lib/types.ts` defines
  `UserStats`/`BattleResult`; `lib/strings.ts` centralizes UI copy (NFR-I18N-01).
  Metrics and scoring take raw payloads / `UserStats` and are import-free of `next`,
  `react`, and DOM — this is what makes them unit-testable (TC-PURE-01, FR-DATA-04).
- **Session cache as a module-level Map keyed by username.** Simplest thing that
  satisfies FR-DATA-07/NFR-RATE-01 without a backend; scoped to the running process.
  Alternative (Next `fetch` cache / `unstable_cache`) rejected to keep behavior
  explicit and avoid coupling to framework caching semantics.
- **Error mapping over exceptions at the boundary.** The client returns a discriminated
  result (`ok` | `not-found` | `rate-limited`) so pages render calm states
  (FR-DATA-05/06, FR-BATTLE-06) instead of hitting an error boundary.
- **Animation via DS CSS keyframes** (`ds-fade-up`, `ds-pop`, `ds-win-pulse`,
  `ds-confetti-fall`) with stagger through inline `animation-delay`; the reveal
  sequence is CSS/state-driven and gated on a `prefers-reduced-motion` check so it
  collapses to instant (FR-STATS-03, FR-BATTLE-02/07, NFR-A11Y-03).
- **Charts as DS CSS components** (conic-gradient donut / flex bars) using GitHub's
  per-language colors for language segments and DS accent/track tokens elsewhere
  (FR-LANG-03, TC-STACK-05).
- **Vitest for `lib/` only** (TC-STACK-06); E2E behavior verified via the `verify`
  skill / browser recordings rather than a heavy E2E harness.
- **shadcn/ui adoption deferred to build time.** TC-STACK-02 lists it, but the DS is
  token-driven; components will be hand-built on DS tokens unless a specific primitive
  clearly benefits from shadcn. Keeps the initial-JS budget (NFR-PERF-03) tight.

## Risks / Trade-offs

- **Unauthenticated 60 req/h limit** → a single battle costs ~6 calls; validation adds
  more. Mitigate with parallel fetch, the session cache, and the calm rate-limit
  state so a throttled demo degrades gracefully rather than breaking (NFR-RATE-01).
- **Next.js 16 breaking changes** → route/layout/params APIs may differ from training
  data. Mitigate by reading `node_modules/next/dist/docs/` before writing any
  route/layout code (TC-NEXT-01); treat async `params`/`searchParams` as suspect.
- **`/events` window is not guaranteed 90 days and is capped by GitHub** → the four
  90d activity metrics reflect only what the events endpoint returns. Documented as a
  known approximation in the aggregators (FR-METRIC-07..10).
- **Account-age / date math depends on "today"** → inject the reference date into the
  pure function so tests are deterministic (FR-METRIC-06).
- **Client JS budget (≤200 KB gzipped, NFR-PERF-03)** → favor Server Components and
  minimal client islands (landing form, theme toggle, battle reveal controller).

## Migration Plan

Additive greenfield; no data migration. Rollout is per-PR Vercel preview
(TC-DEPLOY-01). Rollback = revert the PR. Requirement statuses advance toward
`shipped` and `docs/current-state.md` is updated as the work lands.

## Open Questions

- Does any single UI primitive justify pulling in shadcn/ui, or is the token-driven
  hand-built approach sufficient for the whole MVP? (Resolve during implementation.)
- Exact copy for the rate-limit and not-found states beyond the required phrasing —
  finalize in `lib/strings.ts`.
