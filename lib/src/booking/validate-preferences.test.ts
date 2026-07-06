// Test-first (red): lib/src/booking/validate-preferences.ts's
// `validatePreferences` body is a Not-implemented throwing stub
// (booking-hitl tasks.md A.9's red half) — every case below is expected to
// FAIL against the stub, for the right reason, until A.10 implements the
// real body.
//
// Contract this file pins down (design.md Decision 2's sub-decision,
// FR-SLOT-01): rejects an empty `weekdays` array, an out-of-enum weekday
// string, or `start >= end`; a valid `{weekdays, timeWindow}` passes.
import { describe, expect, it } from "vitest";
import { validatePreferences } from "./validate-preferences.ts";

describe("validatePreferences — rejections (design.md Decision 2 sub-decision)", () => {
  // @trace FR-SLOT-01
  it("rejects an empty weekdays array", () => {
    const result = validatePreferences({
      weekdays: [],
      timeWindow: { start: "10:00", end: "20:00" },
    });
    expect(result).toEqual({ ok: false, code: "EMPTY_WEEKDAYS" });
  });

  // @trace FR-SLOT-01
  it("rejects an out-of-enum weekday string", () => {
    const result = validatePreferences({
      weekdays: ["Mon", "Sat"],
      timeWindow: { start: "10:00", end: "20:00" },
    });
    expect(result).toEqual({ ok: false, code: "INVALID_WEEKDAY", weekday: "Sat" });
  });

  // @trace FR-SLOT-01
  it("rejects start === end", () => {
    const result = validatePreferences({
      weekdays: ["Tue"],
      timeWindow: { start: "20:00", end: "20:00" },
    });
    expect(result).toEqual({ ok: false, code: "INVALID_TIME_RANGE" });
  });

  // @trace FR-SLOT-01
  it("rejects start > end", () => {
    const result = validatePreferences({
      weekdays: ["Tue"],
      timeWindow: { start: "20:00", end: "17:00" },
    });
    expect(result).toEqual({ ok: false, code: "INVALID_TIME_RANGE" });
  });
});

describe("validatePreferences — a valid preferences object passes", () => {
  // @trace FR-SLOT-01
  it('{weekdays:["Tue","Thu"], timeWindow:{start:"17:00",end:"20:00"}} -> { ok: true }', () => {
    const result = validatePreferences({
      weekdays: ["Tue", "Thu"],
      timeWindow: { start: "17:00", end: "20:00" },
    });
    expect(result).toEqual({ ok: true });
  });
});
