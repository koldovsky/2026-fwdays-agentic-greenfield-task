import { describe, expect, it } from "vitest";
import { selectSaying } from "./selectSaying";

const SAYINGS = ["перший", "другий", "третій", "четвертий"] as const;

/** @trace FR-SAYINGS-01 */
describe("selectSaying", () => {
  it("is deterministic: the same date always selects the same saying", () => {
    const date = new Date("2026-06-30T10:00:00Z");
    expect(selectSaying(SAYINGS, date)).toBe(selectSaying(SAYINGS, date));
  });

  it("selects by day-of-year modulo the corpus length", () => {
    // 2026-01-01 -> day 1 -> index 1 % 4 = 1 -> "другий".
    expect(selectSaying(SAYINGS, new Date("2026-01-01T10:00:00Z"))).toBe("другий");
    // 2026-01-05 -> day 5 -> index 5 % 4 = 1 -> "другий".
    expect(selectSaying(SAYINGS, new Date("2026-01-05T10:00:00Z"))).toBe("другий");
    // 2026-01-04 -> day 4 -> index 4 % 4 = 0 -> "перший".
    expect(selectSaying(SAYINGS, new Date("2026-01-04T10:00:00Z"))).toBe("перший");
  });

  it("two different days normally select different sayings", () => {
    const a = selectSaying(SAYINGS, new Date("2026-01-01T10:00:00Z"));
    const b = selectSaying(SAYINGS, new Date("2026-01-02T10:00:00Z"));
    expect(a).not.toBe(b);
  });

  it("returns an empty string for an empty corpus, never throws", () => {
    expect(() => selectSaying([], new Date())).not.toThrow();
    expect(selectSaying([], new Date())).toBe("");
  });
});
