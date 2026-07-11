<!-- Authored before code (spec-first): every task is unchecked. The pure metric functions and their
     unit tests (sections 1-4) go RED first; the read repositories, service, and endpoints (sections
     5-6) follow. This slice adds NO Alembic migration — metrics read slice 003's existing tables. -->

## 1. Core scaffolding and day attribution (pure, framework-free)
- [ ] 1.1 Reuse or define the `SessionData` / `PauseData` dataclasses in `app/core/model.py` (net/gross derivation reused from slice 003's core, architecture §2.2) — no framework imports
- [ ] 1.2 `app/core/metrics/days.py`: user-timezone day attribution with the **midnight split** (net minutes across local days, pauses subtracted from the day they occur in), the whole-entity / whole-deep-block rule, and active-day classification (`>= 1` attributed minute), per §3.7
- [ ] 1.3 Write RED unit tests for `days.py` **first**, each with an `@trace FR-METR-07` docstring: minute-split across two local days (E-3), deep block whole on its start day (E-3), timezone-boundary correct local day (E-4), active-day threshold — fixture-driven, no DB

## 2. Pure metric functions M1-M6 (test-first, one module + its RED tests each)
- [ ] 2.1 `app/core/metrics/m1_volume.py` (§3.1) + RED tests `@trace FR-METR-01`: today/week/month/all-time net sums, `daily_avg_30d` with zero days in the denominator, net-excludes-pauses, empty history -> zeros (E-1)
- [ ] 2.2 `app/core/metrics/m2_consistency.py` (§3.2) + RED tests `@trace FR-METR-02`: 50/50 blend, CV regularity with zero days included, `+/-60 min` start-stability, `null` + low-confidence below 3 active days (E-2), empty window -> null (E-1)
- [ ] 2.3 `app/core/metrics/m3_focus.py` (§3.3) + RED tests `@trace FR-METR-03`: exactly-60-min zero-pause is deep (E-5, inclusive), a short pause disqualifies (E-6), sub-60 not deep, `deep_share` denominator = window net minutes and `0` on empty denominator
- [ ] 2.4 `app/core/metrics/m4_switching.py` (§3.4) + RED tests `@trace FR-METR-04`: `switches + interruptions = switch_load`, the `max(3, 1.5 * baseline)` flag (strictly-greater boundary), the `max(3, ...)` floor, a pause counts as an interruption (E-6)
- [ ] 2.5 `app/core/metrics/m5_streaks.py` (§3.5) + RED tests `@trace FR-METR-05`: current streak through today, untracked-today does not break it, longest over history, empty -> `0/0` (E-1)
- [ ] 2.6 `app/core/metrics/m6_baseline.py` (§3.6) + RED tests `@trace FR-METR-06`: `delta`/`rel`, per-metric direction (higher/lower-better) normalization, zone boundaries at `-0.05` (green) / `-0.20` (yellow) / below (red), `neutral` when baseline = 0, `building` under 7 days (E-2, E-7), and deltas computed on available history for 7-29 days (E-7)

## 3. Heatmap aggregation (pure) + tests
- [ ] 3.1 Heatmap bucketing over `days.py` daily totals (§3.9): level 0 = 0 min; levels 1-4 = p25/p50/p75 quartiles of the user's non-zero daily totals; self-normalizing per user and period; period selector week / month / quarter / 6 months / year (§3.9, FR-HEAT-02)
- [ ] 3.2 RED tests `@trace FR-HEAT-01` / `@trace FR-HEAT-02`: level-0 for zero days, quartile bucketing, per-user/per-period normalization, period re-normalization (week vs year), empty period -> all level 0 (E-1), midnight session shades both days (E-3)

## 4. Snapshot assembler (pure) + tests
- [ ] 4.1 `app/core/snapshot.py`: assemble the architecture §4.1 JSON, extended per the ratified additions (`window`, `volume` incl. `all_time_min`, `consistency`, `focus`, `switching`, `streaks`, `baselines`, `top_categories` incl. category `id`/`color`, `per_category_per_day`) from the M1-M6 functions — **only computed fields**, no raw session rows
- [ ] 4.2 RED tests `@trace NFR-DET-01`: snapshot shape matches the (extended) §4.1, contains only computed fields, empty-history snapshot is well-formed (E-1), and determinism (identical input computed twice is identical)
- [ ] 4.3 `per_category_per_day` in the snapshot assembler: regroup the reporting range's net minutes by category and local day, reusing the §3.7 attribution already computed for `volume.per_day` (no new data) — each entry carries `id`/`name`/`color` (mirrors `top_categories`); archived categories with window time still appear (§7). Serves the slice-005 per-category line chart (FR-STATS-04) + RED tests `@trace NFR-DET-01`: grouping matches per-category/day totals, archived category appears, empty history -> empty list (E-1)

## 5. Read repositories (user_id-scoped, reuse slices 001/002/003 — no schema change)
- [ ] 5.1 Read-only user_id-scoped access to `sessions` + `pause_segments` for a user over a date range; map rows to the core `SessionData` / `PauseData` dataclasses. Reuse slice 003's repositories; if a bulk read method is missing, add a **new** read-only method in a new module without editing slice 003's write path (cross-slice overlap rule). **No Alembic migration** — this slice reads existing tables
- [ ] 5.2 Read-only access to the caller's categories (`id`, `name`, `color`, `archived_at`) reusing slice 002's category repository (no schema change); archived categories are included, not filtered, per §7 — needed to resolve `top_categories` and `per_category_per_day` identity

## 6. Stats service + API (read-only, behind `CurrentUser`)
- [ ] 6.1 Stats service: load the caller's user_id-scoped rows (sessions, pause segments, categories) -> core dataclasses -> call `snapshot` / heatmap -> return; read the caller's `users.timezone` for attribution (§3.7)
- [ ] 6.2 `GET /api/stats/snapshot` -> the §4.1 JSON (delivers FR-METR-01..07); `200`
- [ ] 6.3 `GET /api/stats/heatmap?period=<week|month|quarter|6mo|year>` -> the bucketed day grid; `200` (FR-HEAT-01/02)
- [ ] 6.4 Pydantic response models mirroring §4.1; a happy-path contract test per endpoint and a per-user isolation test (user A never sees user B's data, FR-AUTH-07); register the router on `app/main.py` (append only)

## 7. Verify (green)
- [ ] 7.1 `scripts/verify.*` fully green: ruff, mypy, `alembic upgrade head` (no new migration — confirm it is a no-op against slice 003's schema), pytest with `RUN_DB_TESTS=1`, and the frontend build
- [ ] 7.2 `openspec validate add-metrics --strict` passes; `check-traceability` shows the FR-METR-*/FR-HEAT-* ids GAP -> COVERED via the `@trace` docstrings

## 8. Review and done (maker != checker != judge)
- [ ] 8.1 Independent `/code-review` + `/security-review` (per-user isolation on every read; the snapshot leaks no raw session row; no secrets) plus CodeRabbit on the PR
- [ ] 8.2 Judge scores the change against the acceptance scenarios and marks the slice done; then `openspec archive add-metrics`
