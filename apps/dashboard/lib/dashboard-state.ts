// apps/dashboard — the PURE state-assembly layer (dashboard tasks.md §5.2,
// design.md Decision 3: "server-only glue... stays in apps/dashboard, never
// in lib/"). Takes plain `leads`/`requests`/`bookings` row arrays (whatever
// `dashboard-db.ts`, §5.5, actually reads from SQLite) and assembles the
// `DashboardState` the SSE stream's `STATE_SNAPSHOT` frame carries and the
// UI (section 6, not this pass) renders from.
//
// TYPED THROWING STUB — red state for Stage C of this slice. Types below are
// the contract pinned by `dashboard-state.test.ts`; the body is implemented
// once that suite is confirmed red.
//
// `DashboardBookingRow` extends `@kamerton/db`'s `BookingRow` with
// `request_id` — the column `packages/db/src/schema.ts`'s
// `ensureBookingsRequestIdColumn()` adds at the SQL level (S2 `intake`
// design.md Decision 4), but `BookingRow`'s own TS interface (`bookings.ts`)
// predates that column and was never updated to include it (a real,
// pre-existing gap in `@kamerton/db`, not something this slice invented) —
// `dashboard-db.ts`'s raw `SELECT *` will actually return the column, so this
// extension is the accurate row shape this layer receives, not a guess.

import type { BookingRow, LeadRow, RequestRow } from "@kamerton/db";
// `compileFirstLessonBrief` (`@kamerton/lib`) is the green half's brief
// source for `PendingQueueEntry.brief` below — not imported yet since this
// stub's body never runs it (nothing here would use it before green).
import type { SeatStatus } from "@kamerton/lib/src/dashboard/hall-status.ts";
import type { SeatCoordinate } from "@kamerton/lib/src/dashboard/week-grid.ts";

/** See this file's header comment: `BookingRow` plus the `request_id` column
 *  its own TS interface omits. */
export type DashboardBookingRow = BookingRow & { request_id: number | null };

export interface DashboardRows {
  leads: LeadRow[];
  requests: RequestRow[];
  bookings: DashboardBookingRow[];
}

/** One pending request in the admin queue (baseline spec's DecisionBar
 *  queue) — the request's own collected fields plus its compiled
 *  first-lesson brief (`compileFirstLessonBrief`, reused from `lib/`, never
 *  duplicated) and the tentative booking backing it. */
export interface PendingQueueEntry {
  requestId: number;
  leadId: number;
  telegramChatId: string;
  studentName: string | null;
  studentAge: number | null;
  brief: string;
  bookingId: number;
  calendarEventId: string | null;
  slotStart: string;
  slotEnd: string;
}

/** One HallMap seat, its fixed grid position (`lib/`'s `SeatCoordinate`) plus
 *  its precedence-resolved rendered status (`lib/`'s `hallSeatStatus`). */
export interface HallMapSeat extends SeatCoordinate {
  status: SeatStatus;
}

/** The assembled shape a `STATE_SNAPSHOT` AG-UI event carries and the
 *  dashboard UI renders from (design.md's AG-UI contract). */
export interface DashboardState {
  /** Every non-terminal (`requests.state` not `'done'`/`'soft_decline'`)
   *  request row — the conversation panel/`RequestCard`'s data source
   *  (section 6, not this pass). */
  activeRequests: RequestRow[];
  /** `awaiting_admin`-state requests with a `pending` booking — the
   *  DecisionBar queue (FR-DASH-01). */
  pendingQueue: PendingQueueEntry[];
  /** The current week's HallMap seats, each resolved via `hallSeatStatus`
   *  (FR-DASH-03). Exactly 5 weekdays x 10 hourly-start seats
   *  (`weekSeatGrid`'s own contract), in `weekSeatGrid`'s order. */
  hallMap: HallMapSeat[];
}

/**
 * Assembles a `DashboardState` from plain row arrays — PURE, no I/O of its
 * own (the actual `better-sqlite3` read is `dashboard-db.ts`'s job, §5.5).
 * `weekStartIso` is an explicit "YYYY-MM-DD" argument (never
 * `Date.now()`-derived here either — same purity discipline as `lib/`'s own
 * `weekSeatGrid`) so this function is deterministically testable for any
 * week.
 */
export function buildStateSnapshot(rows: DashboardRows, weekStartIso: string): DashboardState {
  throw new Error("apps/dashboard/lib/dashboard-state.ts: buildStateSnapshot() not implemented");
}
