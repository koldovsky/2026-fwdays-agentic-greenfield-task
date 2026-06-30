import { describe, expect, it } from "vitest";
import { SAYINGS } from "./sayings";

/** @trace FR-SAYINGS-01 BC-BRAND-01 */
describe("SAYINGS corpus", () => {
  it("is non-empty", () => {
    expect(SAYINGS.length).toBeGreaterThan(0);
  });

  it("every entry is a non-empty string", () => {
    for (const s of SAYINGS) {
      expect(s.trim().length).toBeGreaterThan(0);
    }
  });

  it("every entry contains Ukrainian (Cyrillic) text", () => {
    for (const s of SAYINGS) {
      expect(s).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("no entry contains an exclamation mark", () => {
    for (const s of SAYINGS) {
      expect(s).not.toMatch(/!/);
    }
  });

  it("has no duplicate entries", () => {
    expect(new Set(SAYINGS).size).toBe(SAYINGS.length);
  });
});
