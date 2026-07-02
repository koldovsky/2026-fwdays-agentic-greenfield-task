## Why

Auth, the four-tab shell, and theming are live, but every tab is a placeholder — the
app tracks nothing yet. Time entries are the MVP spine (BC-DEMO-01): the start/stop
loop, manual entry, edit/delete, continue, and a day-grouped history. Nothing
downstream (tags, stats, the iOS widget, the Live Activity, the daily insight) can be
built until this core loop and its single source of truth exist.

## What Changes

- **Shared (`@honeydo/shared`)** — refine the `TimeEntry` contract and add the
  request/response shapes for the full loop (create/start, stop, manual create,
  update, continue). Add a framework-free `h:mm:ss` duration formatter (FR-ENTRY-09)
  and pure day-grouping helpers (group by **local** calendar day, newest first,
  per-day totals — FR-ENTRY-07), attributing midnight-crossing entries to their
  **start day** (FR-ENTRY-10). All 100% unit-tested (TC-PURE-01, TC-TEST-01).
- **API (`@honeydo/api`)** — a `time-entries` module: user-scoped CRUD +
  start/stop/continue endpoints over the existing `TimeEntry` Prisma model (extended
  with a `userId` owner relation). The **single-running-entry invariant is enforced
  server-side** (FR-ENTRY-01/03/11): starting a new entry stops any running one in the
  same transaction. class-validator DTOs (TC-STACK-02); all routes behind the JWT
  guard.
- **Mobile (`@honeydo/mobile`)** — fills **two** existing shell tabs with real data:
  the **Timer** screen (start/stop with optimistic <100 ms updates, live elapsed
  clock, continue, manual-entry + edit forms) and the **History** screen (virtualized,
  day-grouped list with per-day totals). Server-state via **TanStack Query** with
  optimistic timer actions (TC-STACK-05, NFR-PERF-01/02).
- **BREAKING (contract):** `TimeEntry` gains a `userId` field and entries become
  user-scoped; the pre-existing skeleton contract/model changes shape. No production
  data exists yet, so this is a dev-only migration.

## Capabilities

### New Capabilities
- `time-entries`: the core tracking loop — start/stop with a single running entry as
  the source of truth, manual entry, edit, delete, continue, day-grouped history, and
  the pure duration/grouping logic. Covers FR-ENTRY-01→11, NFR-PERF-01/02, TC-STACK-05.

### Modified Capabilities
<!-- None — History is a *view* of time-entries data, not a change to app-shell's
     requirements. app-shell already specs the Timer/History tabs. -->

## Impact

- **Contracts:** `packages/shared/src/contracts.ts` (`TimeEntry` + request DTOs),
  new `packages/shared/src/timeEntries.ts` (grouping) and an `h:mm:ss` formatter in
  `duration.ts`, with tests.
- **Database:** `apps/api/prisma/schema.prisma` — add `userId` + `User` relation and
  a `@@index([userId, startedAt])` to `TimeEntry`; a Prisma migration.
- **API:** new `apps/api/src/time-entries/` module (controller/service/DTOs), wired
  into `AppModule` behind `JwtAuthGuard`.
- **Mobile:** new TanStack Query provider + entries API client, `TimerScreen` and
  `HistoryScreen` become functional, manual-entry/edit forms (RHF + Zod per the forms
  rule), a running-entry store, FlashList for the history list.
- **Dependencies:** add `@tanstack/react-query` and `@shopify/flash-list` to
  `apps/mobile`.
- **Out of scope (deferred):** tag assignment/filter UI (`tags`), stats aggregation
  (`profile-stats`), and the iOS widget/Live Activity toggles — this change lands the
  loop and the server-side invariant they will all reuse.
