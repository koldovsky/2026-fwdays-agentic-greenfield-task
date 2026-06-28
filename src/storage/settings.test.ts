// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "@/lib/settings/settings";
import { SETTINGS_STORAGE_KEY, loadSettings, saveSettings } from "./settings";

describe("settings storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when storage is empty (first run)", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("persists under the break-reminder:settings key and restores on reload", () => {
    const next = {
      ...DEFAULT_SETTINGS,
      intervalMinutes: 120,
      soundEnabled: false,
      soundChoice: "melody-30" as const,
    };
    saveSettings(next);
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).not.toBeNull();
    expect(loadSettings()).toEqual(next);
  });

  it("recovers to defaults from corrupt stored data", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, "{broken");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("normalizes invalid fields on save", () => {
    saveSettings({ ...DEFAULT_SETTINGS, intervalMinutes: -1 });
    expect(loadSettings().intervalMinutes).toBe(DEFAULT_SETTINGS.intervalMinutes);
  });
});
