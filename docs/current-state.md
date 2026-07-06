# Current State — GitHub Battle

A running log of task integration and project changes. Newest entries first.
Each entry records a **timestamp**, the **change**, relevant **links**
(commits, PRs, files, requirement IDs), and a **short brief**.

- **Repo:** https://github.com/MukhaA/2026-fwdays-agentic-greenfield-task
- **Source of truth:** [docs/requirements.md](requirements.md) · narrative in [docs/product-brief.md](product-brief.md)
- **Planning workflow:** OpenSpec (`openspec/`, `/opsx:*` commands)

## Status snapshot

| Area                | State                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Concept             | Defined — GitHub Battle: single-user stats + two-user scored battle    |
| Requirements (PRD)  | Functional requirements `shipped` (implemented + verified locally); prod-measured NFRs (perf/a11y/obs) still `proposed` |
| Stack scaffolding   | Done — Next.js 16.2 + React 19.2 + Tailwind 4 (create-next-app)         |
| Design system       | Integrated — GitHub Battle DS wired into the app (tokens + DESIGN.md); components hand-built on DS tokens (shadcn/ui not needed) |
| OpenSpec change     | `github-battle-mvp` — proposed, specced, designed, implemented (33/33 tasks) |
| Implementation      | MVP built — all three routes, keyless data layer, 15 pure metrics + scoring (27 unit tests), landing/stats/battle UI. `lint` · `tsc` · `test` · `build` all green |

## Log

### 2026-07-06 — Top repositories section (OpenSpec `stats-top-repos`)

- **Change:** Added a collapsible **Top repositories** panel to the stats page:
  the ten most-starred repos (ties broken by most-recent push), each linking to
  GitHub, plus a "View all repositories on GitHub" out-link.
- **Links:** `app/components/TopRepos.tsx` · `app/components/StatsView.tsx` ·
  `lib/github/types.ts` · `lib/types.ts` (`RepoSummary`, `UserStats.topRepos`) ·
  `lib/metrics/aggregate.ts` (`buildTopRepos`) · `lib/metrics/format.ts`
  (`formatMonthYear`) · specs: `user-stats/spec.md` + `github-data/spec.md`
- **Brief:** Extended `RawRepo` with `description`/`html_url`/`pushed_at`; pure
  `buildTopRepos` ranks by stars desc then recency and caps at ten (empty-safe,
  unit-tested). `TopRepos` is a client disclosure (aria-expanded + chevron,
  default open) rendering rank · name link · language dot · description · ★ stars ·
  month/year, with the GitHub repos-tab link below. No new fetches — repos were
  already loaded. Verified with a headless screenshot of `/stats/sindresorhus`
  (ranking + links correct). Gate green (33 tests).

### 2026-07-06 — Stats charts dashboard (OpenSpec `stats-charts`)

- **Change:** Expanded `/stats/[username]` from numbers-only into a panelled
  dashboard: added a **Recent activity** bar chart, **Reach & influence**
  horizontal bars, and a **Repository composition** stacked bar, plus an enriched
  profile meta line (joined year + follower/following counts).
- **Links:** `app/components/{Panel,ActivityChart,ReachBar,RepoSplit,StatsView,
  Skeleton}.tsx` · `lib/types.ts` · `lib/metrics/aggregate.ts` · `lib/strings.ts`
  · spec: `openspec/specs/user-stats/spec.md` (FR-STATS-01 modified + 3 chart
  requirements added)
- **Brief:** All charts are pure CSS (TC-STACK-05) fed by the existing fifteen
  metrics — no new fetches. Added `createdAt` to `UserProfile` for the joined
  year. Metric labels tweaked to the dashboard wording ("Forks received",
  "PRs · 90d", …). Metric grid → 6 columns on lg, wrapped in a panel; language +
  activity share a 2-col row; reach and repo-composition are full-width panels.
  Charts are zero-repo/zero-metric safe. Skeleton extended with panel placeholders
  (no layout shift). Verified with a headless screenshot of `/stats/torvalds`
  against the mock; gate green (28 tests).

