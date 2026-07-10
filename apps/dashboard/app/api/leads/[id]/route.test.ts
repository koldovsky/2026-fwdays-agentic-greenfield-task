// Test-first (red): apps/dashboard/app/api/leads/[id]/route.ts's `DELETE`
// is a typed throwing stub (dashboard tasks.md §5.6's red half) — every test
// below is expected to FAIL against the stub, for the right reason (the
// stub's synchronous throw surfacing from `await DELETE(request, ctx)`,
// before the stream-reading/assertion logic below it ever runs — written
// now, exercised once §5.6's green half lands).
//
// ORDERING (see route.ts's own header comment for the full rationale):
// CALENDAR-DELETE BEFORE DB-DELETE. The route reads which pending bookings
// have a tentative calendar event, deletes those calendar events FIRST, and
// only then calls `deleteLeadCascade` — a calendar failure must never
// orphan a tentative event, so the DB delete only happens once every
// calendar delete has already succeeded.
//
// Real SQLite (a temp file — same reasoning as
// app/api/agui/stream/route.test.ts: the green route resolves its own db
// connection from `process.env.KAMERTON_DB_PATH`, a separate connection from
// this test's seeding connection, and only an on-disk file is visible across
// two separate `better-sqlite3` connections) + a real `FakeCalendarPort`
// (`@kamerton/lib/src/slots/fake-calendar.ts`) — the concrete calendar
// implementation the green route needs a seam to substitute in tests for.
//
// SEAM (resolved, see `../../../../lib/calendar-port.ts`'s own header
// comment): `setCalendarPortForTesting(port)` installs the EXACT
// `FakeCalendarPort` instance this file constructs as what the route's own
// `resolveCalendarPort()` returns — required for object-identity assertions
// like `calendar.getEvent(eventId)` below to actually observe what the
// route did. Cleared in `afterEach` so no test leaks its override into the
// next one (module-level singleton, same discipline as `agui-hub.ts`'s own
// subscriber-list cleanup).
//
// Dynamic route params as a `Promise` verified via `ctx7`'s
// `/vercel/next.js` v16.2.9 docs before writing this file.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase, insertLead, insertRequest, updateRequestState } from "@kamerton/db";
import { FakeCalendarPort } from "@kamerton/lib/src/slots/fake-calendar.ts";
import { CalendarApiError } from "@kamerton/lib/src/slots/calendar-port.ts";
import { setCalendarPortForTesting } from "../../../../lib/calendar-port.ts";
import { DELETE } from "./route.ts";

function leadsUrl(id: number): string {
  return `http://127.0.0.1:3000/api/leads/${id}`;
}

function paramsFor(id: number): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: String(id) }) };
}

