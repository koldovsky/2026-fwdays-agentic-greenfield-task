import { describe, expect, it } from "vitest";
import { isStaleRate, kyivDateString } from "./kyivDate";

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
