// tests/integration/slots — task 5.3: free/busy round-trip against the
// REAL DEMO Google Calendar (real service-account credentials, no fixture).
// Seeds ONE busy event (a tentative hold, the same call hold.ts's
// createHold would make) inside proposeSlots()'s horizon, asserts the
// overlapped grid slot is excluded from the ranked proposal while its two
// immediate 60-minute neighbours are present, logs the ranked pool for
// manual inspection, then deletes the seed so the calendar returns to
// baseline (hermetic rerun).
//
// DEFERRED: a Google Calendar UI screenshot of the tentative event
// appearing/disappearing is part of task 5.3's original scope but needs a
// logged-in browser session (chrome-devtools MCP), which this Vitest
// process does not have — deferred to the QA-proof stage. See tasks.md 5.3
// and the task-runner's final report for this note.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { proposeSlots } from "@kamerton/lib/src/slots/propose.ts";
import { kyivWallClockToUtc } from "@kamerton/lib/src/slots/timezone.ts";
import type { GoogleCalendarPort } from "@kamerton/calendar";
import { buildGoogleCalendarPort, ITEST_PREFIX } from "./helpers/env";
import { cleanupLeftoverItestEvents } from "./helpers/cleanup";
import { addDays, todayKyivDateStr, weekdayAbbrev } from "./helpers/dates";

/**
 * Walks forward one Wednesday at a time (starting well in the future, to
 * avoid colliding with anything a human tester or another integration run
 * just touched) until it finds one whose entire 10:00-19:00 Kyiv window is
 * free on the real DEMO calendar — so this test's busy/neighbour
 * assertions hold regardless of whatever else already exists on the
 * calendar, without requiring a pristine calendar as a precondition.
 */
async function findFreeWednesday(port: GoogleCalendarPort, startFrom: string): Promise<string> {
  let candidate = startFrom;
  for (let attempt = 0; attempt < 6; attempt++) {
    while (weekdayAbbrev(candidate) !== "Wed") candidate = addDays(candidate, 1);
    const range = {
      start: kyivWallClockToUtc(`${candidate}T10:00`),
      end: kyivWallClockToUtc(`${candidate}T19:00`),
    };
    const busy = await port.freeBusy(range);
    if (busy.length === 0) return candidate;
    candidate = addDays(candidate, 7);
  }
  throw new Error(
    `[round-trip] could not find a free Wednesday on the DEMO calendar after 6 attempts ` +
      `starting from ${startFrom} — the calendar may be cluttered with leftover events; check manually.`,
  );
}

describe("proposeSlots — real DEMO-calendar free/busy round-trip (5.3)", () => {
  const port = buildGoogleCalendarPort();
  let seededEventId: string | undefined;

  beforeAll(async () => {
    const deleted = await cleanupLeftoverItestEvents();
    if (deleted > 0) {
      console.log(`[round-trip] beforeAll cleanup removed ${deleted} leftover itest event(s)`);
    }
  });

  afterAll(async () => {
    if (seededEventId) {
      await port.deleteEvent(seededEventId).catch(() => {
        // Already gone (e.g. the test's own cleanup ran) — fine.
      });
      seededEventId = undefined;
    }
    await cleanupLeftoverItestEvents();
  });

  // @trace FR-SLOT-01
  // @trace FR-SLOT-04
  it("excludes the seeded busy slot from the proposal and ranks its free neighbours", async () => {
    // Two weeks out keeps this well clear of "today"/"tomorrow", where a
    // human tester following docs/mvp-capability-plan.md's manual smoke
    // (tasks.md 6.9) is most likely to be poking at the calendar by hand.
    const targetDate = await findFreeWednesday(port, addDays(todayKyivDateStr(), 14));
    const busySlot = { start: `${targetDate}T14:00`, end: `${targetDate}T15:00` };

    const seeded = await port.createTentative(
      { start: kyivWallClockToUtc(busySlot.start), end: kyivWallClockToUtc(busySlot.end) },
      `${ITEST_PREFIX} round-trip seed busy`,
      "Created by tests/integration/slots/round-trip.test.ts — safe to delete if left behind.",
    );
    seededEventId = seeded.eventId;

    const result = await proposeSlots(port, {
      from: targetDate,
      days: 1,
      preferences: {
        weekdays: [weekdayAbbrev(targetDate)],
        // Narrow window around the seeded busy hour so the ranked pool is
        // small and deterministic: 13:00/15:00/16:00 all fit, 14:00 is
        // removed by the seeded busy event before ranking ever sees it.
        timeWindow: { start: "13:00", end: "17:00" },
      },
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const starts = result.slots.map((s) => s.start);
    // Manual-inspection artifact (tasks.md 5.3: "ranked top-2/3 slots
    // printed and manually inspected").
    console.log(
      `[round-trip] ranked top-${result.slots.length} for ${targetDate} ` +
        `(widened="${result.widened}"):`,
      starts,
    );

    expect(starts).not.toContain(busySlot.start);
    expect(starts).toContain(`${targetDate}T13:00`);
    expect(starts).toContain(`${targetDate}T15:00`);

    await port.deleteEvent(seededEventId);
    seededEventId = undefined;

    const afterDelete = await port.freeBusy({
      start: kyivWallClockToUtc(`${targetDate}T10:00`),
      end: kyivWallClockToUtc(`${targetDate}T19:00`),
    });
    expect(afterDelete).toHaveLength(0);
  });
});
