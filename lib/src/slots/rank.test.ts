// Test-first (red): lib/src/slots/rank.ts does not exist yet.
//
// Contract this test file pins down (design.md Decision 5, spec.md
// "Slots are ranked by a pure rankSlots() function"):
//   `rankSlots(freeSlots, preferences, existingBusyIntervals) -> RankedSlot[]`
//   is PURE: no `Date.now()`, no I/O — "now" is never read implicitly and
//   the busy list is always an explicit argument.
//   Scoring is LEXICOGRAPHIC, in this fixed priority order (never combined
//   into one weighted score):
//     1. Preference fit — lead's stated weekdays + time-of-day window.
//     2. Teacher compactness — adjacency to an existing busy interval
//        (either side) beats an isolated 60-minute gap boxed in by busy on
//        BOTH sides (two busy intervals, or a busy interval + grid edge).
//     3. Earlier date, then earlier start time, breaks any remaining tie.
//   `Preferences` shape: `{ weekdays: string[], timeWindow: { start, end } }`
//   (weekday abbreviations "Mon".."Fri"; timeWindow bounds are "HH:mm"
//   Kyiv wall-clock time-of-day, half-open like the grid's own slots).
import { describe, expect, it } from "vitest";
import { rankSlots } from "./rank.ts";

describe("rankSlots", () => {
  // @trace FR-SLOT-04
  it("ranks a slot matching the lead's preferred weekday above an equally-timed slot on a non-preferred weekday (preference fit dominates)", () => {
    const monday10 = { start: "2026-07-06T10:00", end: "2026-07-06T11:00" };
    const friday10 = { start: "2026-07-10T10:00", end: "2026-07-10T11:00" };
    const preferences = {
      weekdays: ["Mon"],
      timeWindow: { start: "10:00", end: "12:00" },
    };

    // Input deliberately out of chronological order to prove this is a real
    // sort, not input-order passthrough.
    const ranked = rankSlots([friday10, monday10], preferences, []);

    expect(ranked[0]).toMatchObject(monday10);
    expect(ranked[1]).toMatchObject(friday10);
  });

  // @trace FR-SLOT-04
  it("breaks a preference-fit tie by teacher compactness: a slot adjacent to busy on only one side beats a slot boxed in by busy on both sides (isolated one-hour gap)", () => {
    // Wednesday busy 12:00-13:00 and 14:00-15:00 leaves exactly one free
    // slot (13:00) boxed in on both sides -- the isolated gap the baseline
    // spec's scenario describes.
    const adjacentOneSide = { start: "2026-07-08T11:00", end: "2026-07-08T12:00" }; // touches busy at 12:00, open at 10:00 on the other side
    const isolatedBothSides = { start: "2026-07-08T13:00", end: "2026-07-08T14:00" }; // touches busy at both 12:00-13:00 and 14:00-15:00
    const existingBusyIntervals = [
      { start: "2026-07-08T12:00", end: "2026-07-08T13:00" },
      { start: "2026-07-08T14:00", end: "2026-07-08T15:00" },
    ];
    // Wide preference window so both candidates fit equally -- isolates the
    // compactness criterion.
    const preferences = {
      weekdays: ["Wed"],
      timeWindow: { start: "10:00", end: "19:00" },
    };

    const ranked = rankSlots(
      [isolatedBothSides, adjacentOneSide],
      preferences,
      existingBusyIntervals,
    );

    expect(ranked[0]).toMatchObject(adjacentOneSide);
    expect(ranked[1]).toMatchObject(isolatedBothSides);
  });

  // @trace FR-SLOT-04
  it("breaks a remaining tie (equal fit, equal compactness) by earlier date", () => {
    const earlierMonday = { start: "2026-07-06T10:00", end: "2026-07-06T11:00" };
    const laterWednesday = { start: "2026-07-08T10:00", end: "2026-07-08T11:00" };
    // Identical relative busy structure on each date makes compactness tie
    // by symmetry, regardless of the concrete compactness algorithm.
    const existingBusyIntervals = [
      { start: "2026-07-06T11:00", end: "2026-07-06T12:00" },
      { start: "2026-07-08T11:00", end: "2026-07-08T12:00" },
    ];
    const preferences = {
      weekdays: ["Mon", "Wed"],
      timeWindow: { start: "10:00", end: "11:00" },
    };

    const ranked = rankSlots(
      [laterWednesday, earlierMonday],
      preferences,
      existingBusyIntervals,
    );

    expect(ranked[0]).toMatchObject(earlierMonday);
    expect(ranked[1]).toMatchObject(laterWednesday);
  });

  // @trace FR-SLOT-04
  it("is pure and deterministic: identical inputs called repeatedly in-process yield an identical ordering, and no I/O is performed", () => {
    const freeSlots = [
      { start: "2026-07-10T10:00", end: "2026-07-10T11:00" }, // Friday
      { start: "2026-07-06T10:00", end: "2026-07-06T11:00" }, // Monday
    ];
    const preferences = {
      weekdays: ["Mon"],
      timeWindow: { start: "10:00", end: "12:00" },
    };
    const existingBusyIntervals: { start: string; end: string }[] = [];

    const originalFetch = globalThis.fetch;
    const originalDateNow = Date.now;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = () => {
      throw new Error("rankSlots() must perform no network I/O");
    };
    Date.now = () => {
      throw new Error("rankSlots() must never read the clock -- pass 'now' as an argument");
    };

    try {
      const first = rankSlots(freeSlots, preferences, existingBusyIntervals);
      const second = rankSlots(freeSlots, preferences, existingBusyIntervals);
      expect(second).toEqual(first);
    } finally {
      globalThis.fetch = originalFetch;
      Date.now = originalDateNow;
    }
  });
});
