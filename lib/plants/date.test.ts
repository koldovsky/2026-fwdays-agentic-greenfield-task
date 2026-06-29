// RED (Phase 4b) — written from the spec/design BEFORE the implementation.
// Pure date helpers (design.md D3): an ISO-vs-today future-date check that is
// timezone-stable (compares YYYY-MM-DD strings, never Date objects, to dodge the
// UTC/Kiev midnight off-by-one footgun — design R2), plus the DD.MM.YYYY display
// formatter. Imports fail until lib/plants/date.ts exists.
//
// @trace SC-2
// @trace SC-1
// @trace FR-PLANT-03
import { describe, expect, it } from "vitest";

import {
  formatAcquiredDate,
  isAfterToday,
  todayInKiev,
} from "@/lib/plants/date";

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

  it("returns false for today (today is allowed — not in the future)", () => {
    expect(isAfterToday(TODAY, TODAY)).toBe(false);
  });

  it("returns true for tomorrow (a future date is rejected)", () => {
    expect(isAfterToday("2026-06-30", TODAY)).toBe(true);
  });

  it("returns false for a past date", () => {
    expect(isAfterToday("2020-01-01", TODAY)).toBe(false);
  });

  it("compares by calendar date, not lexicographic accident — month boundary", () => {
    // 2026-07-01 is after 2026-06-29; 2026-06-09 is before it.
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

  it("does not shift the calendar day (no UTC drift at the boundary)", () => {
    // The whole point of storing a plain date string: 2026-03-01 must display as
    // 01.03.2026 regardless of the runner timezone, never 28.02 / 02.03.
    expect(formatAcquiredDate("2026-03-01")).toBe("01.03.2026");
  });
});
