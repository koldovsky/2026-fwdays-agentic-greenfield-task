import { describe, expect, it } from "vitest";
import { historyWindow } from "./historyWindow";

/** @trace FR-HISTORY-02 */
describe("historyWindow", () => {
  it("computes a 30-day window ending today (Kyiv calendar)", () => {
    const now = new Date("2026-06-30T10:00:00Z");
    expect(historyWindow(now)).toEqual({ start: "20260601", end: "20260630" });
  });

  it("supports a custom day count", () => {
    const now = new Date("2026-06-30T10:00:00Z");
    expect(historyWindow(now, 7)).toEqual({ start: "20260624", end: "20260630" });
  });

  it("crosses a year boundary correctly", () => {
    const now = new Date("2026-01-05T10:00:00Z");
    expect(historyWindow(now, 10)).toEqual({ start: "20251227", end: "20260105" });
  });
});
