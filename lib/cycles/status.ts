// @trace FR-CYCLE-04

/**
 * Cycle status lifecycle — pure, framework-free (no Date.now(), no next/*, no react).
 * `now` is always injected so tests are deterministic.
 */

export type CycleStatus = "collecting" | "done" | "expired";

const ONE_DAY_MS = 86_400_000;

/** Midnight (UTC) of a date's calendar day, as an epoch ms. */
function utcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Whole CALENDAR days from today to the deadline day, deadline-day inclusive:
 * the deadline date minus today's date. > 0 = days left; 0 = deadline is today
 * (still open); < 0 = the deadline day has passed. Deadlines are date-only
 * (stored at UTC midnight), so this compares dates, not instants — a deadline
 * "tomorrow" is 1, never 0, fixing the old partial-day floor that read a
 * next-day deadline as overdue.
 */
export function daysRemaining(deadline: Date, now: Date): number {
  return Math.round((utcMidnight(deadline) - utcMidnight(now)) / ONE_DAY_MS);
}

/**
 * Derive the current status of a cycle:
 * - done:       completedAt is set (regardless of deadline — done stays done)
 * - expired:    not completed and the deadline day has fully passed (< 0 days)
 * - collecting: not completed and the deadline is today or later (>= 0 days)
 */
export function deriveStatus(
  { completedAt, deadline }: { completedAt: Date | null; deadline: Date },
  now: Date,
): CycleStatus {
  if (completedAt !== null) return "done";
  if (daysRemaining(deadline, now) < 0) return "expired";
  return "collecting";
}

/**
 * True when every REQUIRED question in `snapshot` has a valid answer in
 * `answers`. Optional questions are ignored entirely.
 *
 * Validity rules per type:
 *   - scale: the answer must be a number that matches one of the anchor values
 *   - open:  the answer must be a non-empty, non-whitespace string
 *
 * `answers` is a flat Record keyed by question id; scale values are numbers,
 * open values are strings.
 */
export function isResponseComplete(
  snapshot: {
    questions: Array<{
      id: string;
      type: string;
      required: boolean;
      anchors?: Array<{ value: number }>;
    }>;
  },
  answers: Record<string, number | string>,
): boolean {
  for (const question of snapshot.questions) {
    if (!question.required) continue;

    const answer = answers[question.id];

    if (question.type === "scale") {
      if (typeof answer !== "number") return false;
      const anchorValues = (question.anchors ?? []).map((a) => a.value);
      if (!anchorValues.includes(answer)) return false;
    } else if (question.type === "open") {
      if (typeof answer !== "string") return false;
      if (answer.trim().length === 0) return false;
    } else {
      // Unrecognised required question type → treat as incomplete (defensive)
      return false;
    }
  }
  return true;
}
