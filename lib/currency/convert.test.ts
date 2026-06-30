import { describe, expect, it } from "vitest";
import { convert } from "./convert";

/** @trace FR-CONVERT-01 FR-CONVERT-03 FR-CONVERT-05 */
describe("convert", () => {
  const rate = 44.9229;

  it("multiplies by rate for foreign-to-uah", () => {
    expect(convert(100, rate, "foreign-to-uah")).toBeCloseTo(4492.29, 2);
  });

  it("divides by rate for uah-to-foreign", () => {
    expect(convert(4492.29, rate, "uah-to-foreign")).toBeCloseTo(100, 2);
  });

  it("treats swap directions as inverses at the same rate", () => {
    const amount = 250;
    const uah = convert(amount, rate, "foreign-to-uah");
    expect(convert(uah, rate, "uah-to-foreign")).toBeCloseTo(amount, 4);
  });

  it("returns 0 when amount is 0", () => {
    expect(convert(0, rate, "foreign-to-uah")).toBe(0);
    expect(convert(0, rate, "uah-to-foreign")).toBe(0);
  });

  it("returns 0 for non-finite amount", () => {
    expect(convert(NaN, rate, "foreign-to-uah")).toBe(0);
    expect(convert(Infinity, rate, "uah-to-foreign")).toBe(0);
  });

  it("returns 0 for non-positive or non-finite rate", () => {
    expect(convert(100, 0, "foreign-to-uah")).toBe(0);
    expect(convert(100, -5, "uah-to-foreign")).toBe(0);
    expect(convert(100, NaN, "foreign-to-uah")).toBe(0);
    expect(convert(100, Infinity, "uah-to-foreign")).toBe(0);
  });

  it("never throws", () => {
    expect(() => convert(NaN, NaN, "foreign-to-uah")).not.toThrow();
  });
});
