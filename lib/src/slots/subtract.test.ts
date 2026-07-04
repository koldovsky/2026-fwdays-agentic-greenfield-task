// Test-first (red): lib/src/slots/subtract.ts does not exist yet.
//
// Contract this test file pins down (design.md Decision 4, spec.md
// Conventions "Interval semantics (half-open)"):
//   - `subtractBusy(slots, busy)` is PURE and synchronous.
//   - Both `Slot` and `BusyInterval` share the shape `{ start, end }`, using
//     the same Europe/Kyiv wall-clock local "YYYY-MM-DDTHH:mm" strings as
//     grid.ts (no timezone conversion happens in lib/).
//   - A slot occupies `[start, start+60min)`; a busy interval occupies
//     `[busyStart, busyEnd)`. Disqualification: `slot.start < busy.end AND
//     busy.start < slot.end`. Touching boundaries do NOT overlap.
//   - This is the SAME predicate reused (not re-derived) for pending holds
//     from other leads (FR-SLOT-01) — a pending hold's tentative-event
//     interval is passed in the same `busy` array, same shape, no special
//     casing.
import { describe, expect, it } from "vitest";
import { subtractBusy } from "./subtract.ts";

/** Local test fixture builder — NOT the real grid generator (that is
 * grid.test.ts's job); just the 10 hourly Mon-Fri slots for one date, kept
 * here so subtract.test.ts only depends on subtract.ts. */
function daySlots(date: string) {
  const starts = [
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
  ];
  return starts.map((hhmm) => {
    const hour = Number(hhmm.split(":")[0]);
    const endHhmm = `${String(hour + 1).padStart(2, "0")}:00`;
    return { start: `${date}T${hhmm}`, end: `${date}T${endHhmm}` };
  });
}

describe("subtractBusy", () => {
  // @trace FR-SLOT-01
  it("removes exactly the slots that overlap a half-open busy interval and keeps the untouched slots", () => {
    const slots = daySlots("2026-07-07"); // Tuesday
    const busy = [{ start: "2026-07-07T11:30", end: "2026-07-07T13:30" }];

    const free = subtractBusy(slots, busy);
    const freeStarts = free.map((s) => s.start.slice(11, 16));

    // slot.start < busy.end AND busy.start < slot.end disqualifies 11:00,
    // 12:00 and 13:00 (each overlaps 11:30-13:30).
    expect(freeStarts).not.toContain("11:00");
    expect(freeStarts).not.toContain("12:00");
    expect(freeStarts).not.toContain("13:00");
    // 10:00 (ends at 11:00, before busy starts) and 14:00 onward remain free.
    expect(freeStarts.sort()).toEqual(
      ["10:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"].sort(),
    );
    expect(free.length).toBe(7);
  });

  // @trace FR-SLOT-01
  it("keeps a slot that only touches a busy interval's boundary free, and still disqualifies a busy interval fully inside a slot", () => {
    const slots = daySlots("2026-07-08"); // Wednesday
    const busy = [
      // Touches the 11:00 slot's end (11:00-12:00) and the 14:00 slot's
      // start (14:00-15:00) — neither touching slot is disqualified.
      { start: "2026-07-08T12:00", end: "2026-07-08T14:00" },
      // Fully inside the 10:00 slot (10:00-11:00) without touching either
      // of ITS boundaries — still disqualifies the whole slot.
      { start: "2026-07-08T10:15", end: "2026-07-08T10:45" },
    ];

    const free = subtractBusy(slots, busy);
    const freeStarts = free.map((s) => s.start.slice(11, 16));

    // Boundary-touching slots remain free.
    expect(freeStarts).toContain("11:00"); // ends exactly when busy starts
    expect(freeStarts).toContain("14:00"); // starts exactly when busy ends
    // Slots overlapping the 12:00-14:00 busy interval are gone.
    expect(freeStarts).not.toContain("12:00");
    expect(freeStarts).not.toContain("13:00");
    // A busy interval fully inside a slot (not touching its boundaries)
    // still disqualifies that slot.
    expect(freeStarts).not.toContain("10:00");
  });

  // @trace FR-SLOT-01
  it("excludes another lead's pending hold (its tentative-event interval) the same way it excludes calendar busy — same shape, same predicate, no special-casing", () => {
    const slots = daySlots("2026-07-08"); // Wednesday
    const calendarBusy = { start: "2026-07-08T12:00", end: "2026-07-08T13:00" };
    // Lead A's pending hold on Wednesday 15:00 (spec.md scenario "Slots held
    // by other leads are excluded from offers") is passed as a plain
    // BusyInterval — the same shape as a calendar busy interval.
    const pendingHoldFromAnotherLead = {
      start: "2026-07-08T15:00",
      end: "2026-07-08T16:00",
    };

    const free = subtractBusy(slots, [calendarBusy, pendingHoldFromAnotherLead]);
    const freeStarts = free.map((s) => s.start.slice(11, 16));

    expect(freeStarts).not.toContain("12:00"); // excluded by calendar busy
    expect(freeStarts).not.toContain("15:00"); // excluded by the pending hold, identically
    expect(freeStarts).toContain("10:00");
    expect(freeStarts).toContain("14:00");
    expect(freeStarts).toContain("16:00");
  });
});
