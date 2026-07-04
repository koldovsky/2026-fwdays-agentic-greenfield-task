// tests/integration/slots — small calendar-date helpers shared by the
// round-trip and bookings-lifecycle integration tests. Deliberately
// test-only and separate from lib/src/slots/*: those modules keep their
// internal helpers private (design.md's "one predicate, never re-derived"
// discipline is about PRODUCT code; a few lines of test-fixture date
// arithmetic duplicated here is the cheaper trade-off vs. reaching into
// lib/'s unexported internals).

/** Weekday abbreviation for a "YYYY-MM-DD" calendar date — UTC-midnight
 *  anchored, same convention as grid.ts/rank.ts: a calendar date's weekday
 *  does not depend on a timezone. */
export function weekdayAbbrev(dateStr: string): string {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return names[new Date(`${dateStr}T00:00:00Z`).getUTCDay()] ?? "Sun";
}

/** Zero-padded "YYYY-MM-DD" `days` calendar days after `dateStr`. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(y, m - 1, d) + days * 24 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today's Europe/Kyiv-local calendar date, "YYYY-MM-DD" (en-CA locale
 *  formats as YYYY-MM-DD directly). Only used to pick a start point for
 *  "walk forward until free" search loops below — never fed into
 *  grid/rank/widen internals, which take an explicit `from` (design.md
 *  Decision 5's "now is always an argument" purity rule applies to
 *  production code, not this test's own date-fixture bootstrapping). */
export function todayKyivDateStr(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).formatToParts(
    new Date(),
  );
  const map: Record<string, string> = {};
  for (const part of parts) if (part.type !== "literal") map[part.type] = part.value;
  return `${map.year}-${map.month}-${map.day}`;
}

/** "HH:00" one hour after `hhmm` (on-the-hour grid arithmetic only, same as
 *  production's HOUR_STARTS convention). */
export function nextHour(hhmm: string): string {
  const hour = Number(hhmm.slice(0, 2));
  return `${String(hour + 1).padStart(2, "0")}:00`;
}
