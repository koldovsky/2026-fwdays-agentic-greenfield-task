## Why

Cadence's promise is baseline-relative feedback on a user's *own* rhythm — Volume, Consistency,
Focus, Context-switching, and Streaks, each scored against the user's trailing baseline (M1-M6).
Slice 003 now persists the raw material (saved `sessions` and discrete `pause_segments`); nothing yet
turns that material into numbers. This change adds the pure metrics engine that computes M1-M6 and the
activity-heatmap day buckets over a user's sessions, assembles the architecture §4.1 snapshot, and
exposes both as read-only JSON endpoints. It is the last backend layer before the Stats UI (slice
005) and the AI coach (slice 006) can exist: the Stats screen renders these numbers, and the coach is
later constrained to cite only the snapshot's computed fields.

Authored **before any code** (spec-first, per [`openspec/README.md`](../../README.md)): this is the
ratified contract the implementation is built against. It follows architecture §3 (every metric
formula, window, and threshold — authoritative and referenced, never re-derived here), §4.1 (the
snapshot schema this slice produces), and §1 / §9 (`app/core` is framework-free and pure, satisfying
NFR-DET-01). It **reads** slice 003's tables and reuses slice 001's per-user boundary; it re-computes
nothing slice 003 already stores and adds **no schema and no migration**.

## What Changes

- Compute **M1 Volume**: net minutes for `today`, `this_week`, `this_month`, `all_time`, plus the
  trailing-30-day daily average (zero days in the denominator), per architecture §3.1. **FR-METR-01**
- Compute **M2 Consistency** on 0-100 over a trailing 14-day window as a 50/50 blend of CV-based
  regularity (zero days included) and start-time stability (share within +/-60 min of the median
  first-start), reporting `null` + low-confidence below 3 active days, per §3.2. **FR-METR-02**
- Compute **M3 Focus / Deep Work**: `deep_count`, `deep_minutes`, and `deep_share` where a deep block
  is a single session of `>= 60 min` **net** with **zero** pauses (inclusive boundary; any pause
  disqualifies), share denominator = window net minutes, per §3.3. **FR-METR-03**
- Compute **M4 Context Switching**: per-day `switches` + `interruptions` = `switch_load`, flagging a
  day when `switch_load > max(3, 1.5 * baseline_mean)`, per §3.4. **FR-METR-04**
- Compute **M5 Streaks**: `current_streak` (consecutive active days ending today or yesterday) and
  `longest_streak`, per §3.5. **FR-METR-05**
- Report **M6 baseline deltas and zones** for the **four** zoned scores (volume, consistency,
  focus_share, switch_load): a `value` + `delta` vs the trailing-30-day baseline ending **yesterday**,
  zoned green / yellow / red at the §3.6 thresholds (per-metric direction), degrading to a `building`
  zone under 7 days of history (§3.8); M5 Streak is reported unzoned. **FR-METR-06**
- **Attribute** tracked time to days in the user's timezone, **splitting** a session's net minutes
  across the local days it spans while keeping the entity — and any deep block — whole and attributed
  to its start day, per §3.7. **FR-METR-07**
