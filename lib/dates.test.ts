// RED (Phase 4b) — written from the spec/design BEFORE the implementation.
// The shared date helpers (design D3): growth, watering, AND plants all need
// `todayInKiev` / `isAfterToday` / `formatAcquiredDate`, so they are PROMOTED
// from lib/plants/date.ts to a shared lib/dates.ts (a wrong dependency direction
// otherwise). This test imports the PROMOTED module (`@/lib/dates`) so it stays
// red until the implementer performs the move (D3 green step). The behaviour is
// identical to the slice-2 plant date tests — timezone-stable ISO-string
// comparison (no UTC/Kiev midnight off-by-one, design R2) and DD.MM.YYYY display.
//
// @trace SC-1
// @trace SC-2
import { describe, expect, it } from "vitest";

import { addDays, formatAcquiredDate, isAfterToday, todayInKiev } from "@/lib/dates";

describe("todayInKiev()", () => {
  it("returns today's local calendar date in Europe/Kiev as a YYYY-MM-DD string", () => {
    const today = todayInKiev();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Independently derive the Kiev calendar date and compare as strings, so the
    // assertion is timezone-stable (does not depend on the runner's TZ).
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Kiev",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    expect(today).toBe(parts);
  });
});

describe("isAfterToday(iso, today)", () => {
  // The helper takes an explicit "today" so it can be unit-tested with a fixed
  // clock (design D3 / R2). today is the Kiev calendar date as YYYY-MM-DD.
  const TODAY = "2026-06-29";

  it("returns false for today (today is allowed — not in the future, SC-2)", () => {
    expect(isAfterToday(TODAY, TODAY)).toBe(false);
  });

  it("returns true for tomorrow (a future date is rejected, SC-2)", () => {
    expect(isAfterToday("2026-06-30", TODAY)).toBe(true);
  });

  it("returns false for a past date", () => {
    expect(isAfterToday("2020-01-01", TODAY)).toBe(false);
  });

  it("compares by calendar date across a month boundary, not by accident", () => {
    expect(isAfterToday("2026-07-01", TODAY)).toBe(true);
    expect(isAfterToday("2026-06-09", TODAY)).toBe(false);
  });
});

// RED (Phase 4b, slice 7 add-reminders, task 1.1) — `addDays(iso, n)` is the
// single calendar-math home for the reminders `due = lastWateredAt + intervalDays`
// derivation (design D3, R1). It must add N calendar days to a `YYYY-MM-DD`
// string with NO timezone drift (component arithmetic via Date.UTC, re-format to
// `YYYY-MM-DD`) — never shifting the day near a UTC/Kiev midnight. Imports fail
// (addDays does not exist yet) until the implementer adds it to lib/dates.ts.
//
// @trace FR-REM-02
describe("addDays(iso, n)", () => {
  it("adds N calendar days within a month", () => {
    expect(addDays("2026-06-20", 7)).toBe("2026-06-27");
  });

  it("N = 0 is the identity (same calendar date back)", () => {
    expect(addDays("2026-06-30", 0)).toBe("2026-06-30");
  });

  it("crosses a month boundary (2026-06-30 + 1 -> 2026-07-01)", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
  });

  it("crosses a year boundary (2026-12-31 + 1 -> 2027-01-01)", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles a leap day (2028-02-28 + 1 -> 2028-02-29)", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("does not drift the calendar day regardless of runner timezone", () => {
    // The whole reason for component arithmetic: 2026-03-01 + 0 must stay
    // 2026-03-01, never 2026-02-28 / 2026-03-02 from a UTC round-trip.
    expect(addDays("2026-03-01", 0)).toBe("2026-03-01");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01"); // 2026 is NOT a leap year
  });

  it("zero-pads the re-formatted result", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-09-05", 2)).toBe("2026-09-07");
  });
});

describe("formatAcquiredDate(iso)", () => {
  it("formats an ISO YYYY-MM-DD as DD.MM.YYYY (Ukrainian display, SC-1)", () => {
    expect(formatAcquiredDate("2026-06-29")).toBe("29.06.2026");
  });

  it("zero-pads day and month", () => {
    expect(formatAcquiredDate("2026-01-05")).toBe("05.01.2026");
  });

  it("does not shift the calendar day (no UTC drift at the boundary, SC-1)", () => {
    // The whole point of storing a plain date string: 2026-03-01 must display as
    // 01.03.2026 regardless of the runner timezone, never 28.02 / 02.03.
    expect(formatAcquiredDate("2026-03-01")).toBe("01.03.2026");
  });

  it("yields an empty string for null/empty/malformed input (caller owns the placeholder)", () => {
    expect(formatAcquiredDate(null)).toBe("");
    expect(formatAcquiredDate("")).toBe("");
    expect(formatAcquiredDate("29.06.2026")).toBe("");
  });
});
