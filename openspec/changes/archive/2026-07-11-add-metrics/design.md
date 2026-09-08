## Context

`metrics` is the fourth capability, after the auth boundary (slice 001), categories (slice 002), and
the timer + sessions core loop (slice 003). It is authored before any code against
[`docs/requirements.md`](../../../docs/requirements.md) (FR-METR-01..07, FR-HEAT-01/02) and, for the
HOW, against **architecture §3** (every metric formula and threshold — authoritative), **§4.1** (the
snapshot schema this slice produces), **§3.7** (day attribution and the midnight split), **§3.8**
(sparse data), **§3.9** (heatmap buckets), and **§1 / §9** (`app/core` is framework-free and pure).
Where architecture already fixed a number, this design **references** it; genuine gaps are listed under
Open questions rather than invented.

This slice reads what slice 003 writes and turns it into numbers. Its input is the user's saved
`sessions` and their discrete `pause_segments`, slice 002's `categories` (for the `id`/`name`/`color`
identity now exposed on `top_categories` and `per_category_per_day`, §7), and the `users.timezone`
value (browser-detected per A-1); its output is M1-M6, the heatmap day buckets, and the §4.1 snapshot
(extended per the ratified additions below). Everything downstream reads what this slice computes: the
Stats UI (slice 005) renders the score cards and the heatmap grid, and the AI coach (slice 006) is
constrained to cite **only** the snapshot's computed fields. The single hardest obligation is therefore
correctness of the pure math — especially the timezone-aware day attribution — with **no** persistence
and **no** schema change of its own.

## Goals / Non-Goals

**Goals:**
- The deterministic pure computation of M1-M6 over a user's sessions and pauses, matching architecture
  §3 exactly (§3.1-§3.6), including day attribution and the midnight split (§3.7) and sparse-data
  degradation (§3.8).
- The heatmap day-bucket aggregation (§3.9) with per-user, per-period self-normalization and the
  period selector (week / month / quarter / 6 months / year).
- Assembly of the architecture §4.1 snapshot JSON containing only computed fields, extended with the
  three owner-approved additive fields below (`all_time_min`, category identity, `per_category_per_day`).
- Two read-only endpoints behind `CurrentUser`: `GET /api/stats/snapshot` and
  `GET /api/stats/heatmap`, each user_id-scoped.
- Reuse — never re-implement — the slice 001 `CurrentUser` + user_id-scoped repository pattern
  (FR-AUTH-07); read slice 002's and slice 003's tables unchanged.

**Non-Goals:**
- The Stats UI: summary tiles, score cards, and the bar / donut / line charts (FR-STATS-*, DESIGN
  §7.3) — slice 005. The heatmap's calendar rendering and period-toggle control live on the Timer-home
  screen (DESIGN §7.2, a different slice than Stats) — not slice 005 either.
- The AI coach (FR-COACH-*, §4.2-§4.5): no LLM call, no memory assembly, no grounding validator
  (§4.4). This slice only produces the snapshot the coach will later consume.
- Live-sync transport (`GET /api/sync/state`, the `changes_cursor`, §5) — slice 007.
- Any new table, column, or Alembic migration. Metrics compute on read.

## Decisions

