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

import { formatAcquiredDate, isAfterToday, todayInKiev } from "@/lib/dates";

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
