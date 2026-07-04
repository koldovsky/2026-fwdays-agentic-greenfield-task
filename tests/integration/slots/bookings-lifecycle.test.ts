// tests/integration/slots — task 5.5: hold.ts's createHold/releaseHold
// against the REAL DEMO calendar, paired with real `bookings` row
// persistence in a REAL on-disk SQLite file (not ":memory:" — exercises
// openDatabase()'s WAL-mode file path, which packages/db/src/schema.test.ts
// deliberately does not, per TC-DATA-01). One sequential flow: hold ->
// insert pending row -> collision on a second hold attempt -> release ->
// row moved out of pending -> calendar event gone.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase, insertBooking, updateBookingStatus, type BookingRow } from "@kamerton/db";
import { createHold, releaseHold } from "@kamerton/lib/src/slots/hold.ts";
import { kyivWallClockToUtc } from "@kamerton/lib/src/slots/timezone.ts";
import type { GoogleCalendarPort } from "@kamerton/calendar";
import { buildGoogleCalendarPort, ITEST_PREFIX } from "./helpers/env";
import { cleanupLeftoverItestEvents } from "./helpers/cleanup";
import { addDays, nextHour, todayKyivDateStr, weekdayAbbrev } from "./helpers/dates";

/**
 * Walks forward one Thursday at a time (starting far enough out to avoid
 * round-trip.test.ts's Wednesday target and anything a human tester is
 * likely poking at) until `hour` on that day is free on the real DEMO
 * calendar. Returns the Kyiv-local wall-clock `Slot`.
 */
async function findFreeThursdayHour(
  port: GoogleCalendarPort,
  startFrom: string,
  hour: string,
): Promise<{ start: string; end: string }> {
  let candidate = startFrom;
  for (let attempt = 0; attempt < 6; attempt++) {
    while (weekdayAbbrev(candidate) !== "Thu") candidate = addDays(candidate, 1);
    const slot = { start: `${candidate}T${hour}`, end: `${candidate}T${nextHour(hour)}` };
    const range = { start: kyivWallClockToUtc(slot.start), end: kyivWallClockToUtc(slot.end) };
    const busy = await port.freeBusy(range);
    if (busy.length === 0) return slot;
    candidate = addDays(candidate, 7);
  }
  throw new Error(
    `[bookings-lifecycle] could not find a free Thursday ${hour} slot on the DEMO calendar ` +
      `after 6 attempts starting from ${startFrom} — check the calendar manually.`,
  );
}

describe("hold lifecycle — real DEMO calendar + real SQLite file (5.5)", () => {
  const port = buildGoogleCalendarPort();
  let dbDir: string;
  let dbPath: string;
  let db: ReturnType<typeof openDatabase>;
  let slot: { start: string; end: string };
  let heldEventId: string | undefined;
  let bookingRow: BookingRow | undefined;

  beforeAll(async () => {
    const deleted = await cleanupLeftoverItestEvents();
    if (deleted > 0) {
      console.log(`[bookings-lifecycle] beforeAll cleanup removed ${deleted} leftover itest event(s)`);
    }

    dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-itest-slots-"));
    dbPath = path.join(dbDir, "bookings.db");
    db = openDatabase(dbPath);

    slot = await findFreeThursdayHour(port, addDays(todayKyivDateStr(), 21), "11:00");
  });

  afterAll(async () => {
    if (heldEventId) {
      await port.deleteEvent(heldEventId).catch(() => {});
      heldEventId = undefined;
    }
    db?.close();
    if (dbDir) rmSync(dbDir, { recursive: true, force: true });
    await cleanupLeftoverItestEvents();
  });

  // @trace FR-SLOT-02
  // @trace TC-DATA-01
  it("holding a free slot creates a tentative event and a pending row with calendar_event_id set", async () => {
    const result = await createHold(port, {
      slot,
      summary: `${ITEST_PREFIX} lifecycle hold`,
      description: "Created by tests/integration/slots/bookings-lifecycle.test.ts — safe to delete.",
    });

    expect(result.status).toBe("held");
    if (result.status !== "held") return;
    heldEventId = result.eventId;

    bookingRow = insertBooking(db, {
      slotStart: kyivWallClockToUtc(slot.start),
      slotEnd: kyivWallClockToUtc(slot.end),
      status: "pending",
      calendarEventId: result.eventId,
    });

    const fromDb = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingRow.id) as BookingRow;
    expect(fromDb.status).toBe("pending");
    expect(fromDb.calendar_event_id).toBe(result.eventId);
  });

  // @trace FR-SLOT-02
  // @trace TC-DATA-01
  it("a second hold attempt on the same slot collides — no second event, no second row", async () => {
    expect(heldEventId).toBeDefined();
    expect(bookingRow).toBeDefined();

    const before = db.prepare("SELECT COUNT(*) AS n FROM bookings").get() as { n: number };

    const result = await createHold(port, {
      slot,
      summary: `${ITEST_PREFIX} lifecycle hold — second lead`,
    });

    expect(result.status).toBe("collision");

    const after = db.prepare("SELECT COUNT(*) AS n FROM bookings").get() as { n: number };
    expect(after.n).toBe(before.n); // hold.ts's contract: a collision never calls createTentative,
    // and this test never calls insertBooking for a non-"held" result — so
    // the row count must be unchanged.

    const pending = db
      .prepare("SELECT COUNT(*) AS n FROM bookings WHERE status = 'pending'")
      .get() as { n: number };
    expect(pending.n).toBe(1); // still exactly the one row from the first hold.
  });

  // @trace FR-SLOT-02
  // @trace TC-DATA-01
  it("releasing the hold removes the calendar event and the row leaves pending", async () => {
    expect(heldEventId).toBeDefined();
    expect(bookingRow).toBeDefined();
    if (!heldEventId || !bookingRow) return;

    await releaseHold(port, heldEventId);
    const changes = updateBookingStatus(db, bookingRow.id, "cancelled");
    expect(changes).toBe(1);
    heldEventId = undefined;

    const pendingRows = db
      .prepare("SELECT * FROM bookings WHERE status = 'pending'")
      .all();
    expect(pendingRows).toHaveLength(0);

    const updatedRow = db.prepare("SELECT status FROM bookings WHERE id = ?").get(bookingRow.id) as {
      status: string;
    };
    expect(updatedRow.status).toBe("cancelled");

    // Calendar back to baseline for this slot — freeBusy reports it free again.
    const afterRelease = await port.freeBusy({
      start: kyivWallClockToUtc(slot.start),
      end: kyivWallClockToUtc(slot.end),
    });
    expect(afterRelease).toHaveLength(0);
  });
});
