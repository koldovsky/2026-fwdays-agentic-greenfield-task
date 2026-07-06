# PRD — GitHub Battle / Developer Stats Explorer

Last updated: 2026-07-05

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, tests,
PRs, and recordings reference these IDs to keep traceability intact.

Refer to [docs/product-brief.md](product-brief.md) for narrative context.
Refer to [DESIGN.md](../DESIGN.md) for the visual design system (tokens, type, motion, voice).

## ID conventions

| Prefix   | Meaning                    | Example                                        |
| -------- | -------------------------- | ---------------------------------------------- |
| `FR-*`   | Functional Requirement     | `FR-LAND-04` — validate username before nav    |
| `NFR-*`  | Non-Functional Requirement | `NFR-PERF-01` — TTFB < 300 ms                  |
| `TC-*`   | Technical Constraint       | `TC-STACK-01` — Next.js 16 App Router          |
| `BC-*`   | Business / UX Constraint   | `BC-PRIVACY-01` — no analytics                 |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

## Functional requirements

### Shell & navigation (capability `shell`)

| ID          | Description                                                                                                    | Status   |
| ----------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| FR-SHELL-01 | App has three routes: `/` (landing), `/stats/[username]`, `/battle/[user1]/[user2]`                            | shipped  |
| FR-SHELL-02 | Layout is responsive: single-column on mobile, side-by-side battle columns on tablet/desktop (≥ 768 px)        | shipped  |
| FR-SHELL-03 | Header shows the product name/logo and links home; footer credits the GitHub REST API (BC-BRAND-02)            | shipped  |
| FR-SHELL-04 | A theme toggle switches light/dark; the product **defaults to dark**. Every color is a semantic token, so one `.dark` class re-themes the whole app (design system) | shipped  |

### Landing & entry (capability `landing-entry`)

| ID          | Description                                                                                                                            | Status   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-LAND-01  | Landing screen offers a mode toggle with two modes: **View Stats** and **Battle**                                                      | shipped  |
| FR-LAND-02  | View Stats mode shows one username input + "Explore" action; Battle mode shows two username inputs + "Fight" action                    | shipped  |
| FR-LAND-03  | Username inputs accept a free-form GitHub login; leading/trailing whitespace is trimmed before use                                     | shipped  |
| FR-LAND-04  | On submit, each entered username is validated for existence via `GET /users/{username}` **before** any navigation                      | shipped  |
| FR-LAND-05  | If a username returns HTTP 404, its input is highlighted (red border) with an inline "User not found" message; navigation is blocked   | shipped  |
| FR-LAND-06  | In Battle mode both usernames are validated in parallel; only the input(s) that failed are flagged; both must resolve before nav       | shipped  |
| FR-LAND-07  | An empty required input blocks submission with an inline "Enter a username" hint; no navigation and no API call is made                | shipped  |
| FR-LAND-08  | While validation is in flight, the submit action shows a pending state and is disabled to prevent duplicate submits                    | shipped  |

### GitHub data layer (capability `github-data`)

| ID          | Description                                                                                                                                   | Status   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-DATA-01  | For a username, fetch profile from `GET /users/{u}`, repos from `GET /users/{u}/repos?per_page=100` (paginated), and `GET /users/{u}/events` | shipped  |
| FR-DATA-02  | All GitHub calls are unauthenticated (no token); requests set a descriptive `User-Agent` and `Accept: application/vnd.github+json`             | shipped  |
| FR-DATA-03  | Repo pagination follows until all public repos are retrieved or a safety cap (e.g. 5 pages / 500 repos) is reached; the cap is documented      | shipped  |
| FR-DATA-04  | Aggregation into the fifteen metrics is performed by **pure functions** in `lib/` that take raw API payloads and return a typed `UserStats`    | shipped  |
| FR-DATA-05  | On HTTP 403 with rate-limit exhaustion, surface a calm explicit message ("GitHub rate limit reached, try again later"); never crash or blank   | shipped  |
| FR-DATA-06  | On HTTP 404 during a data fetch (user removed between validation and load), show a "User not found" state on the page, not an error boundary   | shipped  |
| FR-DATA-07  | The last successful `UserStats` per username is cached in memory for the session to avoid refetching on re-navigation                          | shipped  |

### Metrics (capability `github-data`, the fifteen scored categories)

Each metric is a field of `UserStats`, computed per FR-DATA-04. "90d window" =
events in the trailing 90 days available from the events endpoint.

