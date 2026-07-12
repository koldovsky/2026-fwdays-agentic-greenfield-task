import { describe, expect, it } from "vitest";
import {
  type Cents,
  centsFromInput,
  DEFAULT_PREPAYMENT_PERCENT,
  formatAmount,
  invoiceTotal,
  lineAmount,
  prepaymentSplit,
  toCents,
} from "@/lib/invoice-calc/money";
import { isValidationError } from "@/lib/invoice-calc/validation";

function cents(value: number): Cents {
  return toCents(value);
}

describe("centsFromInput", () => {
  const accepted: Array<{ input: string; expected: number }> = [
    { input: "650", expected: 65_000 },
    { input: "650.00", expected: 65_000 },
    { input: "650.5", expected: 65_050 },
    { input: "0.01", expected: 1 },
    { input: "0", expected: 0 },
    { input: "11,050.00", expected: 1_105_000 },
    { input: "1,234,567.89", expected: 123_456_789 },
    { input: "  42.10  ", expected: 4210 },
  ];

  for (const { input, expected } of accepted) {
    it(`parses "${input}" to ${expected} cents`, () => {
      expect(centsFromInput(input)).toBe(expected);
    });
  }

  const rejected = [
    "",
    "   ",
    "-1",
    "1.234",
    "12,34.00",
    "1..2",
    "abc",
    "12abc",
    "1,2345",
    ".50",
  ];

  for (const input of rejected) {
    it(`rejects "${input}" with a reason`, () => {
      const result = centsFromInput(input);
      expect(isValidationError(result)).toBe(true);
      if (isValidationError(result)) {
        expect(result.reason.length).toBeGreaterThan(0);
      }
    });
  }
});

// @trace FR-CALC-03
describe("lineAmount (FR-CALC-03)", () => {
  it("derives 650.00 × 17 = 11,050.00", () => {
    const amount = lineAmount(cents(65_000), 17);
    expect(amount).toBe(1_105_000);
    expect(formatAmount(amount)).toBe("11,050.00");
  });

  it("multiplies without division residue for qty 3 × 0.10", () => {
    expect(lineAmount(cents(10), 3)).toBe(30);
  });

  it("allows quantity 0", () => {
    expect(lineAmount(cents(65_000), 0)).toBe(0);
  });

  it("rejects fractional quantity", () => {
    expect(() => lineAmount(cents(65_000), 1.5)).toThrow(
      /non-negative integer/
    );
  });

  it("rejects negative quantity", () => {
    expect(() => lineAmount(cents(65_000), -1)).toThrow(/non-negative integer/);
  });
});

// @trace FR-CALC-03
describe("invoiceTotal (FR-CALC-03)", () => {
  it("sums line amounts", () => {
    const total = invoiceTotal([cents(1_105_000), cents(30_000), cents(1)]);
    expect(total).toBe(1_135_001);
  });

  it("is 0 for no lines", () => {
    expect(invoiceTotal([])).toBe(0);
  });
});

// @trace FR-CALC-04
describe("prepaymentSplit (FR-CALC-04)", () => {
  it("splits 1,000.00 at 50% into 500.00 + 500.00", () => {
    const { prepayment, balance } = prepaymentSplit(cents(100_000), 50);
    expect(prepayment).toBe(50_000);
    expect(balance).toBe(50_000);
  });

  it("does not lose the odd cent: 0.01 at 50%", () => {
    const total = cents(1);
    const { prepayment, balance } = prepaymentSplit(total, 50);
    expect(prepayment + balance).toBe(total);
    expect(prepayment).toBe(1);
    expect(balance).toBe(0);
  });

  it("handles 0% and 100%", () => {
    const total = cents(123_457);
    expect(prepaymentSplit(total, 0)).toEqual({
      prepayment: 0,
      balance: total,
    });
    expect(prepaymentSplit(total, 100)).toEqual({
      prepayment: total,
      balance: 0,
    });
  });

  it("rejects out-of-range percent", () => {
    expect(() => prepaymentSplit(cents(100), -1)).toThrow(/between 0 and 100/);
    expect(() => prepaymentSplit(cents(100), 101)).toThrow(/between 0 and 100/);
    expect(() => prepaymentSplit(cents(100), Number.NaN)).toThrow(
      /between 0 and 100/
    );
  });

  it("holds prepayment + balance === total for randomised inputs", () => {
    const iterations = 2000;
    const maxCents = 1_000_000_000; // 10,000,000.00 — 0.01 … 10M range
    for (let i = 0; i < iterations; i += 1) {
      const total = cents(1 + Math.floor(Math.random() * maxCents));
      const percent = Math.floor(Math.random() * 101);
      const { prepayment, balance } = prepaymentSplit(total, percent);
      expect(prepayment + balance).toBe(total);
      expect(prepayment).toBe(Math.round((total * percent) / 100));
      expect(Number.isSafeInteger(prepayment)).toBe(true);
      expect(prepayment).toBeGreaterThanOrEqual(0);
      expect(balance).toBeGreaterThanOrEqual(0);
    }
  });
});

// @trace FR-CALC-03
describe("formatAmount (FR-CALC-03)", () => {
  const cases: Array<{ amount: number; expected: string }> = [
    { amount: 1_105_000, expected: "11,050.00" },
    { amount: 0, expected: "0.00" },
    { amount: 1, expected: "0.01" },
    { amount: 10, expected: "0.10" },
    { amount: 100, expected: "1.00" },
    { amount: 123_456_789, expected: "1,234,567.89" },
    { amount: 100_000, expected: "1,000.00" },
  ];

  for (const { amount, expected } of cases) {
    it(`formats ${amount} cents as ${expected}`, () => {
      expect(formatAmount(cents(amount))).toBe(expected);
    });
  }

  it("round-trips through centsFromInput", () => {
    const original = cents(123_456_789);
    expect(centsFromInput(formatAmount(original))).toBe(original);
  });
});

describe("toCents", () => {
  it("rejects fractional and negative values", () => {
    expect(() => toCents(1.5)).toThrow(/non-negative safe integer/);
    expect(() => toCents(-1)).toThrow(/non-negative safe integer/);
  });
});

describe("prepaymentSplit — review regressions (FR-CALC-04)", () => {
  it("pins the spec default of 50 percent", () => {
    expect(DEFAULT_PREPAYMENT_PERCENT).toBe(50);
    const { prepayment, balance } = prepaymentSplit(
      cents(65_000),
      DEFAULT_PREPAYMENT_PERCENT
    );
    expect(prepayment).toBe(32_500);
    expect(balance).toBe(32_500);
  });

  it("rejects totals whose percent product would leave the safe range", () => {
    // 9_007_199_254_740_985 is a valid Cents value, but × 100 exceeds 2^53
    // and used to yield prepayment > total with a negative balance.
    const hugeTotal = cents(9_007_199_254_740_985);
    expect(() => prepaymentSplit(hugeTotal, 100)).toThrow(/stays exact/);
  });
});
