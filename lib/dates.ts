// Shared pure date helpers (design D3, R2). Promoted from lib/plants/date.ts so
// growth, watering, AND plants reuse one source instead of importing across the
// plants module (a wrong dependency direction) or triplicating. The acquired /
// measurement date is a plain calendar date (`YYYY-MM-DD`), so every operation
// works on the string components — never a `Date` object in some timezone — to
// dodge the UTC-vs-Kiev midnight off-by-one footgun. "Today" is the LOCAL
// calendar date in Europe/Kiev (AGENTS.md).
//
// @trace SC-1
// @trace SC-2

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Today's calendar date in Europe/Kiev as a `YYYY-MM-DD` string. Uses
 * `en-CA` (which renders ISO order) under the Europe/Kiev timezone so the
 * result is the LOCAL calendar day, independent of the runner's timezone.
 */
export function todayInKiev(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kiev",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * True when `iso` (a `YYYY-MM-DD` string) is a calendar date strictly after
 * `today` (also `YYYY-MM-DD`). Compared as zero-padded ISO strings, so the
 * lexicographic order matches the calendar order exactly — no Date objects,
 * no timezone drift (design R2).
 */
export function isAfterToday(iso: string, today: string): boolean {
  return iso > today;
}

/**
 * Add `n` calendar days to an ISO `YYYY-MM-DD` string, returning a `YYYY-MM-DD`
 * string. Parses the components and does the arithmetic in `Date.UTC` purely (no
 * timezone, no display use), then re-formats the components zero-padded — so the
 * calendar day never drifts near a UTC/Kiev midnight (design R1). The single
 * calendar-math home for the reminders `due = lastWateredAt + intervalDays`.
 */
export function addDays(iso: string, n: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const ms = Date.UTC(year, month - 1, day + n);
  const next = new Date(ms);
  const y = String(next.getUTCFullYear()).padStart(4, "0");
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format an ISO `YYYY-MM-DD` calendar date as `DD.MM.YYYY` (Ukrainian display,
 * SC-1). `null`/empty/malformed input yields an empty string (placeholder is
 * the caller's concern). Pure string surgery — never shifts the calendar day.
 */
export function formatAcquiredDate(iso: string | null | undefined): string {
  if (!iso || !ISO_DATE.test(iso)) return "";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}
