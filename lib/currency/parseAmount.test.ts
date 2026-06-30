import { describe, expect, it } from "vitest";
import { parseAmount } from "./parseAmount";

/** @trace FR-CONVERT-02 NFR-LOCALE-01 */
describe("parseAmount", () => {
  it('parses comma decimals ("100,50" → 100.5)', () => {
    expect(parseAmount("100,50")).toBe(100.5);
  });

  it("ignores stray spaces in grouped input", () => {
    expect(parseAmount("1 000,50")).toBe(1000.5);
    expect(parseAmount("1000,50")).toBe(1000.5);
  });

  it("accepts trailing zeros after the decimal", () => {
    expect(parseAmount("100,500")).toBe(100.5);
  });

  it("returns 0 for empty or whitespace-only input", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("   ")).toBe(0);
  });

  it("returns 0 for non-numeric input", () => {
    expect(parseAmount("abc")).toBe(0);
  });

  it("returns 0 for null and undefined", () => {
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
  });

  it("never throws for any input", () => {
    const inputs: unknown[] = [NaN, Infinity, {}, [], Symbol("x"), 42];
    for (const raw of inputs) {
      expect(() => parseAmount(raw)).not.toThrow();
    }
  });
});
