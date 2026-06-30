import { describe, expect, it } from "vitest";
import { formatRate } from "./formatRate";

/**
 * @trace NFR-LOCALE-01
 *
 * Fixed by the global Stage 10 review: the official NBU rate was displayed
 * with up to 4 decimals in the currency list / focus panel / history
 * tooltip, but rounded to a hard 2 decimals in the converter's "1 USD = X"
 * line via formatAmount() — a different rounded number for the same
 * currency on the same screen for any rate needing 3-4 decimal precision
 * (e.g. JPY 0.27749 -> "0,2775" vs "0,28"). formatRate() is now the single
 * source of truth for displaying an official rate; formatAmount() stays
 * fixed-2-decimal for converted money amounts, which is correct as-is.
 */
describe("formatRate", () => {
  it("shows up to 4 decimals for a small-value rate, trimming trailing zeros beyond 2", () => {
    expect(formatRate(0.27749)).toBe(
      (0.27749).toLocaleString("uk-UA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }),
    );
  });

  it("never rounds a 4-decimal rate down to 2 decimals", () => {
    // This is the exact regression the global review caught: formatAmount()
    // would have returned "0,28" here, silently losing precision.
    expect(formatRate(0.27749)).not.toBe("0,28");
  });

  it("still shows exactly 2 decimals for a rate with no further precision", () => {
    expect(formatRate(44.85)).toBe("44,85");
  });

  it('formats zero as "0,00"', () => {
    expect(formatRate(0)).toBe("0,00");
  });

  it('returns "0,00" for non-finite input, never throws', () => {
    expect(formatRate(NaN)).toBe("0,00");
    expect(formatRate(Infinity)).toBe("0,00");
    expect(() => formatRate(NaN)).not.toThrow();
  });
});