| ID          | Metric                     | Definition / source                                                          | Status   |
| ----------- | -------------------------- | ---------------------------------------------------------------------------- | -------- |
| FR-METRIC-01 | Total stars               | Sum of `stargazers_count` across all repos                                   | shipped  |
| FR-METRIC-02 | Total forks received      | Sum of `forks_count` across all repos                                        | shipped  |
| FR-METRIC-03 | Followers                 | `followers` from profile                                                     | shipped  |
| FR-METRIC-04 | Original repos            | Count of repos where `fork == false`                                         | shipped  |
| FR-METRIC-05 | Language diversity        | Count of distinct non-null `language` values across repos                    | shipped  |
| FR-METRIC-06 | Account age (years)       | Whole years between `created_at` and today                                   | shipped  |
| FR-METRIC-07 | Commit activity (90d)     | Count of `PushEvent` in the events window                                    | shipped  |
| FR-METRIC-08 | PR activity (90d)         | Count of `PullRequestEvent` in the events window                             | shipped  |
| FR-METRIC-09 | Issue activity (90d)      | Count of `IssuesEvent` in the events window                                  | shipped  |
| FR-METRIC-10 | Releases (90d)            | Count of `ReleaseEvent` in the events window                                 | shipped  |
| FR-METRIC-11 | Public gists              | `public_gists` from profile                                                  | shipped  |
| FR-METRIC-12 | Total watchers            | Sum of `watchers_count` across all repos                                     | shipped  |
| FR-METRIC-13 | Code volume (KB)          | Sum of repo `size` across all repos                                          | shipped  |
| FR-METRIC-14 | Following                 | `following` from profile                                                     | shipped  |
| FR-METRIC-15 | Forked repos count        | Count of repos where `fork == true`                                          | shipped  |

### User stats view (capability `user-stats`)

| ID          | Description                                                                                                             | Status   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-STATS-01 | `/stats/[username]` fetches the user's data (FR-DATA-01) and renders profile: avatar, name, login, bio, location, links | shipped  |
| FR-STATS-02 | All fifteen metrics (FR-METRIC-01..15) are rendered as labelled cards with their values                                 | shipped  |
| FR-STATS-03 | Cards animate in on load (staggered fade/slide); animation respects `prefers-reduced-motion` (NFR-A11Y-03)              | shipped  |
| FR-STATS-04 | The username lives in the route path so the view is a shareable URL; deep-linking to `/stats/{u}` loads directly        | shipped  |
| FR-STATS-05 | Loading state shows a skeleton with the same footprint as the loaded layout; no layout shift on data arrival            | shipped  |

### Language breakdown (capability `user-stats`)

| ID         | Description                                                                                                       | Status   |
| ---------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| FR-LANG-01 | Render a language-breakdown chart (share of repos per primary `language`) for the user                            | shipped  |
| FR-LANG-02 | Languages are ranked by count; a "count / share" tooltip is available; repos with null language are excluded       | shipped  |
| FR-LANG-03 | Language legend/segments use GitHub's own per-language colors (color dots, per the design system); other chart accents use the DS accent/track tokens; WCAG AA in both themes (NFR-A11Y-02) | shipped  |

### Battle view (capability `battle`)

| ID           | Description                                                                                                                        | Status   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-BATTLE-01 | `/battle/[user1]/[user2]` fetches both users **in parallel** (FR-DATA-01) and lays them out side-by-side                          | shipped  |
| FR-BATTLE-02 | The fifteen metrics reveal sequentially with a short stagger between rows; each row shows both users' values for that metric        | shipped  |
| FR-BATTLE-03 | For each metric, the higher value is highlighted as that round's winner; a tie on a metric highlights neither and is marked a draw  | shipped  |
| FR-BATTLE-04 | After the rounds, an animated counter tallies each user's total score; the overall winner is announced with a banner                | shipped  |
| FR-BATTLE-05 | Both usernames live in the route path so a battle is a shareable URL; deep-linking to `/battle/{u1}/{u2}` runs the battle directly | shipped  |
| FR-BATTLE-06 | If one user fails to load (404/rate-limit), the battle degrades to an explicit per-side error state, not a crash (FR-DATA-05/06)    | shipped  |
| FR-BATTLE-07 | The reveal sequence collapses to an instant, non-animated result when `prefers-reduced-motion` is set (NFR-A11Y-03)                | shipped  |

### Scoring (capability `battle`)

| ID          | Description                                                                                                        | Status   |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-SCORE-01 | `scoreBattle(a: UserStats, b: UserStats): BattleResult` is a **pure function** in `lib/scoring/battle.ts`          | shipped  |
| FR-SCORE-02 | For each of the fifteen metrics, the higher value scores 1 point; an exact tie scores 0.5 to each; total is out of 15 | shipped  |
| FR-SCORE-03 | The result names a winner, or a `draw` when totals are equal; per-metric outcomes are included for the UI to render | shipped  |
| FR-SCORE-04 | Scoring direction is "higher is better" for all fifteen metrics; this assumption is documented in the function      | shipped  |

## Non-functional requirements

