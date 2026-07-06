# Product Brief — GitHub Battle / Developer Stats Explorer

> Companion to `docs/requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the narrative behind it. The product
> is keyless and privacy-light: it reads only public GitHub data, sets no cookies,
> and needs no account (BC-DEMO-01, BC-PRIVACY-01).

## What this is

GitHub Battle is a keyless web app that turns public GitHub activity into an
interactive experience. A visitor can **explore** a full stats profile for any
GitHub user, or **battle** two users head-to-head: their profiles line up
side-by-side, fifteen metrics reveal one at a time with the round winner
highlighted, an animated counter tallies the score, and a winner is declared.
It runs entirely on the public, unauthenticated GitHub REST API — no token, no
backend, no database.

## Who it is for

The single actor is an **anonymous visitor** curious about GitHub activity —
their own, a friend's, or two accounts pitted against each other. There are no
roles, no sign-in, and no stored profile. The visitor arrives, types one or two
usernames, explores, and leaves; nothing about them is persisted. Anyone who can
open the live URL is a full user — the repo and the live URL are the workshop's
primary, publicly demonstrable artifacts (BC-DEMO-01).

## The pain it addresses

GitHub's own profile pages answer "what has this person done" only shallowly, and
they offer no way to **compare** two developers at a glance or to see aggregate
signals (total stars across all repos, recent commit cadence, language breadth)
without clicking through repo by repo. Comparing two people means opening two
tabs and eyeballing numbers that are never shown together.

This product reduces that to a focused flow. A visitor picks a mode, enters a
username (or two), and gets either a single clean stats dashboard or a scored,
animated head-to-head — the aggregate picture GitHub never surfaces directly.

## End-to-end usage

1. **Land.** On first load the visitor sees a landing screen with a mode toggle:
   **View Stats** (one username input) and **Battle** (two username inputs)
   (FR-LAND-01/02). There is no default user and nothing is fetched until the
   visitor acts.
2. **Enter usernames.** The visitor types a GitHub username into the active
   mode's input(s) (FR-LAND-03). On submit, each username is validated for
   existence against the GitHub API before any navigation (FR-LAND-04). If a
   username does not exist (HTTP 404), its input is highlighted in red with an
   inline "User not found" message and navigation is blocked; in Battle mode only
   the offending input is flagged, and both are checked in parallel
   (FR-LAND-05/06). Navigation proceeds only when every entered username resolves.
3. **Explore one user.** Selecting **View Stats** routes to `/stats/[username]`,
   which fetches that user's public data and renders profile info (avatar, name,
   bio, location, links) plus all fifteen metrics as cards, and a language
   breakdown chart across their repositories (FR-STATS-01/02/03, FR-LANG-01).
4. **Read the fifteen metrics.** The same fifteen aggregate metrics power both
   views: total stars, total forks received, followers, original (non-fork) repos,
   language diversity, account age, and — over a recent 90-day window — commit,
   pull-request, issue, and release activity, plus public gists, total watchers,
   code volume, following count, and forked-repo count (FR-METRIC-01..15). Each is
   computed by a pure function in `lib/` from the GitHub responses (FR-DATA-04).
5. **Battle two users.** Selecting **Battle** routes to
   `/battle/[user1]/[user2]`, which fetches both users in parallel and lays them
   out side-by-side (FR-BATTLE-01). The fifteen metrics reveal sequentially with a
   short stagger; for each metric the higher value is highlighted as that round's
   winner (FR-BATTLE-02/03). A pure scoring function awards one point per metric to
   the higher value and 0.5 to each on a tie, out of fifteen (FR-SCORE-01/02).
6. **See the verdict.** An animated score counter tallies each side's total, and
   the overall winner is announced with a banner; a tie is announced honestly as a
   draw (FR-BATTLE-04, FR-SCORE-03).
7. **Share a view.** Because the active user(s) live in the route path
   (`/stats/octocat`, `/battle/torvalds/gaearon`), any view is a shareable URL —
   the recipient opens the same stats or battle with no setup and no account
   (FR-STATS-04, FR-BATTLE-05).

## Key workflows in prose

- **Explore one developer.** Land, pick View Stats, type a username, and read the
  full aggregate dashboard GitHub never shows in one place. The core single-user
  loop.
- **Head-to-head battle.** Pick Battle, type two usernames, and watch the fifteen
  rounds reveal and the score climb to a declared winner. The signature
  interactive loop and the reason the product exists.
- **Guarded entry.** Before either loop, a nonexistent username is caught at the
  door with an inline red flag rather than a broken downstream page — the visitor
  fixes the typo and continues.
- **Share a result.** Copy the URL of a stats page or a battle and send it; the
  recipient sees the identical view, recomputed from live public data.

## MVP vs Future boundary

**In the MVP:** the landing screen with the View Stats / Battle mode toggle and
inputs; username existence validation with inline error highlighting before
navigation; the single-user stats page with profile info, all fifteen metrics,
and a language-breakdown chart; the battle page with parallel fetch, sequential
metric reveal, per-metric winner highlighting, animated score counter, and winner
banner; the fifteen pure metric functions and the pure scoring function; graceful
handling of not-found and rate-limit responses — all keyless, all client-safe
public data.

**Future (deferred):**

- Authenticated mode with a personal access token to raise the rate limit and
  unlock the contribution calendar (GraphQL) — out of scope for MVP.
- Persisted history, favorites, or saved battles.
- More than two combatants, or team/organization battles.
- Server-side caching or a backend proxy.
- Localisation beyond the shipped label set.
- Metrics requiring the GraphQL API or scraping (e.g. contribution heatmap,
  private contributions).

## Operating principles

- **Keyless and free.** No API keys; all data comes from the public,
  unauthenticated GitHub REST API (NFR-COST-01). The footer credits GitHub
  (BC-BRAND-02).
- **Privacy-light.** No analytics, no third-party trackers, no application-set
  cookies; the app reads only already-public GitHub data (BC-PRIVACY-01/02).
- **Honest under failure.** No external call produces a generic error page or a
  silent blank: a missing user is flagged inline, and an exhausted rate limit
  degrades to a calm, explicit message rather than a crash (NFR-OBS-01,
  FR-DATA-05).
- **Pure, testable core.** All aggregation and scoring live in framework-free
  `lib/` functions with unit tests, so the fifteen metrics and the winner are
  provable, not guessed (TC-PURE-01, FR-DATA-04).
- **Calm and consistent.** UI strings are centralised; the visual system is
  shadcn/ui with a warm-neutral theme; motion is purposeful and respects
  `prefers-reduced-motion` (BC-BRAND-01, NFR-A11Y-01).
