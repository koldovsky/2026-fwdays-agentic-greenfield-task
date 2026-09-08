# 005 — Stats UI

- **Status:** ratified
- **Date:** 2026-07-10

## Contract (OpenSpec)

The detailed, machine-validated contract for this slice lives in OpenSpec as the `stats-ui`
capability, authored **before code** by the in-flight change
[`add-stats-ui`](../../openspec/changes/add-stats-ui/proposal.md) (proposal, spec deltas, design,
tasks). That change carries the GIVEN/WHEN/THEN scenarios and is checked by
`openspec validate --all --strict`.

This file is the thin anchor for the Python traceability harness (`scripts/check-traceability`): the
`Requirements covered` ids below are what the harness maps to `@trace` tests. Per the specs<->OpenSpec
bridge decision in [`openspec/README.md`](../../openspec/README.md), the detailed contract is not
duplicated here.

## Problem / goal

Slice 004 computes the metrics and serves the architecture §4.1 snapshot, but nothing renders it. This
slice adds the Stats page that **renders** that snapshot — summary tiles, per-metric score cards
(value + zone color + baseline delta, with the <7-day "building" state), and the bar-by-day /
donut-by-category / per-category line charts — and composes the slice-003 session-log component onto
the page. It renders only: no metric is recomputed, and it adds no backend endpoint or migration.

## Requirements covered

Cited by ID only — [`docs/requirements.md`](../requirements.md) is the single source of truth; this
anchor does not restate requirement text. **Owned ids only** (the harness reads every id here as an
ownership claim).

- **Functional:** FR-STATS-01, FR-STATS-02, FR-STATS-03, FR-STATS-04, FR-STATS-05.

## Consumes (seams)

This slice renders the **shipped** slice-004 snapshot — the contract is the real
`GET /api/stats/snapshot` payload (`backend/app/schemas/stats.py` `SnapshotResponse`), reconciled to
what slice 004 actually built, **not** an idealized §4.1. The quoted fields it reads:

- `volume.{today_min, week_min, month_min, all_time_min}` + `streaks.current` → summary tiles (FR-STATS-01)
- `volume.per_day: [{date, min}]` → bar-by-day (FR-STATS-02)
- `top_categories: [{id, name, color, week_min}]` → donut, colored by `color` keyed by `id` (FR-STATS-03)
- `per_category_per_day: [{id, name, color, per_day: [{date, min}]}]` (separate top-level block) → per-category line (FR-STATS-04)
- `baselines: {volume, consistency, focus_share, switch_load}` each `{value, delta, zone}` → four zoned score cards; `streaks.current` → a plain M5 card (FR-STATS-05)

**Seam test (real shape, not a mock):** one test asserts the TS types match `SnapshotResponse`
field-for-field, so producer/consumer drift fails a test rather than the integrated page.

**Not carried by the shipped snapshot** (degrade gracefully; captured as the
`metrics-snapshot-extension` follow-up, non-blocking): `baselines.streak` (→ plain streak card),
`history_days` (→ generic "building" chip, no day count), `top_categories[].archived` (→ archived
categories not greyed).

**Also consumed:** the slice-003 `SessionLog` component (`frontend/src/pages/Timer/SessionLog.tsx`) —
imported and mounted, not modified. Requires slice 003 to export it as a standalone component; if it
is not importable when this slice runs, this slice BLOCKS on slice 003 rather than editing its module.

## Out of scope

Listed areas belong to other slices; this slice must not implement them.

- **Metric computation** — every M1-M6 formula, window, threshold, zone, baseline, and the snapshot
  assembly (FR-METR-*, architecture §3-§4.1) — slice 004. This slice renders the snapshot and computes
  no number.
- **The AI coach and its drawer** (FR-SHELL-02, FR-COACH-*) — slice 006.
- **The live-poll transport** (5-second `GET /api/sync/state`, architecture §5, NFR-DATA-01) —
  slice 007. This slice fetches the snapshot once on view load.
- **The session log itself** (FR-SESS-03..06, FR-NOTIF-01) — slice 003; this slice composes that
  component, it does not build or modify it.
- **The activity heatmap UI** (FR-HEAT-01, FR-HEAT-02 — DESIGN §7.2, the Timer home) — a
  **dedicated later heatmap-ui slice** (slice 004 prepares the data plane without claiming the
  ids); and the **nav shell / three-route SPA** (FR-SHELL-01) — its own slice.
- **Any new backend endpoint, schema, or Alembic migration.**
