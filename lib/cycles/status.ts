// @trace FR-CYCLE-04

/**
 * Cycle status lifecycle — pure, framework-free (no Date.now(), no next/*, no react).
 * `now` is always injected so tests are deterministic.
 */

export type CycleStatus = "collecting" | "done" | "expired";

/**
 * Derive the current status of a cycle:
 * - done:       completedAt is set (regardless of deadline — done stays done)
 * - expired:    not completed and now > deadline
 * - collecting: not completed and deadline is still in the future
 */
export function deriveStatus(
  { completedAt, deadline }: { completedAt: Date | null; deadline: Date },
  now: Date,
): CycleStatus {
  if (completedAt !== null) return "done";
  if (now > deadline) return "expired";
  return "collecting";
}

/**
 * Whole days from `now` to `deadline`.
 * Positive for a future deadline; zero or negative for a past/today deadline
 * (overdue indicator). Uses Math.floor so a partial-day remainder is NOT
 * counted as a remaining day — the test asserts <= 0 for past deadlines.
 */
export function daysRemaining(deadline: Date, now: Date): number {
  return Math.floor((deadline.getTime() - now.getTime()) / 86_400_000);
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
    }
  }
  return true;
}
