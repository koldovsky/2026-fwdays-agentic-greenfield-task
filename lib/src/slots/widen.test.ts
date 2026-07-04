// Test-first (red): lib/src/slots/widen.ts does not exist yet.
//
// Contract this test file pins down (design.md Decision 5's last paragraph,
// spec.md "Fewer than two matches widens the window explicitly"):
//
//   widenAndRank({ from, days, busy, preferences }) -> {
//     slots: RankedSlot[];   // 2-3 slots, ranked by rankSlots() within pool
//     widened: "none" | "time" | "day" | "grid"; // narrowest step that supplied the pool
//     noFreeTimes: boolean;  // true only if Step 3 itself still yields zero
//   }
//
//   `from`/`days` mirror generateGrid()'s explicit-horizon arguments (no
//   implicit "today" — same purity discipline as rankSlots()). Production
//   call sites always pass the 14-day horizon per the baseline spec's
//   Conventions; unit tests use a smaller `days` to keep fixtures small and
//   deterministic without changing the algorithm under test.
//
//   Steps, first one whose cumulative pool reaches 2 free slots wins:
//     1. Time  — preferred time window +-60min, same weekdays, clipped to
//        the grid's 10:00-19:00 start bounds.
//     2. Day   — Step 1's time window, plus the Mon-Fri-adjacent weekday(s)
//        of each preferred weekday (Monday->Tuesday only, Friday->Thursday
//        only, mid-week->both neighbors -- NOT a cyclic wraparound).
//     3. Grid  — the entire Mon-Fri grid across the horizon, ignoring
//        preference entirely.
//   If Step 3 still yields zero, `noFreeTimes` is true and `slots` is `[]`
//   -- an explicit signal, never a silent empty result.
import { describe, expect, it } from "vitest";
import { widenAndRank } from "./widen.ts";

function fullDayBusy(date: string) {
  return { start: `${date}T10:00`, end: `${date}T20:00` };
}

/** Busy the whole Mon-Fri day except one 60-minute free slot. */
function partialDayBusyExcept(date: string, freeStart: string) {
  const starts = [
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
  ];
  return starts
    .filter((s) => s !== freeStart)
    .map((s) => {
      const hour = Number(s.split(":")[0]);
      return { start: `${date}T${s}`, end: `${date}T${String(hour + 1).padStart(2, "0")}:00` };
    });
}

