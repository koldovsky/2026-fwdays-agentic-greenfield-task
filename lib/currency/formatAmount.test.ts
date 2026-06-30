import { describe, expect, it } from "vitest";
import { formatAmount } from "./formatAmount";

/** @trace FR-CONVERT-04 NFR-LOCALE-01 */
describe("formatAmount", () => {
  it("formats with comma decimal and grouped thousands (uk-UA)", () => {
    expect(formatAmount(1308.4)).toBe(
      (1308.4).toLocaleString("uk-UA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
    expect(formatAmount(1308.4)).toMatch(/^1.308,40$/);
  });

  it('formats zero as "0,00"', () => {
    expect(formatAmount(0)).toBe("0,00");
  });

  it('returns "0,00" for non-finite input', () => {
    expect(formatAmount(NaN)).toBe("0,00");
    expect(formatAmount(Infinity)).toBe("0,00");
  });

  it("never throws", () => {
    expect(() => formatAmount(NaN)).not.toThrow();
  });
});
