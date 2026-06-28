/**
 * Pure settings defaults, normalization, and validation.
 *
 * Framework-free (TC-PURE-01): no `localStorage`, no DOM. The thin persistence
 * wrapper in `src/storage/settings.ts` delegates here so all the real logic —
 * defaults, default-merge, and validation — stays unit-testable.
 */

import type { Settings, SoundChoice } from "../types";
import { parseHHMM } from "../schedule/schedule";

const SOUND_CHOICES: readonly SoundChoice[] = ["ping", "melody-10", "melody-30"];

/**
 * Calm first-run defaults: 09:00–18:00, Mon–Fri, interval 60, snooze 5,
 * enabled, sound on (FR-SETTINGS-03).
 */
export const DEFAULT_SETTINGS: Settings = {
  workStart: "09:00",
  workEnd: "18:00",
  workingDays: [1, 2, 3, 4, 5],
  intervalMinutes: 60,
  snoozeMinutes: 5,
  enabled: true,
  soundEnabled: true,
  soundChoice: "ping",
};

/** A fresh copy of the defaults (arrays included), safe to mutate. */
function freshDefaults(): Settings {
  return { ...DEFAULT_SETTINGS, workingDays: [...DEFAULT_SETTINGS.workingDays] };
}

/** Returns the value if it is a valid `"HH:MM"` time, else `null`. */
function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    parseHHMM(value);
    return value;
  } catch {
    return null;
  }
}

/** Valid working-day numbers (0=Sun…6=Sat), deduped and sorted, or `null`. */
function normalizeWorkingDays(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const days = value.filter(
    (d): d is number => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6,
  );
  if (days.length === 0) return null;
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

/** A positive integer (≥ 1), else `null`. */
function normalizePositiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

/** A boolean, else `null`. */
function normalizeBool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** A supported local reminder sound, else `null`. */
function normalizeSoundChoice(value: unknown): SoundChoice | null {
  return typeof value === "string" && SOUND_CHOICES.includes(value as SoundChoice)
    ? (value as SoundChoice)
    : null;
}

/**
 * Merge an untrusted value over {@link DEFAULT_SETTINGS}, keeping the default
 * for any field that is missing or invalid. Never throws — first run and
 * corrupt/partial data both yield a usable {@link Settings} (FR-SETTINGS-02/03).
 *
 * The working window is guarded so an inverted/empty `[workStart, workEnd)`
 * never reaches the engine: if the candidate times are not strictly ordered,
 * both fall back to the defaults.
 */
export function normalizeSettings(raw: unknown): Settings {
  const result = freshDefaults();
  if (typeof raw !== "object" || raw === null) {
    return result;
  }
  const r = raw as Record<string, unknown>;

  const workStart = normalizeTime(r.workStart) ?? result.workStart;
  const workEnd = normalizeTime(r.workEnd) ?? result.workEnd;
  if (parseHHMM(workStart) < parseHHMM(workEnd)) {
    result.workStart = workStart;
    result.workEnd = workEnd;
  }

  const workingDays = normalizeWorkingDays(r.workingDays);
  if (workingDays) result.workingDays = workingDays;

  const intervalMinutes = normalizePositiveInt(r.intervalMinutes);
  if (intervalMinutes !== null) result.intervalMinutes = intervalMinutes;

  const snoozeMinutes = normalizePositiveInt(r.snoozeMinutes);
  if (snoozeMinutes !== null) result.snoozeMinutes = snoozeMinutes;

  const enabled = normalizeBool(r.enabled);
  if (enabled !== null) result.enabled = enabled;

  const soundEnabled = normalizeBool(r.soundEnabled);
  if (soundEnabled !== null) result.soundEnabled = soundEnabled;

  const soundChoice = normalizeSoundChoice(r.soundChoice);
  if (soundChoice !== null) result.soundChoice = soundChoice;

  return result;
}

/**
 * Parse a raw stored JSON string into validated {@link Settings}. Returns the
 * defaults when the input is absent or not parseable (FR-SETTINGS-02/03).
 */
export function parseStoredSettings(rawJson: string | null): Settings {
  if (rawJson === null) return freshDefaults();
  try {
    return normalizeSettings(JSON.parse(rawJson));
  } catch {
    return freshDefaults();
  }
}
