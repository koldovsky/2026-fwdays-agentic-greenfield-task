// Eval cases (Phase 4b authored, graded in Phase 6) for the add-plants slice.
// Tests assert exact mechanics; these evals score QUALITY a unit test can't:
// the empty-state copy's helpfulness (FR-PLANT-08) and a validation message's
// clarity/actionability in Ukrainian. produce() lazily imports slice-2 code that
// lands later; the eval-suite collect step resolves them once the slice is green.
//
// @trace FR-PLANT-08
// @trace FR-PLANT-03
// @trace NFR-LOC-01

// Self-contained EvalCase shape — mirrors evals/README.md and app-shell.eval.ts.
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
    id: "eval-usability-plant-list-empty-state",
    trace: ["FR-PLANT-08", "NFR-LOC-01"],
    dimension: "usability-clarity",
    capability: "plants",
    scenario:
      "The Owner opens the plant list with no plants yet. Instead of a blank " +
      "screen, a helpful empty state invites them to add their first plant. " +
      "Grade the Ukrainian empty-state copy a human actually reads.",
    produce: async () => {
      // lib/i18n plant copy / empty-state string lands with the add-plants
      // slice (graded in Phase 6 once it lands).
      const { uk } = await import("@/lib/i18n/uk");
      return { emptyState: uk.plants?.empty };
    },
    rubric: [
      "CRITICAL: the copy is Ukrainian (NFR-LOC-01)",
      "CRITICAL: it is a helpful empty state, not a blank/placeholder or an error",
      "it explains there are no plants yet AND invites adding the first one (FR-PLANT-08)",
      "tone is friendly and addressed to the Owner, not technical",
    ],
  },
  {
    id: "eval-error-clarity-future-acquired-date",
    trace: ["FR-PLANT-03", "NFR-LOC-01"],
    dimension: "error-clarity",
    capability: "plants",
    scenario:
      "The Owner submits the add-plant form with an acquired date AFTER today " +
      "in Europe/Kiev. The action returns the shared { ok:false, fieldErrors } " +
      "with an inline message on the acquired-date field (never a raw 500). " +
      "Grade the Ukrainian message the Owner reads.",
    produce: async () => {
      // lib/plants/validation lands with the add-plants slice.
      const { validatePlantInput } = await import("@/lib/plants/validation");
      const form = new FormData();
      form.set("name", "Фікус");
      form.set("acquiredDate", "2999-01-01"); // far future
      const result = validatePlantInput(form);
      return {
        ok: result.ok,
        inlineMessageForDate:
          result.ok === false ? result.fieldErrors?.acquiredDate : undefined,
      };
    },
    rubric: [
      "CRITICAL: the error is an inline field-level message (fieldErrors.acquiredDate), never a raw 500 or silent no-op",
      "CRITICAL: the message text is Ukrainian (NFR-LOC-01)",
      "the message names WHAT is wrong — the acquired date cannot be in the future",
      "the message is blame-free and actionable (pick today or an earlier date), no codes or driver internals",
    ],
  },
];

export default cases;
