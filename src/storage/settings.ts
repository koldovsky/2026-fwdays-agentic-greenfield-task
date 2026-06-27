/**
 * Thin `localStorage` persistence for {@link Settings}.
 *
 * All defaulting/validation lives in the framework-free core
 * (`lib/settings/settings.ts`); this wrapper only touches `localStorage` and is
 * safe to call where it is absent (SSR), returning defaults instead of throwing.
 */

import type { Settings } from "@/lib/types";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  parseStoredSettings,
} from "@/lib/settings/settings";

/** localStorage key under which the settings object is stored (FR-SETTINGS-02). */
export const SETTINGS_STORAGE_KEY = "break-reminder:settings";

/** Load settings from `localStorage`, falling back to defaults. */
export function loadSettings(): Settings {
  if (typeof localStorage === "undefined") {
    return { ...DEFAULT_SETTINGS, workingDays: [...DEFAULT_SETTINGS.workingDays] };
  }
  return parseStoredSettings(localStorage.getItem(SETTINGS_STORAGE_KEY));
}

/** Persist settings to `localStorage`, normalized so only valid data is written. */
export function saveSettings(settings: Settings): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
}

/** Whether any settings have been saved before — used to detect first run (FR-SHELL-03). */
export function hasStoredSettings(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(SETTINGS_STORAGE_KEY) !== null;
}
