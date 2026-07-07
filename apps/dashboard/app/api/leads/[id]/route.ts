// apps/dashboard — DELETE /api/leads/:id (dashboard tasks.md §5.6,
// `@trace NFR-PRIV-02`). The "Delete lead" admin action: cascades the DB
// delete (`@kamerton/db`'s `deleteLeadCascade`, already implemented per
// tasks.md §1.2) AND deletes each returned pending booking's tentative
// Google Calendar event, then publishes a state-removal event onto
// `agui-hub.ts` so every connected dashboard tab drops the lead without a
// reload.
//
// ORDERING (pinned here for the green implementer, per tasks.md §5.6's own
// requirement to document it): CALENDAR-DELETE BEFORE DB-DELETE. The route
// first reads which of this lead's `bookings` rows are `pending` with a
// non-null `calendar_event_id` (a plain `SELECT`, no delete yet), calls
// `calendar.deleteEvent(eventId)` for each, and only THEN calls
// `deleteLeadCascade` to remove the `leads`/`requests`/`bookings` rows. If
// the calendar call rejects, the route returns the deterministic
// inline-error JSON WITHOUT ever touching the DB — the lead's rows (and the
// still-live tentative calendar event) are untouched, a safe, retryable
// state. The alternative order (DB-delete first, calendar-delete second)
// would risk exactly the failure mode this ordering avoids: if the DB
// delete succeeds but the calendar call then fails, the tentative event
// would be ORPHANED — no `bookings` row left pointing at it, so nothing in
// this codebase would ever clean it up again except a human noticing it by
// hand in the calendar UI. Calendar-first means a calendar failure never
// orphans a tentative event; worst case is a rare double-delete attempt
// against an already-gone DB row on manual retry, which the second-DELETE
// "not found" path below already handles deterministically.
//
// Dynamic segment `params` as a `Promise`, per Next.js 15+/16's async route
// params — verified via `ctx7`'s `/vercel/next.js` v16.2.9 docs before
// writing this file.
//
// CALENDAR-PORT SEAM: `resolveCalendarPort()` (`../../../../lib/calendar-port.ts`)
// — a real `GoogleCalendarPort` in production, a test-installed override
// (`setCalendarPortForTesting`) in `route.test.ts`. See that module's own
// header comment for the full rationale (a Route Handler's fixed
// `(request, context)` signature has no room for constructor injection, and
// the test needs object-IDENTITY access to the exact `FakeCalendarPort` it
// seeded a tentative event on).

import { openDatabase, deleteLeadCascade } from "@kamerton/db";
import { releaseHold } from "@kamerton/lib/src/slots/hold.ts";
import { publish } from "../../../../lib/agui-hub.ts";
import { resolveCalendarPort } from "../../../../lib/calendar-port.ts";
import { currentWeekStartIso, readDashboardSnapshot, resolveDbPath } from "../../../../lib/dashboard-db.ts";
import type { AguiEvent } from "@kamerton/lib/src/agui/events.ts";

export const runtime = "nodejs";

interface CalendarEventRow {
  calendar_event_id: string;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const leadId = Number(id);

  // Review-gate FIX 6 [MINOR]: a non-numeric (`Number("abc")` is `NaN`) or
  // non-positive-integer `[id]` segment gets a deterministic 400 BEFORE any
  // DB query — never the misleading "not found or already deleted" 404
  // below (which implies a real lead id that once existed), and never a raw
  // 500 (`better-sqlite3` refuses to bind a non-finite parameter at all).
  if (!Number.isInteger(leadId) || leadId <= 0) {
    return Response.json({ error: "Некоректний ідентифікатор ліда." }, { status: 400 });
  }

  const db = openDatabase(resolveDbPath());
  try {
    const lead = db.prepare(`SELECT id FROM leads WHERE id = ?`).get(leadId);
    if (lead === undefined) {
      return Response.json({ error: "Лід не знайдений або вже видалений." }, { status: 404 });
    }

    // Plain SELECT, no delete yet (this file's own header comment: "a
    // calendar failure must never orphan a tentative event").
    //
    // Review-gate finding #4 [MAJOR]: NOT filtered to `b.status = 'pending'`
    // — a CONFIRMED booking's calendar event is the actual scheduled lesson
    // (upgraded via booking-hitl's Confirm decision) and still carries the
    // lead's name/contact details; leaving it behind on lead-delete
    // permanently orphans it (no `bookings` row survives to ever let
    // anything in this codebase find and delete it again), violating
    // NFR-PRIV-02. Any booking of this lead with a non-null
    // `calendar_event_id` — pending OR confirmed OR already
    // declined/cancelled — is routed through `releaseHold` below, which is
    // 404/410-idempotent (F.3), so an already-deleted declined/cancelled
    // event is safely a no-op.
    const calendarEventRows = db
      .prepare(
        `SELECT b.calendar_event_id AS calendar_event_id
         FROM bookings b
         JOIN requests r ON r.id = b.request_id
         WHERE r.lead_id = ?
           AND b.calendar_event_id IS NOT NULL`,
      )
      .all(leadId) as CalendarEventRow[];

    // Review finding (§8.11 smoke): only resolve the calendar port when there
    // is actually a tentative event to delete. `resolveCalendarPort()`
    // constructs a real `GoogleCalendarPort`, whose constructor THROWS when
    // `GOOGLE_APPLICATION_CREDENTIALS`/`GOOGLE_CALENDAR_ID` are unset — so
    // constructing it unconditionally 500'd this route for a lead with zero
    // calendar-backed bookings (the common case), needlessly coupling
    // a pure DB delete to calendar credentials. Resolve lazily.
    try {
      if (calendarEventRows.length > 0) {
        const calendar = resolveCalendarPort();
        for (const row of calendarEventRows) {
          // booking-hitl design.md Decision 6 item 2 / F.3: route the
          // delete through the ONE shared idempotent-delete path
          // (`releaseHold`) rather than a raw `calendar.deleteEvent` — a
          // 404/410 on an already-gone event (e.g. a previous partial retry,
          // or an already-declined/cancelled booking's stale event id) is
          // treated as an already-satisfied delete, not a failure. Every
          // other `CalendarError` still propagates unchanged into the
          // `catch` below.
          await releaseHold(calendar, row.calendar_event_id);
        }
      }
    } catch {
      // Calendar-before-DB ordering: bail out BEFORE touching the DB — the
      // lead's rows (and the still-live tentative event) are untouched, a
      // safe, retryable state (never an orphaned calendar event).
      return Response.json(
        { error: "Не вдалося видалити подію в календарі. Спробуйте ще раз." },
        { status: 502 },
      );
    }

    deleteLeadCascade(db, leadId);

    // State-removal event: a fresh full `STATE_SNAPSHOT` (never a raw
    // `STATE_DELTA` guessing at array indices) so every connected dashboard
    // tab converges on "this lead is gone" without a reload.
    const snapshot = readDashboardSnapshot(db, currentWeekStartIso());
    const removalEvent: AguiEvent = { type: "STATE_SNAPSHOT", threadId: "dashboard", snapshot };
    publish(removalEvent);

    return Response.json({ status: "ok" }, { status: 200 });
  } finally {
    db.close();
  }
}
