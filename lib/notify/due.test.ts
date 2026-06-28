import { describe, expect, it } from "vitest";

import { isDue, shouldFire } from "./due";

const at = (h: number, m: number): Date => new Date(2026, 5, 29, h, m, 0, 0);

describe("isDue", () => {
  it("is false when there is no target", () => {
    expect(isDue(at(12, 0), null)).toBe(false);
  });
  it("is false before the target", () => {
    expect(isDue(at(11, 59), at(12, 0))).toBe(false);
  });
  it("is true at the target", () => {
    expect(isDue(at(12, 0), at(12, 0))).toBe(true);
  });
  it("is true past the target", () => {
    expect(isDue(at(12, 1), at(12, 0))).toBe(true);
  });
});

describe("shouldFire", () => {
  const target = at(12, 0);

  it("does not fire before due", () => {
    expect(shouldFire(at(11, 59), target, null)).toBe(false);
  });
  it("fires when due and never fired", () => {
    expect(shouldFire(at(12, 0), target, null)).toBe(true);
  });
  it("does not fire twice for the same target", () => {
    expect(shouldFire(at(12, 1), target, target.getTime())).toBe(false);
  });
  it("fires again for a new (rescheduled) target", () => {
    const newer = at(13, 0);
    expect(shouldFire(at(13, 0), newer, target.getTime())).toBe(true);
  });
  it("never fires without a target", () => {
    expect(shouldFire(at(12, 0), null, null)).toBe(false);
  });
});
