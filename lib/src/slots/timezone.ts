// TYPED THROWING STUB — red state for tasks.md section 2. The signatures
// below are the contract pinned by timezone.test.ts; the bodies are
// implemented in tasks.md section 3 (3.5). No logic lives here yet.
//
// This module is the ONLY place in the codebase that touches a timezone/DST
// rule (design.md Decision 3) — used solely at the adapter boundary, never
// inside grid/subtract/rank/widen internals.

/**
 * Europe/Kyiv wall-clock "YYYY-MM-DDTHH:mm" (no offset) -> RFC3339 UTC
 * (e.g. "2026-07-06T07:00:00.000Z"). The wall-clock grid starts never
 * shift across a DST transition; only the UTC offset used here changes
 * (EET UTC+2 winter, EEST UTC+3 summer).
 */
const KYIV_TZ = "Europe/Kyiv";

/** en-US/h23 keeps the formatted parts unambiguous (00-23 hour, no locale
 * punctuation quirks) — this is the ONLY place a timezone name is used in
 * this codebase (Decision 3). */
const KYIV_PARTS_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: KYIV_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

interface WallClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function kyivPartsOf(instant: Date): WallClockParts {
  const parts = KYIV_PARTS_FORMAT.formatToParts(instant);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * The Europe/Kyiv UTC offset, in minutes, in effect at `instant` (EET = +120
 * in winter, EEST = +180 in summer). Derived from Intl.DateTimeFormat's IANA
 * tz data — no external timezone library (Decision 3).
 */
function kyivOffsetMinutesAt(instant: Date): number {
  const p = kyivPartsOf(instant);
  const asIfUtcMillis = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asIfUtcMillis - instant.getTime()) / 60000;
}

export function kyivWallClockToUtc(local: string): string {
  const [datePart, timePart] = local.split("T");
  const [year, month, day] = datePart!.split("-").map(Number);
  const [hour, minute] = timePart!.split(":").map(Number);

  // Naive guess: treat the wall-clock components as if they were already
  // UTC, then look up the Kyiv offset in effect near that instant — safe
  // because the offset only changes at 01:00 UTC on the DST transition
  // Sundays, far from the 10:00-19:00 wall-clock grid this function serves.
  const naiveUtcMillis = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0, 0);
  const offsetMinutes = kyivOffsetMinutesAt(new Date(naiveUtcMillis));
  const realUtcMillis = naiveUtcMillis - offsetMinutes * 60000;
  return new Date(realUtcMillis).toISOString();
}

/**
 * RFC3339 UTC timestamp -> Europe/Kyiv wall-clock "YYYY-MM-DDTHH:mm".
 * Applied by the CalendarPort adapter to every busy interval BEFORE it
 * crosses back into lib/ (spec.md Conventions: no grid-vs-calendar
 * comparison ever happens in raw UTC).
 */
export function utcToKyivWallClock(utc: string): string {
  const p = kyivPartsOf(new Date(utc));
  const date = `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  const time = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  return `${date}T${time}`;
}