### 2026-07-06 — Landing redesign + type-scale fix (OpenSpec `landing-redesign`)

- **Change:** Restyled the landing to a centered three-tier hero (italic eyebrow
  + display headline + standfirst) over an inline username + arrow-action row, to
  match a provided mock; renamed the modes **View stats/Battle → Explore/Compare**.
- **Links:** `app/page.tsx` · `app/components/LandingForm.tsx` · `lib/strings.ts`
  · `app/globals.css` · spec: `openspec/specs/landing-entry/spec.md`
  (FR-LAND-01/02 modified + centered-hero requirement added)
- **Brief:** Copy centralized in `lib/strings.ts`; submit is the light primary
  button with a trailing "→"; inputs use `sr-only`/`aria-label`; active tab text
  is `text-bg` (AA in both themes). Also fixed a **latent wiring bug**: the
  `--text-*` sizes were never mapped into `@theme inline`, so `text-display`,
  `text-h1/h2`, `text-stat`, `text-caption` emitted no utility and preflight reset
  headings to body size — now mapped, so DS typography renders app-wide. The
  `/battle` routes and head-to-head view keep their battle identity. Verified with
  a headless screenshot against the mock; gate green.

### 2026-07-06 — Explicit header Home control (OpenSpec `header-home-button`)

- **Change:** Added an explicit, labeled **Home** control to the header,
  complementing the existing logo-home link (FR-SHELL-03).
- **Links:** `app/components/HomeLink.tsx` · `app/components/Header.tsx` ·
  `lib/strings.ts` (`nav.home`) · spec: `openspec/specs/shell/spec.md`
  (Requirement "Header home navigation control")
- **Brief:** `HomeLink` is a small client island using `usePathname`; it renders
  a token-styled `next/link` to `/` on sub-routes and returns `null` on the
  landing page to avoid a redundant self-link. Near-iconless text label, visible
  focus ring. Verified: absent on `/`, present on `/stats/*` and `/battle/*`.
  Gate green. First delta change on top of the archived MVP baseline.

### 2026-07-06 — GitHub Battle MVP implemented (OpenSpec `github-battle-mvp`)

- **Change:** Implemented the full MVP via the OpenSpec change
  `github-battle-mvp` (proposal → specs → design → tasks → apply, 33/33 tasks).
- **Links:** `openspec/changes/github-battle-mvp/` · `lib/**` · `app/**` ·
  IDs: FR-SHELL-\*, FR-LAND-\*, FR-DATA-\*, FR-METRIC-01..15, FR-STATS-\*,
  FR-LANG-\*, FR-BATTLE-\*, FR-SCORE-\*
- **Brief:** Framework-free `lib/` core — keyless GitHub client
  (`lib/github/`, paginated repos, 404/rate-limit mapping, in-memory session
  cache), fifteen pure metric aggregators (`lib/metrics/`) and pure
  `scoreBattle` (`lib/scoring/`), all covered by Vitest (27 tests). UI on the
  App Router: landing with mode toggle + pre-navigation validation (server
  route `/api/validate`), `/stats/[username]` (profile, staggered metric cards,
  CSS language donut, skeleton), `/battle/[u1]/[u2]` (parallel fetch, sequential
  reveal, per-round winners, animated tally, winner banner, confetti, per-side
  error degradation). Shell = header/footer + dark-default theme toggle
  (`useSyncExternalStore`, pre-paint init script). Styled entirely through DS
  semantic tokens; near-iconless, sentence case. React 19 purity/effect lint
  rules satisfied (no setState-in-effect; deterministic confetti). Gate green:
  `npm run lint && tsc --noEmit && npm test && npm run build`. Verified live:
  username validation (found/not-found) and the calm rate-limit degradation
  (the shared-IP 60 req/h limit exercised the FR-DATA-05 path). Functional
  requirements advanced to `shipped`; production-measured NFRs (perf, a11y,
  console, TTFB) remain `proposed` pending a Vercel deploy.

### 2026-07-05 — Requirements aligned to the design system

- **Change:** Reconciled `docs/requirements.md` with the integrated design
  system. Dropped the animation/chart libraries in favor of the DS's CSS
  approach and captured previously-unspecified design constraints.
