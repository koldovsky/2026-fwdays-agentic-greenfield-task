# Capability: time-entries

- **Order:** 04 · **Phase:** 2 · **OpenSpec change:** `add-time-entries-core` *(split api/mobile)* · **Status:** not started
- **Depends on:** auth, app-shell · **Blocks:** tags, profile-stats, home-widget, live-activity, streaks
- **Packages:** `packages/shared`, `apps/api`, `apps/mobile`

## Summary

The MVP spine: the start/stop tracking loop with manual entry, edit/delete, continue, and a
day-grouped history. One running entry at a time is the single source of truth. Fills **two
separate `app-shell` tabs** — the **Timer** screen (the loop: start/stop/manual/edit) and the
**History** screen (day-grouped list). Both render the same `TimeEntry` data; History is a view
of it, not a separate capability.

## Requirements

| ID | Description |
|----|-------------|
| FR-ENTRY-01 | Start a timer with a free-text description; **at most one entry runs at a time** |
| FR-ENTRY-02 | Stop the running timer; `duration = stop − start` computed and persisted |
| FR-ENTRY-03 | Starting a new timer stops the previous — no overlapping running entries |
| FR-ENTRY-04 | Add a manual entry with explicit start and end |
| FR-ENTRY-05 | Edit an entry: description, start, end, tags |
| FR-ENTRY-06 | Delete an entry |
| FR-ENTRY-07 | History grouped by **local calendar day**, newest first, with per-day total |
| FR-ENTRY-08 | **Continue**: tapping a past entry starts a new running entry copying its description + tags |
| FR-ENTRY-09 | Duration formatting (`h:mm:ss`) is a **pure function** in a framework-free module |
| FR-ENTRY-10 | An entry crossing midnight is attributed to its **start day** for stats (MVP simplification) |
| FR-ENTRY-11 | The single running entry is one source of truth toggled by app/widget/Live Activity alike |
| NFR-PERF-01 | Start/stop reflects optimistically in < 100 ms; persistence in background |
| NFR-PERF-02 | History stays smooth (virtualized) at 1 000+ entries |
| TC-STACK-05 | Server-state via TanStack Query (optimistic updates for timer actions) |

## Pure-logic surface

`formatDuration` (FR-ENTRY-09) and day-grouping helpers — in `packages/shared`, unit-tested.
(`formatDurationClock` / `formatDurationCompact` already exist; expand to `h:mm:ss` as specced.)

## Scope

- Shared: `TimeEntry` contracts (started, refine the existing skeleton), start/stop/continue DTOs.
- API: time-entries module + `TimeEntry` Prisma model (exists), enforce single-running invariant
  server-side (FR-ENTRY-03), CRUD + continue endpoints, class-validator DTOs.
- Mobile: **two screens** filling the app-shell tabs — the **Timer** screen (start/stop with
  optimistic updates via TanStack Query, continue action, manual-entry + edit forms) and the
  **History** screen (day-grouped, virtualized list via FlashList, per-day totals). Both read
  the shared entry store; tag filtering on History lands with `tags` (FR-TAG-04).

## Non-goals

No tags UI yet (lands in `tags`); no stats aggregation (lands in `profile-stats`).

## Risks / notes

The single-running-entry invariant must hold server-side, not just in the UI, because three
surfaces toggle it (FR-ENTRY-11, TC-NATIVE-03).