describe("DELETE /api/leads/:id (dashboard tasks.md §5.6, @trace NFR-PRIV-02)", () => {
  let dbDir: string;
  let dbPath: string;
  let previousDbPathEnv: string | undefined;

  beforeEach(() => {
    dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-dashboard-delete-lead-"));
    dbPath = path.join(dbDir, "kamerton.db");
    previousDbPathEnv = process.env.KAMERTON_DB_PATH;
    process.env.KAMERTON_DB_PATH = dbPath;
  });

  afterEach(() => {
    if (previousDbPathEnv === undefined) delete process.env.KAMERTON_DB_PATH;
    else process.env.KAMERTON_DB_PATH = previousDbPathEnv;
    rmSync(dbDir, { recursive: true, force: true });
    setCalendarPortForTesting(undefined);
  });

  // @trace NFR-PRIV-02
  it("deletes the lead's tentative calendar event AND cascades the DB rows, then publishes a removal event", async () => {
    const db = openDatabase(dbPath);
    const calendar = new FakeCalendarPort();
    setCalendarPortForTesting(calendar);
    const { eventId } = await calendar.createTentative(
      { start: "2026-07-06T07:00:00Z", end: "2026-07-06T08:00:00Z" },
      "itest hold",
    );

    const lead = insertLead(db, {
      telegramUserId: "tg-user-1",
      telegramChatId: "tg-chat-1",
      telegramDisplayName: "Тестова Лідка",
    });
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-1" });
    updateRequestState(db, request.id, "awaiting_admin");
    db.prepare(
      `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id, request_id)
       VALUES (?, ?, 'pending', ?, ?)`,
    ).run("2026-07-06T10:00:00+03:00", "2026-07-06T11:00:00+03:00", eventId, request.id);
    db.close();

    const response = await DELETE(new Request(leadsUrl(lead.id), { method: "DELETE" }), paramsFor(lead.id));

    expect(response.status).toBe(200);
    expect(calendar.getEvent(eventId)).toBeUndefined(); // calendar event actually deleted

    const verifyDb = openDatabase(dbPath);
    const remaining = verifyDb.prepare(`SELECT * FROM leads WHERE id = ?`).get(lead.id);
    expect(remaining).toBeUndefined();
    verifyDb.close();
  });

  // @trace NFR-PRIV-02
  it("a second DELETE for an already-deleted lead id responds with a deterministic not-found error, never a raw 500", async () => {
    const nonExistentLeadId = 999999;

    const response = await DELETE(
      new Request(leadsUrl(nonExistentLeadId), { method: "DELETE" }),
      paramsFor(nonExistentLeadId),
    );

    expect(response.status).toBe(404);
    expect(response.status).not.toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  // --- review-gate FIX 6 [MINOR] ---------------------------------------------
  // @trace NFR-PRIV-02
  // A non-numeric (or non-positive) `[id]` segment (`Number("abc")` is
  // `NaN`) must respond 400 with a deterministic Ukrainian message BEFORE
  // any DB query — not fall through to the misleading 404 path above (which
  // implies "a real lead id that happens to already be gone"), and
  // (`better-sqlite3` refuses to bind a `NaN`/non-finite parameter at all,
  // so without an early guard this would otherwise surface as a raw 500).
  it.each(["abc", "1.5", "-1", "0", ""])(
    "DELETE with a non-positive-integer id segment ('%s') responds 400 before any DB query, never 404/500",
    async (rawId) => {
      const response = await DELETE(
        new Request(`http://127.0.0.1:3000/api/leads/${encodeURIComponent(rawId)}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: rawId }) },
      );

      expect(response.status).toBe(400);
      expect(response.status).not.toBe(404);
      expect(response.status).not.toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
      expect(body.error.length).toBeGreaterThan(0);
    },
  );

  // @trace NFR-PRIV-02
  it("a calendar.deleteEvent rejection surfaces a deterministic inline-error JSON, never a raw 500, and never touches the DB (calendar-before-DB ordering)", async () => {
    // Simulates a calendar outage — mirrors `packages/bot/src/pipeline.test.ts`'s
    // own `ThrowingCalendarPort` precedent (a `FakeCalendarPort` subclass
    // overriding `deleteEvent` to reject), since the real adapter's
    // `deleteEvent` rejects on any Google Calendar API failure
    // (`packages/calendar/src/google-calendar.ts`'s `mapCalendarError`).
    // A realistic calendar outage rejects with a `CalendarError` subclass
    // (the real adapter's `mapCalendarError`), which is what degrades to the
    // deterministic 502 — a plain `Error` would now (correctly) surface as a
    // 500 instead, covered by the companion test below.
    class ThrowingCalendarPort extends FakeCalendarPort {
      override async deleteEvent(): Promise<void> {
        throw new CalendarApiError("Calendar unavailable (simulated)", { status: 503 });
      }
    }

    const db = openDatabase(dbPath);
    const calendar = new ThrowingCalendarPort();
    setCalendarPortForTesting(calendar);
    const { eventId } = await calendar.createTentative(
      { start: "2026-07-06T07:00:00Z", end: "2026-07-06T08:00:00Z" },
      "itest hold",
    );

    const lead = insertLead(db, {
      telegramUserId: "tg-user-2",
      telegramChatId: "tg-chat-2",
      telegramDisplayName: "Другий Лід",
    });
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-2" });
    updateRequestState(db, request.id, "awaiting_admin");
    db.prepare(
      `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id, request_id)
       VALUES (?, ?, 'pending', ?, ?)`,
    ).run("2026-07-08T10:00:00+03:00", "2026-07-08T11:00:00+03:00", eventId, request.id);
    db.close();

    const response = await DELETE(new Request(leadsUrl(lead.id), { method: "DELETE" }), paramsFor(lead.id));

    expect(response.status).not.toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty("error");

    // Calendar-before-DB ordering: a calendar failure must leave the lead's
    // DB rows untouched (safe, retryable state — never an orphaned event).
    const verifyDb = openDatabase(dbPath);
    const stillThere = verifyDb.prepare(`SELECT * FROM leads WHERE id = ?`).get(lead.id);
    expect(stillThere).toBeDefined();
    verifyDb.close();
  });

  it("a NON-calendar bug during release is NOT masked as a 502 — it propagates (real 500), not a misleading retry response", async () => {
    // CodeRabbit: the release catch used to swallow EVERY error as a
    // "calendar error" 502. A non-`CalendarError` throw (a bug in the loop,
    // a TypeError) must surface as a genuine failure, never a deterministic-
    // looking 502 that tells the teacher to "try again".
    class BuggyCalendarPort extends FakeCalendarPort {
      override async deleteEvent(): Promise<void> {
        throw new TypeError("unexpected bug, not a calendar outage");
      }
    }

    const db = openDatabase(dbPath);
    const calendar = new BuggyCalendarPort();
    setCalendarPortForTesting(calendar);
    const { eventId } = await calendar.createTentative(
      { start: "2026-07-06T07:00:00Z", end: "2026-07-06T08:00:00Z" },
      "itest hold",
    );
    const lead = insertLead(db, {
      telegramUserId: "tg-user-3",
      telegramChatId: "tg-chat-3",
      telegramDisplayName: "Третій Лід",
    });
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-3" });
    updateRequestState(db, request.id, "awaiting_admin");
    db.prepare(
      `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id, request_id)
       VALUES (?, ?, 'pending', ?, ?)`,
    ).run("2026-07-08T10:00:00+03:00", "2026-07-08T11:00:00+03:00", eventId, request.id);
    db.close();

    // The non-calendar bug propagates (framework maps it to a 500) rather
    // than being caught and returned as a 502.
    await expect(DELETE(new Request(leadsUrl(lead.id), { method: "DELETE" }), paramsFor(lead.id))).rejects.toThrow(
      "unexpected bug",
    );

    // And the DB rows are still intact (the throw happened before the cascade).
    const verifyDb = openDatabase(dbPath);
    expect(verifyDb.prepare(`SELECT * FROM leads WHERE id = ?`).get(lead.id)).toBeDefined();
    verifyDb.close();
  });

  // -------------------------------------------------------------------
  // F.3 carryover — idempotent delete (booking-hitl design.md Decision 6,
  // item 2; @trace NFR-REL-01)
  // -------------------------------------------------------------------
  // Quoting `openspec/changes/archive/2026-07-06-dashboard/
  // review-findings.json`'s `deferredWithOwner` finding verbatim: "Delete-
  // lead is not idempotent across >1 pending booking: if one calendar
  // event delete succeeds and a later one fails, the route bails before
  // the DB delete, and a retry re-attempts the already-deleted event
  // (GoogleCalendarPort.deleteEvent does not treat 404/410 as success), so
  // the lead can never be deleted" (owner: S4 booking-hitl).
  //
  // `lib/src/slots/hold.ts`'s `releaseHold` was fixed for exactly this
  // (booking-hitl tasks.md A.13/A.14): it now catches a `CalendarApiError`
  // whose `status` is 404/410 and treats it as an already-satisfied delete.
  // This case pins the OBSERVABLE BEHAVIOR at THIS call site (a 404 on
  // delete must not abort the lead delete) — it does not assert HOW the
  // route gets there, so it is agnostic to whether the green implementation
  // routes through `releaseHold` (recommended — "one fix, one call site,
  // every caller benefits") or re-implements the same 404/410 catch inline.
  //
  // FAILS TODAY (red, for the right reason): the route currently calls
  // `calendar.deleteEvent(row.calendar_event_id)` directly inside a bare
  // `try { ... } catch { return 502 }` block with no 404/410 special-casing
  // at all — so a 404 here surfaces as the SAME 502 "calendar delete
  // failed" response a genuine outage would, and `deleteLeadCascade` is
  // never reached (the lead's rows are never deleted).
  it("F.3 regression pin: DELETE completes successfully (200, rows gone) even when deleteEvent rejects with a 404 CalendarApiError for one of two pending bookings' tentative events", async () => {
    class AlreadyDeletedCalendar extends FakeCalendarPort {
      override async deleteEvent(eventId: string): Promise<void> {
        if (eventId === "already-gone-evt") {
          throw new CalendarApiError("already gone", { status: 404 });
        }
        return super.deleteEvent(eventId);
      }
    }

    const db = openDatabase(dbPath);
    const calendar = new AlreadyDeletedCalendar();
    setCalendarPortForTesting(calendar);
    const { eventId: liveEventId } = await calendar.createTentative(
      { start: "2026-07-10T07:00:00Z", end: "2026-07-10T08:00:00Z" },
      "itest hold — live",
    );
    // The second pending booking's tentative event was already deleted on
    // the calendar side (e.g. a previous partial retry) — the calendar
    // reports 404 for it, but no `bookings` row was ever cleaned up, which
    // is exactly the "retry re-attempts the already-deleted event" scenario
    // the finding names.
    const alreadyGoneEventId = "already-gone-evt";

    const lead = insertLead(db, {
      telegramUserId: "tg-user-f3",
      telegramChatId: "tg-chat-f3",
      telegramDisplayName: "Лід з двома заявками",
    });
    const requestOne = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-f3" });
    updateRequestState(db, requestOne.id, "awaiting_admin");
    db.prepare(
      `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id, request_id)
       VALUES (?, ?, 'pending', ?, ?)`,
    ).run("2026-07-10T10:00:00+03:00", "2026-07-10T11:00:00+03:00", liveEventId, requestOne.id);

    const requestTwo = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-f3" });
    updateRequestState(db, requestTwo.id, "awaiting_admin");
    db.prepare(
      `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id, request_id)
       VALUES (?, ?, 'pending', ?, ?)`,
    ).run("2026-07-10T12:00:00+03:00", "2026-07-10T13:00:00+03:00", alreadyGoneEventId, requestTwo.id);
    db.close();

    const response = await DELETE(new Request(leadsUrl(lead.id), { method: "DELETE" }), paramsFor(lead.id));

    // A 404 on an already-gone tentative event is NOT a failure — the
    // delete still completes (never the 502 a genuine calendar outage
    // would produce).
    expect(response.status).toBe(200);
    expect(response.status).not.toBe(502);

    const verifyDb = openDatabase(dbPath);
    const remaining = verifyDb.prepare(`SELECT * FROM leads WHERE id = ?`).get(lead.id);
    expect(remaining).toBeUndefined();
    const remainingBookings = verifyDb
      .prepare(`SELECT * FROM bookings WHERE request_id IN (?, ?)`)
      .all(requestOne.id, requestTwo.id);
    expect(remainingBookings).toHaveLength(0);
    verifyDb.close();
  });

  // -------------------------------------------------------------------
  // Review-gate finding #4 [MAJOR]: delete-lead orphans CONFIRMED bookings'
  // calendar events (@trace NFR-PRIV-02).
  // -------------------------------------------------------------------
  // The route's own SELECT (see route.ts's header comment) only reads
  // pending-events: `WHERE b.status = 'pending' AND b.calendar_event_id IS
  // NOT NULL`. A CONFIRMED booking's calendar event — the actual scheduled
  // lesson, upgraded via `booking-hitl`'s Confirm decision — is never
  // included, so deleting a lead with a confirmed booking removes every DB
  // row (leads/requests/bookings) but leaves the real calendar event
  // behind, permanently orphaned: no `bookings` row survives to ever let
  // anything in this codebase find and delete it again. NFR-PRIV-02 (a
  // deleted lead's data must not survive the delete) is violated by this
  // leftover calendar entry, which still carries the lead's name/contact
  // details in its description/attendee fields.
  it("review-gate finding #4: DELETE also deletes a CONFIRMED booking's calendar event, not only pending ones", async () => {
    const db = openDatabase(dbPath);
    const calendar = new FakeCalendarPort();
    setCalendarPortForTesting(calendar);
    const { eventId } = await calendar.createTentative(
      { start: "2026-07-06T07:00:00Z", end: "2026-07-06T08:00:00Z" },
      "itest hold — later confirmed",
    );
    await calendar.upgradeToConfirmed(eventId, "brief");
    expect(calendar.getEvent(eventId)?.status).toBe("confirmed");

    const lead = insertLead(db, {
      telegramUserId: "tg-user-fg4",
      telegramChatId: "tg-chat-fg4",
      telegramDisplayName: "Лід із підтвердженим заняттям",
    });
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-fg4" });
    updateRequestState(db, request.id, "awaiting_admin");
    db.prepare(
      `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id, request_id)
       VALUES (?, ?, 'confirmed', ?, ?)`,
    ).run("2026-07-06T10:00:00+03:00", "2026-07-06T11:00:00+03:00", eventId, request.id);
    db.close();

    const response = await DELETE(new Request(leadsUrl(lead.id), { method: "DELETE" }), paramsFor(lead.id));

    expect(response.status).toBe(200);
    // Today's route's SELECT filters `b.status = 'pending'` only — a
    // confirmed booking's event is never touched, so this is still
    // 'confirmed' (defined), not deleted.
    expect(calendar.getEvent(eventId)).toBeUndefined();

    const verifyDb = openDatabase(dbPath);
    const remainingLead = verifyDb.prepare(`SELECT * FROM leads WHERE id = ?`).get(lead.id);
    expect(remainingLead).toBeUndefined();
    verifyDb.close();
  });
});
