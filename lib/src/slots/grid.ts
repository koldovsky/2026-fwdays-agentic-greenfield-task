// TYPED THROWING STUB — red state for tasks.md section 2. The signature and
// types below are the contract pinned by grid.test.ts; the body is
// implemented in tasks.md section 3 (3.1). No logic lives here yet.
//
// Framework-free pure core (TC-PURE-01): no Date.now(), no I/O, no SDKs.

/**
 * One 60-minute grid slot in Europe/Kyiv wall-clock LOCAL time.
 * `start`/`end` are fixed-width, zero-padded "YYYY-MM-DDTHH:mm" strings —
 * no UTC offset, no "Z" (design.md Decision 3: lib/ never touches a
 * timezone library; fixed width makes lexicographic order chronological).
 * A slot occupies the half-open interval [start, end) (Decision 4).
 */
export interface Slot {
  start: string;
  end: string;
}

/**
 * Deterministic Mon–Fri grid generator (FR-SLOT-01, FR-GUARD-03,
 * BC-SCHEDULE-01): 60-minute slots, starts 10:00–19:00 inclusive
 * Europe/Kyiv wall-clock, never Saturday/Sunday.
 *
 * @param from  First day of the horizon, Europe/Kyiv LOCAL calendar date
 *              "YYYY-MM-DD".
 * @param days  Horizon length in calendar days (production always passes 14
 *              per the baseline spec's Conventions — explicit argument, never
 *              an implicit "today").
 */
/** Fixed-width, zero-padded hour starts, 10:00 through 19:00 inclusive
 * (BC-SCHEDULE-01). Kept as the single source of the grid's hour bounds. */
const HOUR_STARTS = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

/**
 * Weekday of a "YYYY-MM-DD" calendar date, 0 = Sunday .. 6 = Saturday.
 * Calendar-date arithmetic only — a calendar date's weekday does not depend
 * on a timezone, so parsing it as UTC midnight is safe and stays
 * timezone-library-free (TC-PURE-01, Decision 3).
 */
function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** Zero-padded "YYYY-MM-DD" for a UTC-midnight-anchored calendar date. */
function toDateStr(utcMidnight: Date): string {
  const y = utcMidnight.getUTCFullYear();
  const m = String(utcMidnight.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utcMidnight.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// TYPED THROWING STUB (booking-hitl tasks.md A.2, design.md Decision 3) —
// `isSlotOnGrid` is the "one shared predicate, never re-derived" grid-
// membership check `validate-admin-slots.ts` reuses. Body implemented in
// A.2's green half; this red round only pins the signature.
/**
 * True iff `slot` is a member of the deterministic Mon–Fri grid this same
 * file's `generateGrid` produces: Europe/Kyiv wall-clock local, Mon–Fri
 * only, a start in `HOUR_STARTS` (10:00–19:00 inclusive), and `end` exactly
 * 60 minutes after `start` on the same calendar date (BC-SCHEDULE-01).
 */
export function isSlotOnGrid(slot: Slot): boolean {
  const date = slot.start.slice(0, 10);
  const startTime = slot.start.slice(11, 16);
  const endDate = slot.end.slice(0, 10);
  const endTime = slot.end.slice(11, 16);

  if (endDate !== date) {
    return false;
  }

  const dow = weekdayOf(date);
  if (dow === 0 || dow === 6) {
    return false;
  }

  if (!HOUR_STARTS.includes(startTime)) {
    return false;
  }

  const startHour = Number(startTime.slice(0, 2));
  const expectedEnd = `${String(startHour + 1).padStart(2, "0")}:00`;
  return endTime === expectedEnd;
}

export function generateGrid(from: string, days: number): Slot[] {
  const [y, m, d] = from.split("-").map(Number) as [number, number, number];
  const baseMillis = Date.UTC(y, m - 1, d);
  const slots: Slot[] = [];

  for (let i = 0; i < days; i++) {
    const dayDate = new Date(baseMillis + i * 24 * 60 * 60 * 1000);
    const dateStr = toDateStr(dayDate);
    const dow = weekdayOf(dateStr);
    if (dow === 0 || dow === 6) {
      continue; // Sunday / Saturday — never in the grid (BC-SCHEDULE-01).
    }

    for (const start of HOUR_STARTS) {
      const startHour = Number(start.slice(0, 2));
      const end = `${String(startHour + 1).padStart(2, "0")}:00`;
      slots.push({ start: `${dateStr}T${start}`, end: `${dateStr}T${end}` });
    }
  }

  return slots;
}
