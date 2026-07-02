## Context

Phase 1 (auth, app-shell, theming) is done. The `TimeEntry` Prisma model and a skeleton
`TimeEntry` contract already exist but are unused and **not user-scoped**. This change
implements the MVP core loop across all three packages, reusing the existing JWT guard
(`JwtAuthGuard`, `@CurrentUser`) and the token/refresh plumbing from auth.

Constraints that shape the design:
- **TC-PURE-01 / TC-TEST-01** — duration and day-grouping logic must live in
  `packages/shared` (framework-free) and be 100% unit-tested.
- **FR-ENTRY-11 / TC-NATIVE-03** — three surfaces (app, widget, Live Activity) will
  toggle the *same* running entry, so the single-running invariant must be enforced by
  the **server**, not the client.
- **NFR-PERF-01/02, TC-STACK-05** — optimistic timer updates and a virtualized history.
- **BC-SCOPE-01** — single-user product, but entries are still owned by a `userId` so
  the JWT guard scopes every query.

## Goals / Non-Goals

**Goals:**
- A start/stop/manual/edit/delete/continue API, user-scoped, with the single-running
  invariant enforced server-side in a transaction.
- Pure `h:mm:ss` formatter (FR-ENTRY-09) and pure local-day grouping with per-day totals
  (FR-ENTRY-07, FR-ENTRY-10), both unit-tested.
- Functional **Timer** and **History** screens with optimistic updates (TanStack Query)
  and a virtualized list.

**Non-Goals:**
- Tag assignment/filtering UI and DB relation (lands in `tags`; the contract leaves room
  for it but no tag columns ship here).
- Stats aggregation / weekly chart (`profile-stats`).
- The iOS widget and Live Activity themselves — this change only lands the server-side
  invariant and running-entry source of truth they will reuse.
- Offline/queueing — the app assumes connectivity (per the requirements' out-of-scope).

## Decisions

### 1. Single-running invariant lives in the API, in a transaction

Start and continue run inside a Prisma `$transaction`: stop any currently-running entry
for the user (`stoppedAt = null` → set stop + duration), then create the new running
entry. A partial unique index (`@@unique([userId]) where stoppedAt IS NULL`) is the
ideal DB guarantee, but Prisma doesn't model partial uniques declaratively; we enforce
it in the transaction and add `@@index([userId, startedAt])` for query performance.
*Alternative considered:* client-side enforcement — rejected because the widget/Live
Activity bypass the app (FR-ENTRY-11).

### 2. Server computes and stores `durationSec`

Duration is derived (`stoppedAt − startedAt`) but persisted so history/stats read it
without recomputing and so it's stable if definitions change later. The **pure**
formatter turns seconds into `h:mm:ss`; the server never formats. Running entries have
`stoppedAt = null, durationSec = null`; the client renders their live clock from
`now − startedAt`.

### 3. Local-day grouping is pure and client-side

Grouping by *local* calendar day depends on the device time zone, so the server returns
a flat, newest-first list and the shared pure function
(`groupEntriesByDay`) buckets by local start date, orders days newest-first, and sums
per-day totals — attributing midnight-crossers to their **start day** (FR-ENTRY-10).
This keeps the server TZ-agnostic and the logic unit-testable. *Alternative:* server-side
grouping with a client TZ offset param — more round-trips and a fatter API for no gain.

### 4. Mobile server-state: TanStack Query with optimistic mutations

`@tanstack/react-query` holds the entries list and running entry. Start/stop/continue are
optimistic: `onMutate` cancels in-flight queries, snapshots the cache, applies the new
state (<100 ms, NFR-PERF-01), and `onError` rolls back; `onSettled` invalidates. The live
clock ticks from a local `setInterval` over the running entry's `startedAt`, not from the
server. *Alternative considered:* Zustand-only — rejected; we already chose TanStack Query
for server-state (TC-STACK-05) and it gives caching + reconciliation for free. A small
Zustand slice may still hold pure UI state, but the source of truth is the query cache.

### 5. History list virtualization via FlashList

`@shopify/flash-list` for the day-grouped list (NFR-PERF-02) using a flattened
section-header + row data array. *Alternative:* `SectionList` — works but FlashList
handles 1 000+ rows more smoothly and is the design system's list primitive.

### 6. Forms via React Hook Form + Zod

Manual-entry and edit forms use RHF + Zod (`standardSchemaResolver`) per the mobile forms
rule, matching the existing AuthScreen pattern (date/time pickers feed the resolver).

## Risks / Trade-offs

- **Race: two starts in flight** → the transaction stops-then-creates, so the worst case
  is a very short entry, never two running. The client also disables the button
  optimistically.
- **Clock skew between device and server** → start/stop use **server** `now` when the
  client omits explicit times; the live clock is cosmetic. Manual entries use the times
  the user supplies.
- **Midnight attribution differs from wall-clock intuition** → documented MVP
  simplification (FR-ENTRY-10); revisit if stats need split-day accuracy.
- **Optimistic rollback UX** → on persistence failure we roll back and show a calm,
  visible error (NFR-OBS-01), not a stuck timer.
- **Contract break on `TimeEntry`** → dev-only; no production data. Migration is a plain
  `prisma migrate dev`.

## Migration Plan

1. Extend `schema.prisma`: `TimeEntry.userId` + `User` relation (onDelete: Cascade),
   `@@index([userId, startedAt])`; `npm run migrate` (dev).
2. Ship shared contracts + pure logic (test-first), build `@honeydo/shared`.
3. Ship the API module behind the JWT guard; verify the invariant with an integration
   check.
4. Ship mobile screens; wire TanStack Query provider at the app root.
Rollback: revert the migration and the module; no external consumers.

## Open Questions

- **AA accent-on-light** (`accentText` token) is still deferred from theming — the Timer
  primary action uses accent; if it renders text on the accent fill we're fine, but any
  accent-colored *text on bg* in these screens should use the future `accentText`. Noted,
  not blocking.
- Do we expose an explicit `PATCH /time-entries/:id/stop` vs. a general update? Decision:
  a dedicated `stop` (and `start`/`continue`) endpoint for the invariant, plus a general
  `PATCH` for edits — keeps the invariant logic off the generic update path.
