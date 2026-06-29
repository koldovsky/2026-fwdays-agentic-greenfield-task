// RED (Phase 4b, slice 7 add-reminders, tasks 1.2–1.5) — written from the
// reminders spec's "Status derivation rule" BEFORE the implementation. Exercises
// the PURE status seam lib/reminders/status.ts: `deriveStatus`, `isDue`, and the
// `urgencyKey` sort key. NO database, NO Date.now() — every date is a fixed
// `YYYY-MM-DD` string and `today` is pinned to 2026-06-30 (Europe/Kiev), so the
// rule is asserted against the SPEC's concrete dates, not the current clock.
// Imports fail until lib/reminders/status.ts is built (that is the intended RED).
//
// Rule (reminders spec):  due = lastWateredAt + intervalDays
//   overdue  — today > due  (also: lastWateredAt === null / never watered)
//   soon     — due == today  OR  due == today + 1
//   healthy  — due >= today + 2
//   isDue    — soon || overdue   (healthy is NOT due)
//   urgency  — most-overdue first; ties break by name then id, deterministically
//
// @trace FR-REM-02
// @trace FR-REM-03
// @trace FR-REM-04
// @trace FR-REM-05
import { describe, expect, it } from "vitest";

import {
  deriveStatus,
  isDue,
  urgencyKey,
  type ReminderStatus,
} from "@/lib/reminders/status";

// Pinned "today" in Europe/Kiev — every scenario below is anchored to it so the
// soon/healthy/overdue boundaries are exact and reproducible.
const TODAY = "2026-06-30";

describe("deriveStatus — the spec's concrete boundary dates (FR-REM-02)", () => {
  it("healthy when the next watering is two or more days away (due 2026-07-05)", () => {
    // intervalDays 7, lastWatered 2026-06-28 -> due 2026-07-05 (5 days out).
    const status = deriveStatus(
      { lastWateredAt: "2026-06-28", intervalDays: 7 },
      TODAY,
    );
    expect(status).toBe<ReminderStatus>("healthy");
  });

  it("soon when due is exactly today (lastWatered 2026-06-23 -> due 2026-06-30)", () => {
    const status = deriveStatus(
      { lastWateredAt: "2026-06-23", intervalDays: 7 },
      TODAY,
    );
    expect(status).toBe<ReminderStatus>("soon");
  });

  it("soon when due is exactly tomorrow (lastWatered 2026-06-24 -> due 2026-07-01)", () => {
    const status = deriveStatus(
      { lastWateredAt: "2026-06-24", intervalDays: 7 },
      TODAY,
    );
    expect(status).toBe<ReminderStatus>("soon");
  });

  it("healthy at the soon/healthy boundary (lastWatered 2026-06-25 -> due 2026-07-02 == today+2)", () => {
    // The exact boundary the spec calls out: due == today + 2 is healthy, NOT soon.
    const status = deriveStatus(
      { lastWateredAt: "2026-06-25", intervalDays: 7 },
      TODAY,
    );
    expect(status).toBe<ReminderStatus>("healthy");
  });

  it("overdue when today is strictly past due (lastWatered 2026-06-20 -> due 2026-06-27 < today)", () => {
    const status = deriveStatus(
      { lastWateredAt: "2026-06-20", intervalDays: 7 },
      TODAY,
    );
    expect(status).toBe<ReminderStatus>("overdue");
  });

  it("overdue when the plant has never been watered (lastWateredAt === null)", () => {
    const status = deriveStatus(
      { lastWateredAt: null, intervalDays: 7 },
      TODAY,
    );
    expect(status).toBe<ReminderStatus>("overdue");
  });
});

describe("deriveStatus — intervalDays = 1 watered today (FR-REM-05)", () => {
  it("is soon: due = today + 1 (the row reads done for today via the water-now no-op)", () => {
    const status = deriveStatus(
      { lastWateredAt: TODAY, intervalDays: 1 },
      TODAY,
    );
    expect(status).toBe<ReminderStatus>("soon");
  });

  it("is healthy when watered today with intervalDays >= 2 (due >= today + 2)", () => {
    const status = deriveStatus(
      { lastWateredAt: TODAY, intervalDays: 2 },
      TODAY,
    );
    expect(status).toBe<ReminderStatus>("healthy");
  });
});

