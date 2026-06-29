// Eval cases (Phase 4b authored, graded in Phase 6) for the add-reminders slice
// (slice 7). Tests assert exact mechanics (status math, due count, ordering);
// these evals score QUALITY a unit test can't: the CLARITY of the urgency-colored
// due line copy a reminder row shows (overdue vs soon — FR-REM-04) and the
// warmth/helpfulness of the all-done empty-state copy (FR-REM-06), all in
// Ukrainian (NFR-LOC-01). produce() lazily imports the slice-7 reminders copy
// that lands later; the eval-suite collect step resolves it once the slice is
// green.
//
// @trace FR-REM-04
// @trace FR-REM-06
// @trace NFR-LOC-01

// Self-contained EvalCase shape — mirrors evals/README.md and watering.eval.ts.
export type EvalCase = {
  id: string;
  trace: string[];
  dimension: string;
  capability: string;
  scenario: string;
  produce: () => Promise<unknown> | unknown;
  rubric: string[];
};

export const cases: EvalCase[] = [
  {
    id: "eval-usability-reminder-due-line-clarity",
    trace: ["FR-REM-04", "NFR-LOC-01"],
    dimension: "usability-clarity",
    capability: "reminders",
    scenario:
      "The Owner opens the home view with one OVERDUE plant and one SOON plant. " +
      "Each reminder row shows a short due line whose wording (and color) reflects " +
      "urgency — overdue reads as 'past due / needs water now', soon reads as 'due " +
      "today or tomorrow'. Grade the Ukrainian due-line copy a row presents.",
    produce: async () => {
      // lib/i18n reminders copy lands with the add-reminders slice (graded Phase 6).
      const { uk } = await import("@/lib/i18n/uk");
      return {
        overdueDueLine: uk.reminders?.dueLineOverdue,
        soonDueLine: uk.reminders?.dueLineSoon,
        waterNowLabel: uk.reminders?.waterNow,
        doneLabel: uk.reminders?.doneLabel,
      };
    },
    rubric: [
      "CRITICAL: the copy is Ukrainian (NFR-LOC-01)",
      "CRITICAL: the overdue and soon due lines are DISTINCT and convey different urgency (overdue = past due / water now; soon = due today or tomorrow) — never the same generic string",
      "the overdue line clearly signals the plant is past due and needs water now; the soon line signals it is due imminently but not yet overdue",
      "the water-now action label and the done/confirmation label ('Полито щойно ✓') are clear, friendly, and addressed to the Owner — not technical",
    ],
  },
  {
    id: "eval-usability-all-done-empty-state",
    trace: ["FR-REM-06", "NFR-LOC-01"],
    dimension: "usability-clarity",
    capability: "reminders",
    scenario:
      "The Owner opens the home view when nothing is due (every plant healthy, or " +
      "no plants). Instead of a blank area or an error, the home shows a warm " +
      "all-done empty state — the title 'Усі политі! 🌱' and a reassurance line. " +
      "Grade the Ukrainian all-done copy.",
    produce: async () => {
      const { uk } = await import("@/lib/i18n/uk");
      return {
        title: uk.reminders?.allDoneTitle,
        reassurance: uk.reminders?.allDoneReassurance,
      };
    },
    rubric: [
      "CRITICAL: the copy is Ukrainian (NFR-LOC-01)",
      "CRITICAL: it reads as a warm all-done CELEBRATION, not a blank/placeholder or an error (FR-REM-06)",
      "the title confirms every plant is watered ('Усі политі! 🌱') and the reassurance line tells the Owner there is nothing to do right now",
      "tone is friendly, reassuring, and addressed to the Owner, not technical",
    ],
  },
];

export default cases;
