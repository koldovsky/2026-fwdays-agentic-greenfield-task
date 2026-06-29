// PURE reminders status seam (design D3). Derives a healthy/soon/overdue status
// from the latest watering date + intervalDays vs a pinned `today` (Europe/Kiev),
// with NO database and NO `Date.now()` — every date is a `YYYY-MM-DD` string and
// `today` is injected, so the rule is testable against concrete dates. The
// calendar math lives in `lib/dates.addDays`, comparisons stay lexicographic on
// the ISO strings (no Date object ever crosses a timezone).
//
// Rule (baseline spec):  due = lastWateredAt + intervalDays
//   overdue  — today > due  (also: lastWateredAt === null / never watered)
//   soon     — due == today  OR  due == today + 1
//   healthy  — due >= today + 2
//
// @trace FR-REM-02
// @trace FR-REM-04
// @trace FR-REM-05
import { addDays } from "@/lib/dates";

export type ReminderStatus = "healthy" | "soon" | "overdue";

/** The derive inputs for one plant: its latest watering date (or null) + interval. */
export interface StatusInput {
  lastWateredAt: string | null;
  intervalDays: number;
}

/**
 * Derive the watering status for a plant from its latest watering date and
 * interval, relative to `today` (a `YYYY-MM-DD` string). A never-watered plant
 * (`lastWateredAt === null`) is overdue — the strongest signal.
 */
export function deriveStatus(
  { lastWateredAt, intervalDays }: StatusInput,
  today: string,
): ReminderStatus {
  if (lastWateredAt === null) return "overdue";

  const due = addDays(lastWateredAt, intervalDays);
  if (today > due) return "overdue";
  if (due === today || due === addDays(today, 1)) return "soon";
  return "healthy";
}

/** A plant is "due" (appears in the reminder list) when it is soon or overdue. */
export function isDue(status: ReminderStatus): boolean {
  return status !== "healthy";
}

/** A row carrying the plant identity (for the tie-break) plus the derive inputs. */
export interface UrgencyRow {
  plant: { id: number; name: string };
  lastWateredAt: string | null;
  intervalDays: number;
}

// A never-watered plant sorts above any dated overdue gap (strongest signal). Its
// gap is a sentinel below every real "days until due", so the ascending sort
// floats it to the top.
const NEVER_WATERED_GAP = -1e9;

// Fractional tie-break weights. The whole-day gap dominates; within an equal gap
// the order falls to the name (lexicographic, via the leading code points) then
// the id — all in the sub-1 fractional range so they never bleed into a
// different gap bucket. The result is a single sortable number whose ascending
// order is (most-overdue first, then name asc, then id asc) — so the test's
// raw `urgencyKey(a) - urgencyKey(b)` comparator is fully deterministic.
const NAME_WEIGHT = 1e-6;
const ID_WEIGHT = 1e-13;

/**
 * A sortable NUMBER expressing how far past due a plant is (with a deterministic
 * name-then-id tie-break baked in), so an ASCENDING sort
 * (`urgencyKey(a) - urgencyKey(b)`) orders most-overdue FIRST and a soon-but-not-
 * overdue plant LAST, with never-watered at the very top. The magnitude/sign
 * convention is internal; only the resulting order is the contract.
 */
export function urgencyKey(row: UrgencyRow, today: string): number {
  const gap =
    row.lastWateredAt === null
      ? NEVER_WATERED_GAP
      : // daysUntilDue: negative when overdue (due in the past), positive when
        // soon. Most-overdue = most negative = sorts first under ascending order.
        daysBetween(today, addDays(row.lastWateredAt, row.intervalDays));

  return gap + nameRank(row.plant.name) * NAME_WEIGHT + row.plant.id * ID_WEIGHT;
}

/**
 * A small monotonic numeric rank for a name from its leading code points, so two
 * names with the same overdue gap order lexicographically (`Альфа` before `Бета`).
 * Bounded to stay inside the fractional tie-break range.
 */
function nameRank(name: string): number {
  let rank = 0;
  let scale = 1;
  for (let i = 0; i < 4; i += 1) {
    scale /= 0x10000;
    rank += (name.codePointAt(i) ?? 0) * scale;
  }
  return rank;
}

/** Whole calendar days from `from` to `to` (both `YYYY-MM-DD`); negative when to < from. */
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const fromMs = Date.UTC(fy, fm - 1, fd);
  const toMs = Date.UTC(ty, tm - 1, td);
  return Math.round((toMs - fromMs) / 86_400_000);
}

/**
 * Total, deterministic comparator for the home reminder list: most-overdue first
 * (ascending urgency key), ties broken by name (locale) then id. Reproducible
 * across reloads (FR-REM-04).
 */
export function compareUrgency(a: UrgencyRow, b: UrgencyRow, today: string): number {
  const byKey = urgencyKey(a, today) - urgencyKey(b, today);
  if (byKey !== 0) return byKey;
  const byName = a.plant.name.localeCompare(b.plant.name);
  if (byName !== 0) return byName;
  return a.plant.id - b.plant.id;
}
