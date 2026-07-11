# 004 — Metrics engine & heatmap

- **Status:** ratified (owner-approved 2026-07-10; the OpenSpec change `add-metrics` is the
  machine-validated contract and passes `openspec validate --strict`. The five open questions were
  resolved at ratification and folded into the spec.)
- **Date:** 2026-07-10

## Contract (OpenSpec)

The detailed, machine-validated contract for this slice lives in OpenSpec as the `metrics` capability,
authored **before code** by the in-flight change
[`add-metrics`](../../openspec/changes/add-metrics/proposal.md) (proposal, spec deltas, design, tasks).
That change carries the GIVEN/WHEN/THEN scenarios — pinned to the formulas and thresholds in
[`architecture.md`](../architecture.md) §3 and §4.1 — and is checked by
`openspec validate --all --strict`.

This file is the thin anchor for the Python traceability harness (`scripts/check-traceability`): the
`Requirements covered` ids below are what the harness maps to `@trace` tests. Per the specs<->OpenSpec
bridge decision in [`openspec/README.md`](../../openspec/README.md), the detailed contract is not
duplicated here.

## Problem / goal

Slice 003 persists saved sessions and their pause segments but computes no numbers. This slice adds the
**pure, deterministic metrics engine** (NFR-DET-01) — M1 Volume, M2 Consistency, M3 Focus/Deep Work,
M4 Context Switching, M5 Streaks, and M6 baseline deltas/zones — plus the activity-heatmap day buckets
and the architecture §4.1 snapshot, exposed read-only via `GET /api/stats/snapshot` and
`GET /api/stats/heatmap`. It computes on read over slice 003's tables (no schema, no migration), reuses
the slice 001 per-user boundary (FR-AUTH-07), and consumes the browser-detected `users.timezone` (A-1)
for day attribution. It is the backend the Stats UI (slice 005) and the AI coach (slice 006) will build
on.

## Requirements covered

Cited by ID only — [`docs/requirements.md`](../requirements.md) is the single source of truth; this
anchor does not restate requirement text.

- **Functional:** FR-METR-01, FR-METR-02, FR-METR-03, FR-METR-04, FR-METR-05, FR-METR-06, FR-METR-07,
  FR-HEAT-01, FR-HEAT-02.

Reused and applied qualities (per-user isolation, determinism, and the compute-on-read budget) plus the
slice 003 input are described in the Problem / goal prose above and are intentionally omitted from this
list, so the traceability / trajectory harness attributes each requirement id to its single owning
slice.

## Out of scope

Listed areas belong to other slices; this slice must not implement them.

- **The Stats UI** — summary tiles, per-metric **score cards**, and the bar / donut / line charts
  (FR-STATS-*, DESIGN §7.3) — slice 005. This slice returns JSON only.
- **The heatmap UI** — the calendar rendering and the period-toggle control (DESIGN §7.2) — slice 005.
  This slice computes the buckets and the period-scoped endpoint, not the visual grid.
- **The AI coach** (FR-COACH-*, architecture §4.2-§4.5) — slice 006. This slice *produces* the §4.1
  snapshot but makes no LLM call and runs no grounding validator (§4.4).
- **Live-sync transport** — the 5-second `GET /api/sync/state` poll (architecture §5, NFR-DATA-01) —
  slice 007.
- **No new schema or migration** — metrics read slice 003's `sessions` + `pause_segments` and slice
  002's `categories` unchanged.
