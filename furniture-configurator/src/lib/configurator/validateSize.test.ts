import { describe, expect, it } from "vitest";
import { validateSize } from "./validateSize";
import type { PartSizeSpec } from "./types";

const topSpec: PartSizeSpec = {
  partRole: "TOP",
  allowsCustomSize: true,
  minCm: 30,
  maxCm: 80,
  standardSizesCm: [40, 60],
};

const facadeSpecNoCustom: PartSizeSpec = {
  partRole: "FACADE",
  allowsCustomSize: false,
  minCm: null,
  maxCm: null,
  standardSizesCm: [40, 60],
};

describe("validateSize", () => {
  it("accepts an exact standard size", () => {
    const result = validateSize(topSpec, 60);
    expect(result).toEqual({ valid: true, isStandard: true });
  });

  it("accepts a custom size within the allowed range", () => {
    const result = validateSize(topSpec, 45);
    expect(result).toEqual({ valid: true, isStandard: false });
  });

  it("accepts a custom size at the exact boundary of the range", () => {
    expect(validateSize(topSpec, 30)).toEqual({ valid: true, isStandard: false });
    expect(validateSize(topSpec, 80)).toEqual({ valid: true, isStandard: false });
  });

  it("rejects a custom size below the allowed range", () => {
    const result = validateSize(topSpec, 25);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("30-80");
    }
  });

  it("rejects a custom size above the allowed range", () => {
    const result = validateSize(topSpec, 90);
    expect(result.valid).toBe(false);
  });

  it("rejects a non-standard size when custom sizing is not allowed", () => {
    const result = validateSize(facadeSpecNoCustom, 45);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/не є стандартним/);
    }
  });
});