| ID          | Description                                                                                                     | Status   |
| ----------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| NFR-PERF-01 | Vercel Preview TTFB ≤ 300 ms on p95 for the landing page                                                        | proposed |
| NFR-PERF-02 | Lighthouse Performance ≥ 90 on the production URL (mobile + desktop)                                            | proposed |
| NFR-PERF-03 | Initial client JS payload ≤ 200 KB gzipped                                                                      | proposed |
| NFR-A11Y-01 | Lighthouse Accessibility ≥ 95; all interactive elements have visible focus styles and accessible names          | proposed |
| NFR-A11Y-02 | Color palette meets WCAG AA contrast across light and dark themes                                               | proposed |
| NFR-A11Y-03 | All motion respects `prefers-reduced-motion`, falling back to instant/static states                             | proposed |
| NFR-COST-01 | Zero paid API keys; all data is from the keyless public GitHub REST API                                         | shipped  |
| NFR-OBS-01  | Console is silent at runtime (no warnings, no errors) on a healthy session                                      | proposed |
| NFR-DX-01   | `npm run lint && tsc --noEmit && npm test && npm run build` finish in < 60 s on a clean checkout                 | shipped  |
| NFR-RATE-01 | The app minimizes GitHub calls (parallel fetch, session cache) to stay within the 60 req/h unauthenticated limit | shipped  |
| NFR-I18N-01 | UI strings are centralised in a single module; no runtime i18n library in MVP                                   | proposed |

## Technical constraints

| ID           | Description                                                                                                                             | Status   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TC-STACK-01  | Next.js 16.2 App Router; TypeScript strict; React 19.2                                                                                  | accepted |
| TC-STACK-02  | Tailwind CSS 4 (PostCSS plugin); shadcn/ui ("new-york" style, warm-neutral theme); class-variance-authority                            | accepted |
| TC-STACK-03  | GitHub REST API (`api.github.com`), unauthenticated; no other data provider                                                            | accepted |
| TC-STACK-04  | Animations use CSS keyframes/transitions from the design system (`ds-fade-up`, `ds-pop`, `ds-win-pulse`, `ds-confetti-fall` in `app/tokens/effects.css`); **no animation library** (Framer Motion dropped) | accepted |
| TC-STACK-05  | Charts are built from CSS per the design system (conic-gradient donut, flex bar columns) via the DS chart components (LanguageDonut / ActivityChart / ReachBar / RepoSplit); **no chart library** (Recharts dropped) | accepted |
| TC-FONT-01   | Typography per the design system: Newsreader (serif — display, headings, numbers), Geist (sans — UI/body), Geist Mono (incidental numerics); loaded **self-hosted via `next/font/google`** (no runtime Google Fonts request — supports BC-PRIVACY-01) | accepted |
| TC-STACK-06  | Vitest for unit tests on `lib/` (metric aggregation + scoring); E2E verification via the `verify` skill / browser recordings           | accepted |
| TC-DEPLOY-01 | Vercel for hosting; preview URL per PR via Git integration                                                                             | accepted |
| TC-DATA-01   | GitHub calls run from Server Components / Route Handlers where possible; no secrets in the client bundle (there are none — public API) | accepted |
| TC-PURE-01   | `lib/` is framework-free: no `next/*`, no `react`, no DOM globals — enabling 100% unit-testability of metrics and scoring               | accepted |
| TC-NEXT-01   | This is Next.js 16 with breaking changes vs. common training data; consult `node_modules/next/dist/docs/` before writing code (AGENTS.md) | accepted |

## Business / UX constraints

| ID            | Description                                                                                                | Status   |
| ------------- | ---------------------------------------------------------------------------------------------------------- | -------- |
| BC-PRIVACY-01 | No analytics, no third-party trackers, no fingerprinting                                                   | accepted |
| BC-PRIVACY-02 | No cookies set by the application code; only already-public GitHub data is read                            | accepted |
| BC-BRAND-01   | Calm, consistent visual identity per the design system (`DESIGN.md` / `design-system/`): warm-neutral stone ground with terracotta + sage accents, serif-led numbers, purposeful motion | accepted |
| BC-BRAND-02   | Footer credits the GitHub REST API with a hyperlink                                                        | proposed |
| BC-BRAND-03   | Near-iconless by design: no icon font or SVG icon set. Only marks are the ⚔ logo glyph (terracotta→sage gradient lockup) and 🌙/☀️ on the theme toggle; no emoji in copy. New UI icons require a documented thin-stroke CDN set (e.g. Lucide) | accepted |
| BC-DEMO-01    | The repo and live URL are the workshop's primary artifacts; every requirement is publicly demonstrable      | accepted |

## Out of scope (MVP)

- Authenticated mode / personal access token (higher rate limit, GraphQL contribution calendar)
- Persisted history, favorites, or saved battles
- More than two combatants; team / organization battles
- Server-side caching or a backend proxy
- Localisation beyond the shipped label set
- Metrics requiring GraphQL or scraping (contribution heatmap, private contributions)