- **Links:** [requirements.md](requirements.md) · [DESIGN.md](../DESIGN.md) ·
  IDs: TC-STACK-04, TC-STACK-05, TC-FONT-01, FR-SHELL-04, FR-LANG-03,
  BC-BRAND-01, BC-BRAND-03
- **Brief:** `TC-STACK-04` (Framer Motion) and `TC-STACK-05` (Recharts) dropped
  → CSS keyframes + CSS charts from the DS (also helps NFR-PERF-03). Added
  `TC-FONT-01` (Newsreader/Geist/Geist Mono, self-hosted via `next/font`),
  `FR-SHELL-04` (theme toggle, dark default), `BC-BRAND-03` (near-iconless, no
  icon lib). Clarified `FR-LANG-03` (GitHub's per-language colors) and pointed
  `BC-BRAND-01` at `DESIGN.md`. `TC-STACK-02` (shadcn/cva) left as-is pending a
  build-time decision.

### 2026-07-05 — Design system integrated

- **Change:** Integrated the **GitHub Battle** design system (from
  `docs/DesignSystem.zip`) into the app and documented it.
- **Links:** `DESIGN.md` · `design-system/` · `app/tokens/*.css` ·
  `app/globals.css` · `app/layout.tsx` · `app/page.tsx` · `AGENTS.md` ·
  `eslint.config.mjs`
- **Brief:** Extracted the full reference kit into `design-system/` (canonical
  spec). Wired runtime tokens into `app/tokens/` and mapped semantic tokens onto
  Tailwind 4 utilities via `@theme inline` in `globals.css`; class-based dark
  mode, dark by default. Loaded Newsreader + Geist + Geist Mono self-hosted via
  `next/font` (no Google Fonts request). Replaced the create-next-app landing
  with a branded demo as a living smoke test. Authored `DESIGN.md` (the design
  contract) and added a design-system section to `AGENTS.md`. Excluded
  `design-system/**` from ESLint. Verified: `npm run build` and `npm run lint`
  green; dev renders with tokens/fonts resolving.

### 2026-07-05 — Project docs created

- **Change:** Added `docs/product-brief.md`, `docs/requirements.md`, and this
  `docs/current-state.md`, modeled on the sibling project's docs format.
- **Links:** [product-brief.md](product-brief.md) · [requirements.md](requirements.md)
- **Brief:** Captured the GitHub Battle concept as a traceable PRD — 3 routes
  (`/`, `/stats/[username]`, `/battle/[user1]/[user2]`), fifteen scored metrics
  (FR-METRIC-01..15), pre-navigation username validation (FR-LAND-04..06), and
  pure-function aggregation/scoring (FR-DATA-04, FR-SCORE-01). Authored with the
  `feature-forge` skill's rigor, conformed to the sibling template.

### 2026-07-05 — Stack scaffolded

- **Change:** Ran `create-next-app` in place, preserving pre-existing
  `.github/`, `.coderabbit.yaml`, and `.gitignore`.
- **Links:** `package.json` (next 16.2.10, react 19.2.4, tailwindcss ^4)
- **Brief:** Base Next.js 16 App Router project with TypeScript, Tailwind v4,
  and ESLint. Note TC-NEXT-01: this Next.js has breaking changes vs. training
  data — consult `node_modules/next/dist/docs/` before writing code.

### 2026-07-05 — OpenSpec workflow adopted

- **Change:** Confirmed OpenSpec (v1.5.0) is initialized (`openspec/`) with
  `/opsx:*` commands and `openspec-*` skills. A trial `github-battle` change
  scaffold was created and then removed to keep the tree clean until the PRD
  was ready.
- **Links:** `openspec/config.yaml` · `.claude/commands/opsx/`
- **Brief:** The implementation plan will be produced via OpenSpec
  (`proposal.md` → `design.md` → `specs/` deltas → `tasks.md`), then applied
  with `/opsx:apply`. Session was relocated into the project dir via `/cd` so
  the OpenSpec skills load natively.
