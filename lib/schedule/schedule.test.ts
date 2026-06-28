import { describe, expect, it } from "vitest";

import type { Settings } from "../types";
import { computeNextReminder, computeSnooze } from "./schedule";

/**
 * Acceptance oracle for the reminder engine (docs/requirements.md, AC-REMIND-*).
 *
 * Reference dates: 2026-06-29 is Monday, 2026-07-03 Friday, 2026-07-04 Saturday.
 * Months are zero-based in the Date constructor (5 = June, 6 = July).
 */

const base: Settings = {
  workStart: "09:00",
  workEnd: "18:00",
  workingDays: [1, 2, 3, 4, 5],
  intervalMinutes: 120,
  snoozeMinutes: 5,
  enabled: true,
  soundEnabled: true,
  soundChoice: "ping",
};

/** Local date helper: minutes default to 0. */
const at = (month: number, day: number, hour: number, minute = 0): Date =>
  new Date(2026, month, day, hour, minute, 0, 0);

describe("computeNextReminder", () => {
  it("AC-REMIND-01: keeps a candidate inside the window (Mon 10:00 → Mon 12:00)", () => {
    expect(computeNextReminder(base, at(5, 29, 10, 0))).toEqual(at(5, 29, 12, 0));
  });

  it("AC-REMIND-02: rolls past workEnd to the next working day (Mon 17:30 → Tue 09:00)", () => {
    expect(computeNextReminder(base, at(5, 29, 17, 30))).toEqual(at(5, 30, 9, 0));
  });

  it("AC-REMIND-03: rolls over the weekend (Fri 17:30 → Mon 09:00)", () => {
    expect(computeNextReminder(base, at(6, 3, 17, 30))).toEqual(at(6, 6, 9, 0));
  });

  it("AC-REMIND-04: rolls from a non-working day (Sat 12:00 → Mon 09:00)", () => {
    expect(computeNextReminder(base, at(6, 4, 12, 0))).toEqual(at(6, 6, 9, 0));
  });

  it("AC-REMIND-05: snaps a pre-window candidate to workStart (Mon 07:30, interval 60 → Mon 09:00)", () => {
    const settings: Settings = { ...base, intervalMinutes: 60 };
    expect(computeNextReminder(settings, at(5, 29, 7, 30))).toEqual(at(5, 29, 9, 0));
  });

  it("AC-REMIND-06: treats workEnd as exclusive (Mon 17:59 → Tue 09:00)", () => {
    expect(computeNextReminder(base, at(5, 29, 17, 59))).toEqual(at(5, 30, 9, 0));
  });

  it("AC-REMIND-07: returns null when disabled", () => {
    const settings: Settings = { ...base, enabled: false };
    expect(computeNextReminder(settings, at(5, 29, 10, 0))).toBeNull();
  });

  it("is deterministic: identical inputs yield identical output", () => {
    const from = at(5, 29, 10, 0);
    expect(computeNextReminder(base, from)).toEqual(computeNextReminder(base, from));
  });

  it("does not mutate the `from` argument", () => {
    const from = at(5, 29, 17, 30);
    const snapshot = from.getTime();
    computeNextReminder(base, from);
    expect(from.getTime()).toBe(snapshot);
  });
});

describe("computeSnooze", () => {
  it("AC-REMIND-08: snoozes inside the window (Mon 14:00 → Mon 14:05)", () => {
    expect(computeSnooze(base, at(5, 29, 14, 0))).toEqual(at(5, 29, 14, 5));
  });

  it("AC-REMIND-09: rolls a snooze past workEnd to the next day (Mon 17:58 → Tue 09:00)", () => {
    expect(computeSnooze(base, at(5, 29, 17, 58))).toEqual(at(5, 30, 9, 0));
  });

  it("returns null when disabled", () => {
    const settings: Settings = { ...base, enabled: false };
    expect(computeSnooze(settings, at(5, 29, 14, 0))).toBeNull();
  });
});
