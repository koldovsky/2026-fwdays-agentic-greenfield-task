import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/format";

describe("UAH money formatting", () => {
  // @trace FR-8 FR-9 FR-10 FR-16 FR-20
  it.each([
    [12.5, "12,50 грн"],
    [0, "0,00 грн"],
    [300, "300,00 грн"],
  ] as const)("formats %s with a hryvnia suffix", (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });

  it("uses Ukrainian grouping without a dollar sign or USD code", () => {
    expect(formatMoney(3216)).toMatch(/^3\s216,00 грн$/);
    expect(formatMoney(3216)).not.toMatch(/\$|USD|US\$/);
  });
});

// @trace FR-8, FR-9, FR-10, FR-16, FR-20
