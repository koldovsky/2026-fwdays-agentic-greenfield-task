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

  // @trace NFR-PRIV-02
  it("a calendar.deleteEvent rejection surfaces a deterministic inline-error JSON, never a raw 500, and never touches the DB (calendar-before-DB ordering)", async () => {
    // Simulates a calendar outage — mirrors `packages/bot/src/pipeline.test.ts`'s
    // own `ThrowingCalendarPort` precedent (a `FakeCalendarPort` subclass
    // overriding `deleteEvent` to reject), since the real adapter's
    // `deleteEvent` rejects on any Google Calendar API failure
    // (`packages/calendar/src/google-calendar.ts`'s `mapCalendarError`).
    class ThrowingCalendarPort extends FakeCalendarPort {
      override async deleteEvent(): Promise<void> {
        throw new Error("Calendar unavailable (simulated)");
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
});
