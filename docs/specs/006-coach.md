# 006 — AI coach (backend)

- **Status:** ratified
- **Date:** 2026-07-11

## Contract (OpenSpec)

The detailed, machine-validated contract for this slice lives in OpenSpec as the `coach` capability,
authored **before code** by the in-flight change
[`add-coach`](../../openspec/changes/add-coach/proposal.md) (proposal, spec deltas, design, tasks). That
change carries the GIVEN/WHEN/THEN scenarios and is checked by `openspec validate --all --strict`.

This file is the thin anchor for the Python traceability harness (`scripts/check-traceability`): the
`Requirements covered` ids below are what the harness maps to `@trace` tests. Per the specs<->OpenSpec
bridge decision in [`openspec/README.md`](../../openspec/README.md), the detailed contract is not
duplicated here.

## Problem / goal

Slice 004 computes the metrics **snapshot** and slice 005 renders it, but nothing yet turns those numbers
into coaching. This slice adds the **backend AI coach + its eval suite**: a single structured LLM call
over `(metrics snapshot + stored per-user conversation history)` that produces a fixed-shape **insight
card** for the current week and grounded **chat** replies; a pure, programmatic **grounding validator**
that makes "no fabricated number" (the product's core promise, FR-COACH-02 / E-9) a mechanical check;
**graceful degradation** on any model failure; and the committed **coach output-eval** rubric + fixture
cases + score files. It follows architecture **§4** (the coach/LLM contract — snapshot §4.1, output §4.2,
memory §4.3, grounding §4.4, provider/failure §4.5) and **§2.1** (the `coach_messages` / `coach_insights`
tables), taking every value verbatim. It **reuses** slice 001's per-user boundary (FR-AUTH-07, applied)
and the **shipped** slice-004 snapshot builder, and adds one Alembic migration for the two coach tables.
It renders nothing — the coach **drawer** (DESIGN §7.5, FR-SHELL-02) is a later shell slice. This mirrors
the 004-metrics(backend) -> 005-stats-ui(frontend) split.

## Requirements covered

Cited by ID only — [`docs/requirements.md`](../requirements.md) is the single source of truth; this
anchor does not restate requirement text. **Owned ids only** (the harness reads every id here as an
ownership claim).

- **Functional:** FR-COACH-01, FR-COACH-02, FR-COACH-03, FR-COACH-04, FR-COACH-05, FR-COACH-06, FR-COACH-07.

## Applied / reused (not owned)

Constraints this slice honors and boundaries it reuses — cited in prose only, and deliberately kept
**out of** `Requirements covered` so the harness never reads them as an ownership claim (a reused id there
is a dual-claim / MULTI trajectory violation):

- **Applied constraints (honored, not owned):** NFR-COST-01 (free-tier, no live LLM in the gate),
  NFR-REL-01 (log-and-degrade, never crash), NFR-DES-01 (no emoji in coach output), TC-LLM-01 (single
  structured call, `gemma-4-31b-it` -> `Gemini 3 Flash`), TC-STACK-02 (key via pydantic-settings).
- **Reused boundary:** the slice-001 per-user boundary — `CurrentUser` + user_id-scoped repos (FR-AUTH-07,
  owned by slice 001). See the OpenSpec proposal's Impact for the full applied list and architecture §4
  for the HOW.

## Consumes (seams)

This slice **reads** the **shipped** slice-004 snapshot — the contract is the real
`GET /api/stats/snapshot` payload (`backend/app/schemas/stats.py` `SnapshotResponse`), obtained via the
**same builder the UI uses**, `backend/app/services/stats.py::StatsService.get_snapshot(user_id=…,
window=None)` (which calls the pure `backend/app/core/snapshot.py::build_snapshot(...)`) — **not** the
illustrative architecture §4.1 sketch. The coach re-derives no number; the snapshot is the closed set of
numbers it may cite (FR-COACH-04). The real shape it reads:

- `window: {start: date, end: date, days: int}`
- `volume: {today_min, week_min, month_min, all_time_min: int, daily_avg_30d_min: float, per_day: [{date, min}]}`
- `consistency: {score: int|null, low_confidence: bool, regularity: float|null, start_stability: float|null, median_start_local: str|null}`
- `focus: {deep_count: int, deep_minutes: int, deep_share: float}`
- `switching: {per_day: [{date, switches, interruptions, switch_load, flagged}], baseline_mean: float}`
- `streaks: {current: int, longest: int}`
- `baselines: {volume, consistency, focus_share, switch_load}` each `{value: float, delta: float|null, zone: str}`
- `top_categories: [{id, name, color, week_min}]`
- `per_category_per_day: [{id, name, color, per_day: [{date, min}]}]`

**Seam test (real shape, not a mock):** one test asserts the coach's snapshot input matches
`SnapshotResponse` field-for-field (or loads the slice-004 snapshot fixture), so producer/consumer drift
fails a test rather than the integrated coach.

**Also consumed (reused, not modified):**

- **Auth** — `backend/app/api/deps.py::CurrentUser` guards both routes (401 without a valid session,
  FR-AUTH-06/07); the mutating POSTs also carry the reused CSRF guard `deps.py::require_csrf`. Every coach
  repository method takes `user_id` and scopes every query by it (FR-AUTH-07), like `backend/app/repos/*`.
- **Language** — `users.coach_language` (`en`/`uk`, default `en`; `backend/app/models/user.py`, created by
  slice 001) is **read** to pick the reply language (FR-COACH-06, A-7); it is not re-added or toggled here.
- **Config** — `backend/app/config.py::Settings.google_ai_api_key` (env `GOOGLE_AI_API_KEY`, already wired
  by the owner setup, with a placeholder in `backend/.env.example`) is the only source of the API key
  (TC-STACK-02); when it is `None`/empty the coach degrades to the fallback card (NFR-REL-01).

## Out of scope

Listed areas belong to other slices; this slice must not implement them.

- **The React coach drawer / floating button** — the bottom-right button, the right-hand drawer, the
  rendered insight card, and the chat thread UI (DESIGN §7.5, **FR-SHELL-02**) — a later shell slice. This
  slice produces the structured payloads the drawer will later render; it ships no frontend and does not
  own FR-SHELL-02 or any FR-SHELL id.
- **Setting or toggling the coach language** — any UI or endpoint to *choose* `coach_language`. This slice
  only **reads** the stored value; the picker is a settings/shell concern.
- **The live-poll transport** — the 5-second `GET /api/sync/state` poll and cross-device refresh
  (architecture §5, NFR-DATA-01) — slice 007. Coach requests are per-call, on demand.
- **Metric computation and the snapshot assembly** — every M1-M6 formula, window, threshold, zone,
  baseline (FR-METR-*), and the Stats UI (FR-STATS-*) — slices 004/005. This slice consumes the shipped
  snapshot and computes no number.
- **Any live LLM/network call in the committed gate** — the eval cases are deterministic offline fixtures
  (NFR-COST-01); real provider calls happen only at runtime with the owner key.
- **The browser extension and OAuth** (FR-EXT-*, FR-AUTH-04, FR-AUTH-05) — their own slices.
