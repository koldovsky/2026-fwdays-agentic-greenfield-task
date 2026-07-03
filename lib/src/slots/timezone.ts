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
export function kyivWallClockToUtc(local: string): string {
  void local;
  throw new Error(
    "Not implemented: kyivWallClockToUtc (red — implemented in tasks.md section 3)",
  );
}

/**
 * RFC3339 UTC timestamp -> Europe/Kyiv wall-clock "YYYY-MM-DDTHH:mm".
 * Applied by the CalendarPort adapter to every busy interval BEFORE it
 * crosses back into lib/ (spec.md Conventions: no grid-vs-calendar
 * comparison ever happens in raw UTC).
 */
export function utcToKyivWallClock(utc: string): string {
  void utc;
  throw new Error(
    "Not implemented: utcToKyivWallClock (red — implemented in tasks.md section 3)",
  );
}
