export const FOCUS_PRESETS = [2, 5, 15, 25] as const;

export type FocusPresetMinutes = (typeof FOCUS_PRESETS)[number];

export const EXTEND_MINUTES = 5;

export const SHRINK_MINUTES = 2;

export function isFocusPreset(minutes: number): minutes is FocusPresetMinutes {
  return (FOCUS_PRESETS as readonly number[]).includes(minutes);
}