- **`app/core/metrics/` is pure and framework-free (architecture §1, §9; NFR-DET-01).** Metric
  functions take plain dataclasses (`SessionData`, `PauseData`, the user's timezone, and `today`) and
  return plain values — no FastAPI, no SQLAlchemy, no I/O imports. Layout follows §9:
  `m1_volume.py` .. `m6_baseline.py`, `days.py` (the §3.7 attribution + active-day classification),
  the heatmap bucketing, and `snapshot.py` (assembles §4.1). This makes the E-1..E-7 edge cases
  unit-testable with fixture session lists and no database (§9 test seams).
- **Compute on read; no precomputed aggregates; no migration (architecture §1).** The stats service
  loads the caller's rows via user_id-scoped **read-only** repository access, maps them to the core
  dataclasses, calls core, and serializes the result. At personal scale (thousands of sessions) pure
  recompute keeps a single source of truth and satisfies NFR-PERF-01 trivially; caching is premature.
  Because nothing is stored, this slice ships **no** Alembic migration.
- **Formulas are taken verbatim from architecture §3 and referenced, not re-derived.** M1 §3.1; M2 the
  50/50 blend with zero days in CV and the +/-60 min start-stability band, `null` below 3 active days
  §3.2; M3 the inclusive `>= 60 min` zero-pause deep block and the window-net-minutes share denominator
  §3.3; M4 `switch_load = switches + interruptions` and the `max(3, 1.5 * baseline)` flag §3.4; M5
  §3.5; M6 the trailing-30-day-ending-yesterday baseline, per-metric direction, and the green/yellow/red
  thresholds §3.6. The spec scenarios pin the exact boundary values (`-0.05`, `-0.20`, exactly 60 min,
  the `max(3, ...)` floor) so a regression is a failing test, not a review opinion.
- **Day attribution splits minutes but keeps entities whole (architecture §3.7).** `days.py` converts
  each session's UTC span to the user's local time and distributes its net minutes across the local
  days it spans (pauses subtracted from the day they fall in); the session entity and any deep block
  stay whole and a midnight-spanning deep block is attributed to its **start day**. This is the
  subtlest code in the slice and the home of E-3 / E-4.
- **The snapshot is exactly architecture §4.1, plus three ratified additive extensions.**
  `snapshot.py` assembles `window`, `volume`, `consistency`, `focus`, `switching`, `streaks`,
  `baselines`, and `top_categories` — **only computed fields**, no raw rows. It is the single artifact
  both the Stats UI renders and the coach is later constrained to (§4.4 grounding); producing it here,
  closed and numeric, is what makes FR-COACH-02 mechanically enforceable in slice 006. The
  `GET /api/stats/snapshot` payload **is** this JSON.
- **Three owner-approved additive extensions to the §4.1 shape (surfaced by slice-005 planning).**
  (a) `volume.all_time_min` — M1 already computes `all_time` (§3.1); this exposes it. (b)
  `top_categories` entries now carry the category's `id` and `color` (slice 002 identity) alongside
  `name`/`week_min`, so the UI's chart color-join survives a rename or a duplicate name. (c)
  `per_category_per_day` — net minutes grouped by category and local day over the reporting range,
  built by regrouping the exact §3.7 attribution already computed for `volume.per_day`; each entry
  carries `id`/`name`/`color` like `top_categories`, plus its per-day series; an archived category with
  qualifying time still appears, consistent with `top_categories` and M4 (§7). All three are pure
  regroupings of data already computed here — no new formula, no new table (categories are read, not
  written), no migration. They extend, not contradict, §4.1; architecture.md's literal JSON example
  predates this ratified addition and should be updated to match when the owner next touches
  architecture.md.
- **Sparse data degrades, never crashes (architecture §3.8).** Baselines need a 7-day minimum; below
  it, `delta = null` and `zone = "building"`. M2 additionally needs >= 3 active days or reports
  `null`. Empty and single-session input (E-1, E-2) return well-defined zeros / nulls. These branches
  are first-class, not afterthoughts.
- **Per-user timezone from `users.timezone` (§3.7, A-1).** Attribution converts UTC to the user's
  single browser-detected timezone at read time. This slice **consumes** that column; detecting and
  refreshing it is auth's concern (A-1: no profile setting in v1).
- **Isolation by reuse (FR-AUTH-07).** Both endpoints take `CurrentUser`; every repository read takes
  `user_id` and scopes its query by it. No new isolation mechanism, and no repository **write** — this
  slice is read-only over slice 003's data.
- **HTTP contract.** `GET /api/stats/snapshot` -> `200` with the §4.1 JSON; `GET /api/stats/heatmap?
  period=<week|month|quarter|6mo|year>` -> `200` with the bucketed grid. Both require a valid session
  (`401` otherwise, reusing the slice 001 auth dependency) and are computed only over the caller's own
  data.

## Risks / Trade-offs

- **Compute-on-read cost.** Every request recomputes from raw rows. Architecture §1 budgets the full
  30-day snapshot at **< 500 ms** for 10k sessions; personal scale keeps this comfortable, and the
  pure functions are cache-ready later if a real profile shows a hotspot. Accepted; no caching now.
- **Timezone / DST correctness is the sharpest edge.** The split-at-local-midnight logic (§3.7) must
  be right across DST transitions and non-UTC offsets, or M1/M2/M5 and the heatmap all skew. Mitigated
  by making `days.py` pure and driving it with explicit E-3 / E-4 fixtures rather than "now".
- **Many null / building branches (§3.8).** The low-confidence paths (empty, single session, < 7 days,
  < 3 active days) multiply the state space; each must return a well-defined value. Mitigated by E-1 /
  E-2 / E-7 unit tests over every metric.
- **Depends on slice 003's schema.** This slice reads `sessions` + `pause_segments`; it can only land
  after slice 003's migration exists. It adds no migration itself, so `alembic upgrade head` is a
  no-op change for this slice — verify still runs it green against slice 003's schema.
- **Read-model coupling to slices 002 and 003.** Mapping rows to `SessionData` / `PauseData` reuses
  (does not fork) slice 003's read access; resolving category `id`/`name`/`color` for `top_categories`
  and `per_category_per_day` similarly reuses slice 002's category repository (including archived
  rows, §7) rather than forking it. If either slice exposes no read method shaped for these bulk reads,
  a new **read-only** user_id-scoped query is added here without touching the owning slice's write path
  (per the cross-slice overlap rule; new files, not edits to another slice's modules).

## Open questions

None. The five questions raised at authoring were **resolved by the owner at ratification** and applied
to the spec above: snapshot `window` is optional (current-week default, else the requested range, with
M2 and the M6 baselines staying fixed); the `baselines` block carries exactly the four zoned scores
(`volume`, `consistency`, `focus_share`, `switch_load`) with M5 Streak reported unzoned; the heatmap
`period` is one of exactly `week|month|quarter|6mo|year`, defaulting to `month`; `top_categories` is the
top 5 by current-week net minutes, tie-broken by name; and archived categories still count toward M4
switches and still appear in `top_categories` (§7).
