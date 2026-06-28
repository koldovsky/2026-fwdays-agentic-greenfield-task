import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  parseStoredSettings,
} from "./settings";

describe("DEFAULT_SETTINGS", () => {
  it("matches the FR-SETTINGS-03 first-run defaults", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      workStart: "09:00",
      workEnd: "18:00",
      workingDays: [1, 2, 3, 4, 5],
      intervalMinutes: 60,
      snoozeMinutes: 5,
      enabled: true,
      soundEnabled: true,
      soundChoice: "ping",
    });
  });
});

describe("parseStoredSettings", () => {
  it("returns defaults on first run (null storage)", () => {
    expect(parseStoredSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults for corrupt JSON", () => {
    expect(parseStoredSettings("{not valid json")).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips a full valid object", () => {
    const custom = {
      workStart: "08:30",
      workEnd: "17:00",
      workingDays: [1, 2, 3],
      intervalMinutes: 45,
      snoozeMinutes: 10,
      enabled: false,
      soundEnabled: false,
      soundChoice: "melody-10",
    };
    expect(parseStoredSettings(JSON.stringify(custom))).toEqual(custom);
  });

  it("does not share the default array reference between calls", () => {
    const a = parseStoredSettings(null);
    a.workingDays.push(6);
    const b = parseStoredSettings(null);
    expect(b.workingDays).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("normalizeSettings", () => {
  it("merges a partial object over defaults", () => {
    expect(normalizeSettings({ intervalMinutes: 120 })).toEqual({
      ...DEFAULT_SETTINGS,
      intervalMinutes: 120,
    });
  });

  it("falls back to defaults for non-object input", () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("nope")).toEqual(DEFAULT_SETTINGS);
  });

  it("rejects malformed times and keeps defaults", () => {
    const out = normalizeSettings({ workStart: "9:00", workEnd: "99:99" });
    expect(out.workStart).toBe("09:00");
    expect(out.workEnd).toBe("18:00");
  });

  it("guards against an inverted window", () => {
    const out = normalizeSettings({ workStart: "20:00", workEnd: "08:00" });
    expect(out.workStart).toBe("09:00");
    expect(out.workEnd).toBe("18:00");
  });

  it("rejects non-positive or non-integer interval/snooze", () => {
    expect(normalizeSettings({ intervalMinutes: 0 }).intervalMinutes).toBe(60);
    expect(normalizeSettings({ intervalMinutes: -5 }).intervalMinutes).toBe(60);
    expect(normalizeSettings({ snoozeMinutes: 1.5 }).snoozeMinutes).toBe(5);
    expect(normalizeSettings({ snoozeMinutes: "x" }).snoozeMinutes).toBe(5);
  });

  it("cleans, dedupes, and sorts working days; drops junk", () => {
    expect(normalizeSettings({ workingDays: [5, 1, 1, 3] }).workingDays).toEqual([1, 3, 5]);
    expect(normalizeSettings({ workingDays: [9, "x", -1] }).workingDays).toEqual([1, 2, 3, 4, 5]);
    expect(normalizeSettings({ workingDays: "mon" }).workingDays).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejects non-boolean flags", () => {
    expect(normalizeSettings({ enabled: "yes" }).enabled).toBe(true);
    expect(normalizeSettings({ soundEnabled: 0 }).soundEnabled).toBe(true);
  });

  it("accepts supported sound choices and rejects unknown values", () => {
    expect(normalizeSettings({ soundChoice: "melody-30" }).soundChoice).toBe("melody-30");
    expect(normalizeSettings({ soundChoice: "wave" }).soundChoice).toBe("ping");
  });
});
