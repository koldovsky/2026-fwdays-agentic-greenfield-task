# 002 — Categories

- **Status:** draft (awaiting owner ratification)
- **Date:** 2026-07-10

## Contract (OpenSpec)

The detailed, machine-validated contract for this slice lives in OpenSpec as the `categories`
capability, authored **before code** by the in-flight change
[`add-categories`](../../openspec/changes/add-categories/proposal.md) (proposal, spec deltas, design,
tasks). That change carries the GIVEN/WHEN/THEN scenarios and is checked by
`openspec validate --all --strict`.

This file is the thin anchor for the Python traceability harness (`scripts/check-traceability`): the
`Requirements covered` ids below are what the harness maps to `@trace` tests. Per the specs<->OpenSpec
bridge decision in [`openspec/README.md`](../../openspec/README.md), the detailed contract is not
duplicated here.

## Problem / goal

Users organize tracked time by category, so before the timer, sessions, and metrics can reference
one, a user must be able to create, edit, and delete their own categories. This slice adds that
per-user CRUD on top of the slice 001 auth boundary (per-user isolation, FR-AUTH-07, is reused, not
re-implemented); deletion is **archive** (soft-delete) so a history-referenced category is never
destroyed (O-4 / architecture §7).

## Requirements covered

Cited by ID only — [`docs/requirements.md`](../requirements.md) is the single source of truth; this
anchor does not restate requirement text.

- **Functional:** FR-CAT-01, FR-CAT-02, FR-CAT-03.

## Out of scope

Listed areas belong to other slices; this slice must not implement them.

- Everything that *consumes* categories: the timer, sessions, heatmap, metrics, stats, and coach
  capabilities (later slices).
- Unarchive (a trivial future add per architecture §7) and any category-management surface beyond
  create / edit / delete.
- The per-card stats (total time, session count) of DESIGN §7.4 and the live-sync `changes_cursor`
  bump on writes (architecture §5) — both depend on later slices (see the change's design Open
  questions).