describe("isDue(status) (FR-REM-02, FR-REM-03)", () => {
  it("is true for soon", () => {
    expect(isDue("soon")).toBe(true);
  });
  it("is true for overdue", () => {
    expect(isDue("overdue")).toBe(true);
  });
  it("is false for healthy", () => {
    expect(isDue("healthy")).toBe(false);
  });
});

describe("urgencyKey — most-overdue first, deterministic ties (FR-REM-04)", () => {
  // A row carries the plant (for the name/id tie-break) plus the derived inputs;
  // urgencyKey turns it into a sortable NUMBER so the home list orders by how far
  // past due the plant is. The implementer picks the numeric convention; the
  // tests below assert only the resulting ORDER (the observable contract), via a
  // comparator built from the key, so the magnitude/sign convention is free.
  type Row = {
    plant: { id: number; name: string };
    lastWateredAt: string | null;
    intervalDays: number;
  };

  const sortByUrgency = (rows: Row[], today: string): Row[] =>
    [...rows].sort((a, b) => urgencyKey(a, today) - urgencyKey(b, today));

  it("orders most-overdue first, soon-but-not-overdue last (A overdue 5d, B overdue 1d, C due today)", () => {
    const a: Row = { plant: { id: 1, name: "A" }, lastWateredAt: "2026-06-18", intervalDays: 7 }; // due 06-25, overdue by 5
    const b: Row = { plant: { id: 2, name: "B" }, lastWateredAt: "2026-06-22", intervalDays: 7 }; // due 06-29, overdue by 1
    const c: Row = { plant: { id: 3, name: "C" }, lastWateredAt: "2026-06-23", intervalDays: 7 }; // due 06-30, soon (today)

    // Feed them in a deliberately wrong order to prove the sort orders, not input.
    const ordered = sortByUrgency([c, b, a], TODAY);
    expect(ordered.map((r) => r.plant.name)).toEqual(["A", "B", "C"]);
  });

  it("sorts a never-watered plant to the very top (strongest overdue signal)", () => {
    const never: Row = { plant: { id: 9, name: "Z-never" }, lastWateredAt: null, intervalDays: 7 };
    const soon: Row = { plant: { id: 1, name: "A-soon" }, lastWateredAt: "2026-06-23", intervalDays: 7 }; // due today
    const overdue1: Row = { plant: { id: 2, name: "B-overdue" }, lastWateredAt: "2026-06-22", intervalDays: 7 }; // overdue 1

    const ordered = sortByUrgency([soon, overdue1, never], TODAY);
    expect(ordered[0]?.plant.name).toBe("Z-never");
    // The soon-but-not-overdue plant sorts last.
    expect(ordered[ordered.length - 1]?.plant.name).toBe("A-soon");
  });

  it("breaks an equal overdue gap deterministically by name then id (reproducible)", () => {
    // Same lastWatered + interval -> identical overdue gap; the tie must resolve
    // by name (then id), so the order is stable across reloads.
    const beta: Row = { plant: { id: 10, name: "Бета" }, lastWateredAt: "2026-06-20", intervalDays: 7 };
    const alpha: Row = { plant: { id: 11, name: "Альфа" }, lastWateredAt: "2026-06-20", intervalDays: 7 };

    const ordered = sortByUrgency([beta, alpha], TODAY);
    expect(ordered.map((r) => r.plant.name)).toEqual(["Альфа", "Бета"]);

    // Same name, different id -> the lower id wins (deterministic secondary key).
    const sameNameLowId: Row = { plant: { id: 5, name: "Same" }, lastWateredAt: "2026-06-20", intervalDays: 7 };
    const sameNameHighId: Row = { plant: { id: 6, name: "Same" }, lastWateredAt: "2026-06-20", intervalDays: 7 };
    const orderedIds = sortByUrgency([sameNameHighId, sameNameLowId], TODAY);
    expect(orderedIds.map((r) => r.plant.id)).toEqual([5, 6]);
  });
});
