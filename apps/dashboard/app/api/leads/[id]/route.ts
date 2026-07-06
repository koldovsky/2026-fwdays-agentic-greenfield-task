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
// TYPED THROWING STUB — red state for Stage C of this slice. The signature
// below (dynamic segment `params` as a `Promise`, per Next.js 15+/16's async
// route params — verified via `ctx7`'s `/vercel/next.js` v16.2.9 docs before
// writing this file) is the contract pinned by `route.test.ts`; the body is
// implemented once that suite is confirmed red.

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  throw new Error("apps/dashboard/app/api/leads/[id]/route.ts: DELETE not implemented");
}
