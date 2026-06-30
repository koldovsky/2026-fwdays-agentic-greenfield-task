import { describe, expect, it } from "vitest";
import {
  addKyivDays,
  isStaleRate,
  kyivDateString,
  kyivDayOfYear,
  kyivYmd,
} from "./kyivDate";

/** @trace FR-RATES-03 */
describe("kyivDateString", () => {
  it("formats a UTC date as DD.MM.YYYY in Europe/Kyiv", () => {
    // 2026-06-30T10:00:00Z is 13:00 in Kyiv (UTC+3 in summer) — same calendar day.
    expect(kyivDateString(new Date("2026-06-30T10:00:00Z"))).toBe("30.06.2026");
  });

  it("rolls over to the next Kyiv calendar day near UTC midnight", () => {
    // 2026-06-30T22:00:00Z is 2026-07-01T01:00 in Kyiv (summer, UTC+3).
    expect(kyivDateString(new Date("2026-06-30T22:00:00Z"))).toBe("01.07.2026");
  });

  it("pads single-digit day and month", () => {
    expect(kyivDateString(new Date("2026-01-05T10:00:00Z"))).toBe("05.01.2026");
  });
});

/** @trace FR-RATES-03 BC-HONESTY-01 */
describe("isStaleRate", () => {
  it("is false when the exchange date matches today's Kyiv date", () => {
    const now = new Date("2026-06-30T10:00:00Z");
    expect(isStaleRate("30.06.2026", now)).toBe(false);
  });

  it("is true when the exchange date is a previous business day", () => {
    const now = new Date("2026-06-30T10:00:00Z"); // a Tuesday
    expect(isStaleRate("27.06.2026", now)).toBe(true); // the prior Friday
  });

  it("never throws on a malformed exchange date", () => {
    const now = new Date("2026-06-30T10:00:00Z");
    expect(() => isStaleRate("not-a-date", now)).not.toThrow();
    expect(isStaleRate("not-a-date", now)).toBe(true);
  });
});

/** @trace FR-HISTORY-02 */
describe("kyivYmd", () => {
  it("formats a UTC date as YYYYMMDD in Europe/Kyiv", () => {
    expect(kyivYmd(new Date("2026-06-30T10:00:00Z"))).toBe("20260630");
  });

  it("rolls over to the next Kyiv calendar day near UTC midnight", () => {
    expect(kyivYmd(new Date("2026-06-30T22:00:00Z"))).toBe("20260701");
  });

  it("pads single-digit month and day", () => {
    expect(kyivYmd(new Date("2026-01-05T10:00:00Z"))).toBe("20260105");
  });
});

/** @trace FR-HISTORY-02 */
describe("addKyivDays", () => {
  it("subtracts whole calendar days within a month", () => {
    const d = addKyivDays(new Date("2026-06-30T10:00:00Z"), -5);
    expect(kyivYmd(d)).toBe("20260625");
  });

  it("crosses a month boundary", () => {
    const d = addKyivDays(new Date("2026-06-05T10:00:00Z"), -10);
    expect(kyivYmd(d)).toBe("20260526");
  });

  it("crosses a year boundary", () => {
    const d = addKyivDays(new Date("2026-01-05T10:00:00Z"), -10);
    expect(kyivYmd(d)).toBe("20251226");
  });

  it("adds positive deltas forward", () => {
    const d = addKyivDays(new Date("2026-06-25T10:00:00Z"), 5);
    expect(kyivYmd(d)).toBe("20260630");
  });

  it("is immune to DST shifts (UTC-anchored calendar date)", () => {
    // Kyiv DST transitions don't affect whole-day arithmetic on the
    // already-extracted Y/M/D — no time-of-day component survives.
    const d = addKyivDays(new Date("2026-10-30T22:00:00Z"), -1);
    expect(kyivYmd(d)).toBe("20261030");
  });
});

/** @trace FR-SAYINGS-01 */
describe("kyivDayOfYear", () => {
  it("returns 1 for January 1st", () => {
    expect(kyivDayOfYear(new Date("2026-01-01T10:00:00Z"))).toBe(1);
  });

  it("returns 365 for December 31st in a non-leap year", () => {
    // 2026 is not a leap year.
    expect(kyivDayOfYear(new Date("2026-12-31T10:00:00Z"))).toBe(365);
  });

  it("matches the Kyiv calendar date, not the UTC date, near midnight", () => {
    // 2026-06-30T22:00:00Z is 2026-07-01 in Kyiv (summer, UTC+3) — day 182.
    expect(kyivDayOfYear(new Date("2026-06-30T22:00:00Z"))).toBe(182);
  });

  it("accounts for the leap day in a leap year", () => {
    // 2028 is a leap year; March 1st is day 61 (31 + 29 + 1).
    expect(kyivDayOfYear(new Date("2028-03-01T10:00:00Z"))).toBe(61);
  });
});
