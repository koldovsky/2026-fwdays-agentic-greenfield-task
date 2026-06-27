/**
 * Client-side reactive store for settings, exposed to React via
 * `useSyncExternalStore`. This reads the browser-only persistence layer without
 * a mount effect (avoiding `set-state-in-effect`) and keeps SSR deterministic
 * through the server snapshots. The next-reminder target is recomputed here
 * whenever settings change (FR-SETTINGS-04); the clock is read at the boundary
 * and passed into the pure engine (`lib/` stays clock-free, TC-PURE-01).
 */

import type { Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";
import { computeNextReminder, computeSnooze } from "@/lib/schedule/schedule";
import { hasStoredSettings, loadSettings, saveSettings } from "./settings";

let settingsCache: Settings | null = null;
let firstRunCache = false;
let nextReminderCache: Date | null = null;

const listeners = new Set<() => void>();

/** Lazily hydrate the cache from localStorage on first client read. */
function ensureLoaded(): void {
  if (settingsCache === null) {
    settingsCache = loadSettings();
    firstRunCache = !hasStoredSettings();
    nextReminderCache = computeNextReminder(settingsCache, new Date());
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSettingsSnapshot(): Settings {
  ensureLoaded();
  return settingsCache as Settings;
}

export function getServerSettingsSnapshot(): Settings {
  return DEFAULT_SETTINGS;
}

export function getFirstRunSnapshot(): boolean {
  ensureLoaded();
  return firstRunCache;
}

export function getServerFirstRunSnapshot(): boolean {
  return false;
}

export function getNextReminderSnapshot(): Date | null {
  ensureLoaded();
  return nextReminderCache;
}

export function getServerNextReminderSnapshot(): Date | null {
  return null;
}

/** Persist a settings change, recompute the next reminder, and notify React. */
export function updateSettings(next: Settings): void {
  saveSettings(next);
  settingsCache = next;
  firstRunCache = false;
  nextReminderCache = computeNextReminder(next, new Date());
  emit();
}

/** "Took a break": schedule the next reminder a full interval out (FR-NOTIFY-02). */
export function markBreakDone(): void {
  ensureLoaded();
  nextReminderCache = computeNextReminder(settingsCache as Settings, new Date());
  emit();
}

/** "Snooze": reschedule the next reminder by `snoozeMinutes` (FR-NOTIFY-02). */
export function snoozeBreak(): void {
  ensureLoaded();
  nextReminderCache = computeSnooze(settingsCache as Settings, new Date());
  emit();
}
