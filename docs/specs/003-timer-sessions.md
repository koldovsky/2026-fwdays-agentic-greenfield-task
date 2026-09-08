# 003 — Timer & Sessions

- **Status:** ratified (owner-approved 2026-07-10; the OpenSpec change `add-timer-sessions` is the
  machine-validated contract and passes `openspec validate --strict`)
- **Date:** 2026-07-10

## Contract (OpenSpec)

The detailed, machine-validated contract for this slice lives in OpenSpec as the `timer-sessions`
capability, authored **before code** by the in-flight change
[`add-timer-sessions`](../../openspec/changes/add-timer-sessions/proposal.md) (proposal, spec deltas,
design, tasks). That change carries the GIVEN/WHEN/THEN scenarios and is checked by
`openspec validate --all --strict`.

This file is the thin anchor for the Python traceability harness (`scripts/check-traceability`): the
`Requirements covered` ids below are what the harness maps to `@trace` tests. Per the specs<->OpenSpec
bridge decision in [`openspec/README.md`](../../openspec/README.md), the detailed contract is not
duplicated here.

## Problem / goal

Cadence is a timer: nothing downstream exists until a user can run the timer and keep the result. This
slice adds the core loop — the single server-authoritative active timer (start / pause / continue /
stop+save / confirmed discard), the saved-session log with manual add / edit / delete, discrete pause
segments with derived net/gross durations, and the 5-second bottom-left undo for discard / edit /
delete — on top of the slice 001 auth boundary (FR-AUTH-07, reused) and the slice 002 categories
capability (the `category_id` reference, reused).

## Requirements covered

Cited by ID only — [`docs/requirements.md`](../requirements.md) is the single source of truth; this
anchor does not restate requirement text.

- **Functional:** FR-TIMER-01, FR-TIMER-02, FR-TIMER-03, FR-TIMER-04, FR-TIMER-05, FR-TIMER-06,
  FR-SESS-01, FR-SESS-02, FR-SESS-03, FR-SESS-04, FR-SESS-05, FR-SESS-06, FR-NOTIF-01.

## Out of scope

Listed areas belong to other slices; this slice must not implement them.

- **Metrics** (FR-METR-*) and **day/midnight attribution** (architecture §3.7): they *consume* saved
  sessions — slice 004. This slice stores UTC timestamps and pauses faithfully and computes no metric.
- **Live-sync transport** — the 5-second `GET /api/sync/state` poll and cross-device propagation
  (architecture §5, NFR-DATA-01) — slice 007. Only the server-authoritative active-session **state**
  (the `active_sessions` row + `version`) is modeled here.
- **Stats and charts** (FR-STATS-*) — slice 005; the **heatmap** (FR-HEAT-*) — its own slice.
- **The browser extension** (FR-EXT-*) — slice 008.
- **Undo for stop+save** (architecture G-1: intentionally not designed; a mis-saved session is fixed
  via edit/delete).
