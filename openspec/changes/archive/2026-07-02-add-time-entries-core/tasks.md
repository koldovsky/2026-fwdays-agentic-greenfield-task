## 1. Shared — contracts + pure logic (test-first)

- [x] 1.1 Add `formatDurationHms(totalSec)` to `packages/shared/src/duration.ts` — `h:mm:ss` (hours unpadded, mm/ss zero-padded), reusing `normalize` for negative/non-finite guard (FR-ENTRY-09)
- [x] 1.2 Write `duration.test.ts` cases for `formatDurationHms`: sub-minute, sub-hour, multi-hour, zero, negative, non-finite (TC-TEST-01)
- [x] 1.3 Refine `TimeEntry` contract in `contracts.ts`: add `userId`, `createdAt`, `updatedAt`; add `UpdateTimeEntry` (note/startedAt/stoppedAt partial) and `ManualTimeEntry` (note + startedAt + stoppedAt) request types; keep `CreateTimeEntry`/`StopTimeEntry`
- [x] 1.4 Add `packages/shared/src/timeEntries.ts` with pure `groupEntriesByDay(entries, ...)` → newest-day-first `{ date, totalSec, entries }[]`, bucketing by **local start day**, attributing midnight-crossers to start day, summing per-day totals (FR-ENTRY-07, FR-ENTRY-10)
- [x] 1.5 Write `timeEntries.test.ts`: grouping order, per-day totals, midnight-crossing attribution, running-entry (null duration) handling, empty input (TC-PURE-01)
- [x] 1.6 Export new module from `packages/shared/src/index.ts`; `npm run build -w @honeydo/shared`; confirm shared tests green

## 2. API — data model + module

- [x] 2.1 Extend `schema.prisma` `TimeEntry`: add `userId` + `user User @relation(onDelete: Cascade)`, replace `@@index([startedAt])` with `@@index([userId, startedAt])`; add back-relation on `User`
- [x] 2.2 Run `npm run migrate` (dev) to create the migration; confirm `prisma generate`
- [x] 2.3 Create `apps/api/src/time-entries/` module (module/controller/service) wired into `AppModule`, whole controller behind `JwtAuthGuard`, using `@CurrentUser`
- [x] 2.4 DTOs (class-validator): `CreateTimeEntryDto` (note required, optional startedAt), `ManualTimeEntryDto` (note + startedAt + stoppedAt, end-after-start), `UpdateTimeEntryDto` (all optional), matching the shared contracts
- [x] 2.5 Service: `start` — transaction stops any running entry for the user then creates the new running one (FR-ENTRY-01/03/11)
- [x] 2.6 Service: `stop` — set `stoppedAt` + computed `durationSec` on the user's running entry; reject/no-op when none running (FR-ENTRY-02)
- [x] 2.7 Service: `createManual` (end-after-start, duration computed, not running) and `continue` (transaction: stop running, create new running copying the source note) (FR-ENTRY-04/08)
- [x] 2.8 Service: `update` (recompute duration on time change, reject if it would leave two running) and `remove`, both user-scoped (FR-ENTRY-05/06)
- [x] 2.9 Controller routes: `GET /time-entries` (list, newest first, user-scoped), `GET /time-entries/running`, `POST /time-entries` (start), `POST /time-entries/manual`, `POST /time-entries/:id/stop`, `POST /time-entries/:id/continue`, `PATCH /time-entries/:id`, `DELETE /time-entries/:id`; 404 on cross-user id (FR-ENTRY-11, BC-SCOPE-01)
- [x] 2.10 Add a service/e2e test asserting the single-running invariant (two starts → one running) and cross-user isolation; run `npm run lint && typecheck && test -w @honeydo/api`

## 3. Mobile — data layer

- [x] 3.1 Add `@tanstack/react-query` and `@shopify/flash-list` to `apps/mobile`; install from repo root
- [x] 3.2 Wrap the app root in `QueryClientProvider` (inside ThemeProvider) in `App.tsx`
- [x] 3.3 Add `src/api/timeEntries.ts` — typed client over the existing authenticated API client (list, running, start, stop, manual, continue, update, delete) using `@honeydo/shared` contracts
- [x] 3.4 Add query/mutation hooks `src/hooks/useTimeEntries.ts`: `useEntries`, `useRunningEntry`, and optimistic `useStart/useStop/useContinue` (onMutate snapshot + rollback, onSettled invalidate) (NFR-PERF-01, TC-STACK-05)
- [x] 3.5 Add a live-elapsed hook (`useElapsed(startedAt)`) ticking via `setInterval`, formatting with `formatDurationHms`

## 4. Mobile — Timer screen

- [x] 4.1 Build the running state: description + live `h:mm:ss` clock + Stop; token-driven per DESIGN.md (match the timer UI kit reference)
- [x] 4.2 Build the idle state: description input + Start; keep the existing empty-state hero when there are no entries at all (FR-SHELL-03)
- [x] 4.3 Manual-entry form (RHF + Zod): note + start/end date-time pickers, end-after-start validation; posts to `/time-entries/manual`
- [x] 4.4 Edit form reusing the manual form (description + times), wired to `PATCH`; delete action with confirm
- [x] 4.5 Continue action from a past entry (from History row / recent) → optimistic start copying the note

## 5. Mobile — History screen

- [x] 5.1 Fetch entries and group with shared `groupEntriesByDay`; render a FlashList of day headers + rows (per-day total in header) (FR-ENTRY-07, NFR-PERF-02)
- [x] 5.2 Row shows note + duration (`formatDurationHms`/compact) with tap → edit and a Continue affordance; token-driven styling per DESIGN.md
- [x] 5.3 Empty and loading states are calm and token-driven (NFR-OBS-01)

## 6. Verify & document

- [x] 6.1 Run repo `npm run gate` (lint + typecheck + test + build) green; verify no raw-hex/design-token lint violations in new mobile UI
- [x] 6.2 Manual device smoke: start → stop → manual add → edit → delete → continue; confirm single running entry and day grouping
- [x] 6.3 Update `docs/current-state.md` (newest-first) with what shipped, FR IDs covered, and next steps; mark requirement statuses if appropriate
