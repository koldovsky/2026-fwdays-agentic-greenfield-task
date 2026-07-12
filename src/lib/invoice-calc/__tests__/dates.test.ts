import { describe, expect, it } from "vitest";
import {
  computeDeadline,
  renderDateEn,
  renderDateUa,
} from "@/lib/invoice-calc/dates";
import { isValidationError } from "@/lib/invoice-calc/validation";

// @trace FR-CALC-02
describe("renderDateEn / renderDateUa (FR-CALC-02)", () => {
  const cases: Array<{ iso: string; en: string; ua: string }> = [
    { iso: "2026-05-03", en: "May 03, 2026", ua: "03.05.2026" },
    { iso: "2026-01-01", en: "January 01, 2026", ua: "01.01.2026" },
    { iso: "2026-12-31", en: "December 31, 2026", ua: "31.12.2026" },
    { iso: "2026-11-20", en: "November 20, 2026", ua: "20.11.2026" },
  ];

  for (const { iso, en, ua } of cases) {
    it(`renders ${iso} as "${en}" and "${ua}"`, () => {
      expect(renderDateEn(iso)).toBe(en);
      expect(renderDateUa(iso)).toBe(ua);
    });
  }

  it("throws on malformed or impossible dates", () => {
    expect(() => renderDateEn("03.05.2026")).toThrow(/ISO date/);
    expect(() => renderDateEn("2026-02-30")).toThrow(/ISO date/);
    expect(() => renderDateUa("2026-5-3")).toThrow(/ISO date/);
  });
});

// @trace FR-CALC-05
describe("computeDeadline (FR-CALC-05)", () => {
  it("adds a term in days: 2026-05-03 + 3 days = 2026-05-06", () => {
    expect(computeDeadline("2026-05-03", { days: 3 })).toBe("2026-05-06");
  });

  it("adds a term in weeks: 2026-05-03 + 5 weeks = 2026-06-07", () => {
    expect(computeDeadline("2026-05-03", { weeks: 5 })).toBe("2026-06-07");
  });

  it("rolls over month and year boundaries", () => {
    expect(computeDeadline("2026-05-30", { days: 3 })).toBe("2026-06-02");
    expect(computeDeadline("2026-12-31", { days: 1 })).toBe("2027-01-01");
    expect(computeDeadline("2026-12-20", { weeks: 2 })).toBe("2027-01-03");
    // 2028 is a leap year: Feb 28 + 1 day stays in February.
    expect(computeDeadline("2028-02-28", { days: 1 })).toBe("2028-02-29");
    expect(computeDeadline("2026-02-28", { days: 1 })).toBe("2026-03-01");
  });

  it("passes an explicit date through verbatim", () => {
    expect(computeDeadline("2026-05-03", { date: "2026-07-15" })).toBe(
      "2026-07-15"
    );
  });

  it("accepts an explicit date equal to the issue date", () => {
    expect(computeDeadline("2026-05-03", { date: "2026-05-03" })).toBe(
      "2026-05-03"
    );
  });

  it("rejects an explicit date before the issue date", () => {
    const result = computeDeadline("2026-05-03", { date: "2026-05-02" });
    expect(isValidationError(result)).toBe(true);
    if (isValidationError(result)) {
      expect(result.reason).toContain("before the issue date");
    }
  });

  it("rejects malformed issue and deadline dates", () => {
    expect(isValidationError(computeDeadline("03/05/2026", { days: 3 }))).toBe(
      true
    );
    expect(
      isValidationError(computeDeadline("2026-05-03", { date: "next week" }))
    ).toBe(true);
  });

  it("rejects negative and fractional terms", () => {
    expect(isValidationError(computeDeadline("2026-05-03", { days: -1 }))).toBe(
      true
    );
    expect(
      isValidationError(computeDeadline("2026-05-03", { weeks: 1.5 }))
    ).toBe(true);
  });

  it("allows a zero-day term (deadline on the issue date)", () => {
    expect(computeDeadline("2026-05-03", { days: 0 })).toBe("2026-05-03");
  });
});

describe("computeDeadline — review regressions (FR-CALC-05)", () => {
  it("rejects terms that push the deadline past year 9999 instead of returning garbage", () => {
    // These used to return the success strings "NaN-NaN-NaN" / "15715-11-15".
    expect(
      isValidationError(computeDeadline("2026-05-03", { days: 1_000_000_000 }))
    ).toBe(true);
    expect(
      isValidationError(computeDeadline("2026-05-03", { weeks: 200_000_000 }))
    ).toBe(true);
    expect(
      isValidationError(computeDeadline("2026-05-03", { days: 5_000_000 }))
    ).toBe(true);
  });

  it("still accepts terms that stay within year 9999", () => {
    expect(computeDeadline("9999-12-01", { days: 30 })).toBe("9999-12-31");
    expect(isValidationError(computeDeadline("9999-12-01", { days: 31 }))).toBe(
      true
    );
  });

  it("keeps the YYYY-MM-DD shape for low four-digit years", () => {
    // toIso used to drop the leading zero, emitting "999-01-06".
    expect(computeDeadline("0999-01-01", { days: 5 })).toBe("0999-01-06");
  });
});