describe("widenAndRank", () => {
  // @trace FR-SLOT-03
  it("Step 1 (time widening): one matching slot triggers a +-60-minute window extension, clipped to the grid, same weekdays", () => {
    // from Monday 2026-07-06, 6-day horizon -> exactly one Tuesday (07-07)
    // in range; the preference's weekday filter already isolates it, so
    // busy=[] is enough to keep the fixture minimal.
    const result = widenAndRank({
      from: "2026-07-06",
      days: 6,
      busy: [],
      preferences: { weekdays: ["Tue"], timeWindow: { start: "10:00", end: "11:00" } },
    });

    // Original window [10:00,11:00) matches only Tuesday 10:00 (1 slot) ->
    // Step 1 widens to [10:00,12:00) (lower bound 09:00 clipped to the
    // grid's 10:00 floor), matching Tuesday 10:00 AND 11:00.
    expect(result.widened).toBe("time");
    expect(result.noFreeTimes).toBe(false);
    expect(result.slots.map((s) => s.start)).toEqual([
      "2026-07-07T10:00",
      "2026-07-07T11:00",
    ]);
  });

  // @trace FR-SLOT-03
  it("Step 2 (day widening): Monday's only Mon-Fri neighbor is Tuesday -- a non-adjacent Friday slot must NOT be pulled in (no cyclic wraparound)", () => {
    const busy = [
      fullDayBusy("2026-07-06"), // Monday: fully busy -> 0 matches even after Step 1
      ...partialDayBusyExcept("2026-07-07", "10:00"), // Tuesday: only 10:00 free (Monday's real neighbor)
      fullDayBusy("2026-07-08"), // Wednesday: not a Monday neighbor -- irrelevant either way
      fullDayBusy("2026-07-09"), // Thursday: not a Monday neighbor -- irrelevant either way
      ...partialDayBusyExcept("2026-07-10", "10:00"), // Friday: only 10:00 free -- the wraparound "trap"
    ];

    const result = widenAndRank({
      from: "2026-07-06",
      days: 6,
      busy,
      preferences: { weekdays: ["Mon"], timeWindow: { start: "10:00", end: "11:00" } },
    });

    // A correct Mon-Fri adjacency table makes the Step-2 pool just
    // [Tue 10:00] -- one slot, still short of 2 -- so the algorithm MUST
    // fall through to Step 3 (full grid) to fill the second seat. A buggy
    // cyclic-neighbor implementation (wrapping Monday's "previous" day to
    // Friday) would wrongly already have 2 matches at Step 2 and report
    // "day" instead of "grid".
    expect(result.widened).toBe("grid");
    expect(result.slots.map((s) => s.start).sort()).toEqual([
      "2026-07-07T10:00",
      "2026-07-10T10:00",
    ]);
  });

  // @trace FR-SLOT-03
  it("Step 2 (day widening): Friday's only Mon-Fri neighbor is Thursday -- a non-adjacent Monday slot must NOT be pulled in (no cyclic wraparound)", () => {
    const busy = [
      ...partialDayBusyExcept("2026-07-06", "10:00"), // Monday: only 10:00 free -- the wraparound "trap"
      fullDayBusy("2026-07-07"), // Tuesday: not a Friday neighbor -- irrelevant either way
      fullDayBusy("2026-07-08"), // Wednesday: not a Friday neighbor -- irrelevant either way
      ...partialDayBusyExcept("2026-07-09", "10:00"), // Thursday: only 10:00 free (Friday's real neighbor)
      fullDayBusy("2026-07-10"), // Friday: fully busy -> 0 matches even after Step 1
    ];

    const result = widenAndRank({
      from: "2026-07-06",
      days: 6,
      busy,
      preferences: { weekdays: ["Fri"], timeWindow: { start: "10:00", end: "11:00" } },
    });

    expect(result.widened).toBe("grid");
    expect(result.slots.map((s) => s.start).sort()).toEqual([
      "2026-07-06T10:00",
      "2026-07-09T10:00",
    ]);
  });

  // @trace FR-SLOT-03
  it("Step 2 (day widening): a mid-week day gets BOTH Mon-Fri neighbors (baseline spec's own Tuesday scenario)", () => {
    const busy = [
      fullDayBusy("2026-07-07"), // Tuesday: fully busy -> 0 matches even after Step 1's +-60min widening
      ...partialDayBusyExcept("2026-07-06", "10:00"), // Monday: only 10:00 free (Tuesday's left neighbor)
      ...partialDayBusyExcept("2026-07-08", "10:00"), // Wednesday: only 10:00 free (Tuesday's right neighbor)
    ];

    const result = widenAndRank({
      from: "2026-07-06",
      days: 6,
      busy,
      preferences: { weekdays: ["Tue"], timeWindow: { start: "10:00", end: "11:00" } },
    });

    expect(result.widened).toBe("day");
    expect(result.slots.map((s) => s.start).sort()).toEqual([
      "2026-07-06T10:00",
      "2026-07-08T10:00",
    ]);
  });

  // @trace FR-SLOT-03
  it("Step 3 (full grid fallback): falls back to the entire Mon-Fri grid, ignoring preference, when Steps 1-2 are still short of 2 matches", () => {
    const busy = [
      fullDayBusy("2026-07-06"), // Monday: fully busy
      fullDayBusy("2026-07-07"), // Tuesday (Monday's only neighbor): fully busy -> Steps 1+2 total 0 matches
      ...partialDayBusyExcept("2026-07-08", "10:00"), // Wednesday: only 10:00 free
      ...partialDayBusyExcept("2026-07-09", "10:00"), // Thursday: only 10:00 free
      fullDayBusy("2026-07-10"), // Friday: fully busy
    ];

    const result = widenAndRank({
      from: "2026-07-06",
      days: 6,
      busy,
      preferences: { weekdays: ["Mon"], timeWindow: { start: "10:00", end: "11:00" } },
    });

    expect(result.widened).toBe("grid");
    expect(result.noFreeTimes).toBe(false);
    expect(result.slots.map((s) => s.start).sort()).toEqual([
      "2026-07-08T10:00",
      "2026-07-09T10:00",
    ]);
  });

  // @trace FR-SLOT-03
  it("true-zero case: a calendar fully busy across the entire 14-day proposal horizon yields an explicit no-free-times outcome, never an empty/silent result", () => {
    const weekdaysInHorizon = [
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
    ];
    const busy = weekdaysInHorizon.map(fullDayBusy);

    const result = widenAndRank({
      from: "2026-07-06",
      days: 14,
      busy,
      preferences: { weekdays: ["Mon"], timeWindow: { start: "10:00", end: "11:00" } },
    });

    expect(result.noFreeTimes).toBe(true);
    expect(result.slots).toEqual([]);
  });
});