- Aggregate the **heatmap**: bucket each day's net minutes into 5 GitHub-style intensity levels
  (level 0 = 0 min; levels 1-4 = quartiles of the user's non-zero daily totals), per §3.9.
  **FR-HEAT-01**
- Support the **heatmap period** — `week|month|quarter|6mo|year`, defaulting to `month` when omitted —
  re-normalizing the buckets per selected period on the `GET /api/stats/heatmap` endpoint. **FR-HEAT-02**
- Assemble the metrics into the architecture **§4.1 snapshot**, extended with three owner-approved
  additive fields surfaced by slice-005 planning — `volume.all_time_min` (M1's `all_time`, already
  computed), category **identity** (`id` + `color`, not just `name`) on `top_categories`, and a new
  `per_category_per_day` series (net minutes by category and local day, regrouping the same §3.7
  attribution as `volume.per_day`) — and expose it read-only at `GET /api/stats/snapshot` (optional
  `window`: default current week, else the requested range — M2 and the M6 baselines keep their fixed
  windows); every metric is a **deterministic pure function** in the framework-free `app/core` layer
  and the snapshot contains **only computed fields** (no raw session rows), with `top_categories` = the
  top 5 by current-week net minutes (tie-broken by name). **NFR-DET-01** (the snapshot delivers
  **FR-METR-01..07** as one artifact, serving the slice-005 all-time tile and per-category line chart,
  FR-STATS-01/FR-STATS-04)
- **Reuse** — do not re-implement — the slice 001 `CurrentUser` dependency and user_id-scoped
  repository pattern (per-user isolation, **FR-AUTH-07**), and **read** slice 003's `sessions` +
  `pause_segments` unchanged. **No new table and no Alembic migration** — metrics compute on read
  (architecture §1: "compute on read, no precomputed aggregates").

## Capabilities

### New Capabilities
- `metrics`: the pure, deterministic engine that computes M1-M6 and the heatmap day buckets over a
  user's saved sessions and pause segments, assembles the architecture §4.1 snapshot, and serves both
  through `GET /api/stats/snapshot` and `GET /api/stats/heatmap`. This one slice-level capability
  bundles the `metrics` (M1-M6) and `heatmap` requirement groups of
  [`docs/requirements.md`](../../../docs/requirements.md), delivered together as one backend slice.

### Modified Capabilities
<!-- None. `metrics` is a new capability. It reuses the `auth` capability (CurrentUser +
     user_id-scoped repos, FR-AUTH-07) and reads the `timer-sessions` capability's tables
     (`sessions`, `pause_segments`) without modifying either. -->

## Impact

- **Requirements** (authoritative text in [`docs/requirements.md`](../../../docs/requirements.md)):
  FR-METR-01..07, FR-HEAT-01, FR-HEAT-02; applies NFR-DET-01 (pure/deterministic) and NFR-PERF-01
  (compute-on-read budget, §1); reuses FR-AUTH-07 (per-user isolation), slice 003's saved sessions and
  pause segments, and slice 002's categories (`id`/`name`/`color`, including archived) as read-only
  input.
- **Endpoints** (architecture §10), both read-only and behind `CurrentUser`:
  `GET /api/stats/snapshot?window=` (the §4.1 JSON, extended per the ratified additions) and
  `GET /api/stats/heatmap?period=` (the bucketed day grid).
- **Backend / no migration:** new **pure, framework-free** modules under `app/core/metrics/`
  (`m1_volume.py` .. `m6_baseline.py`, `days.py` for §3.7 attribution, heatmap bucketing, and the
  `per_category_per_day` regrouping) and `app/core/snapshot.py` (assembles the extended §4.1 shape); a
  thin `app/services` stats use-case that loads user_id-scoped rows via read-only repository access —
  sessions and pause segments (slice 003) plus categories (slice 002, for `id`/`name`/`color`,
  including archived) — maps them to the core `SessionData` / `PauseData` dataclasses, calls core, and
  returns the result; and the `app/api` stats router with its Pydantic response models. **No Alembic
  migration** — this slice reads slice 002's and slice 003's existing tables and introduces no schema
  (architecture §1).
- **Tests:** pure `app/core` unit tests with fixture session lists — the E-1..E-7 edge cases live here
  (architecture §9 test seams) — plus a happy-path contract test per endpoint and a per-user isolation
  test; each acceptance test carries an `@trace <FR-ID>` docstring so `check-traceability` goes
  GAP -> COVERED.
- **Docs:** the thin anchor [`docs/specs/004-metrics.md`](../../../docs/specs/004-metrics.md) links to
  this change for the Python traceability harness (specs<->OpenSpec bridge,
  [`openspec/README.md`](../../README.md)).

## Out of scope

Belongs to later slices; this change must not implement it.

- **The Stats UI** — summary tiles, per-metric **score cards**, and the bar / donut / line charts
  (FR-STATS-*, DESIGN §7.3) — slice 005. This slice returns the computed numbers as JSON only; it
  renders nothing.
- **The heatmap UI** — the calendar rendering and the period-toggle *control* on the Timer home
  (DESIGN §7.2) — belongs to the **timer slice**, not the Stats UI (slice 005): DESIGN §7.2 is the
  Timer-home screen (FR-TIMER-*, FR-HEAT-*), a different slice than Stats (DESIGN §7.3,
  FR-STATS-*/FR-METR-*). This slice (004) only computes the buckets and serves the period-scoped
  endpoint, not the visual grid or its toggle, regardless of which slice number later claims that UI.
- **The AI coach** (FR-COACH-*, architecture §4.2-§4.5) that consumes the snapshot — slice 006. This
  slice **produces** the §4.1 snapshot but performs no LLM call, no memory assembly, and no grounding
  validation (§4.4).
- **Live-sync transport** — the 5-second `GET /api/sync/state` poll and the `changes_cursor`
  (architecture §5, NFR-DATA-01) — slice 007. Metrics are computed on read, per request.
- **No new tables, columns, or migration.** Metrics read slice 003's `sessions` + `pause_segments`
  and slice 002's `categories` unchanged; the `users.timezone` value (browser-detected, A-1) is
  consumed, not set, here.
