// Internal time representation = minutes from 00:00 (see AGENTS.md).

/** "9:00" | "09:00" -> 540. Throws on invalid format/range (R2). */
export function parseTime(raw: string): number {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`invalid time: "${raw}"`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23) throw new Error(`hours out of 0-23: "${raw}"`);
  if (min < 0 || min > 59) throw new Error(`minutes out of 0-59: "${raw}"`);
  return h * 60 + min;
}

/** 540 -> "09:00" */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
