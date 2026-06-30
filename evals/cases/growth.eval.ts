// Eval cases (Phase 4b authored, graded in Phase 6) for the add-growth slice.
// Tests assert exact mechanics; these evals score QUALITY a unit test can't: the
// CLARITY of a rejected-height validation message (FR-GROWTH-05) and the
// helpfulness of the empty-measurements state copy (FR-GROWTH-02), both in
// Ukrainian. produce() lazily imports slice-3 code (lib/growth/validation,
// lib/i18n growth copy) that lands later; the eval-suite collect step resolves
// them once the slice is green.
//
// @trace FR-GROWTH-05
// @trace FR-GROWTH-02
// @trace NFR-LOC-01

// Self-contained EvalCase shape — mirrors evals/README.md and plants.eval.ts.
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
    id: "eval-error-clarity-invalid-height",
    trace: ["FR-GROWTH-05", "NFR-LOC-01"],
    dimension: "error-clarity",
    capability: "growth",
    scenario:
      "The Owner enters a non-numeric / negative height (e.g. '-3' or 'abc') when " +
      "logging a measurement. The validator returns the shared { ok:false, " +
      "fieldErrors } with an inline message on the height field (never a raw 500 " +
      "or a silent no-op). Grade the Ukrainian message the Owner reads.",
    produce: async () => {
      // lib/growth/validation lands with the add-growth slice (graded in Phase 6).
      const { validateMeasurementInput } = await import("@/lib/growth/validation");
      const negative = new FormData();
      negative.set("heightCm", "-3");
      negative.set("measuredOn", "2026-06-20");
      const negativeResult = validateMeasurementInput(negative);

      const nonNumeric = new FormData();
      nonNumeric.set("heightCm", "abc");
      nonNumeric.set("measuredOn", "2026-06-20");
      const nonNumericResult = validateMeasurementInput(nonNumeric);

      return {
        negative: {
          ok: negativeResult.ok,
          inlineMessageForHeight:
            negativeResult.ok === false
              ? negativeResult.fieldErrors?.heightCm
              : undefined,
        },
        nonNumeric: {
          ok: nonNumericResult.ok,
          inlineMessageForHeight:
            nonNumericResult.ok === false
              ? nonNumericResult.fieldErrors?.heightCm
              : undefined,
        },
      };
    },
    rubric: [
      "CRITICAL: the error is an inline field-level message (fieldErrors.heightCm), never a raw 500 or silent no-op",
      "CRITICAL: the message text is Ukrainian (NFR-LOC-01)",
      "the message names WHAT is wrong — the height must be a positive number in cm",
      "the message is blame-free and actionable (it hints what a valid height looks like, e.g. a positive number, decimals allowed), with no codes or driver internals",
    ],
  },
  {
    id: "eval-usability-empty-measurements-state",
    trace: ["FR-GROWTH-02", "NFR-LOC-01"],
    dimension: "usability-clarity",
    capability: "growth",
    scenario:
      "The Owner opens a plant that has no measurements yet. Instead of a blank " +
      "area or an error, the measurements section shows a helpful empty state " +
      "inviting them to log the first measurement. Grade the Ukrainian copy.",
    produce: async () => {
      // lib/i18n growth empty-state copy lands with the add-growth slice.
      const { uk } = await import("@/lib/i18n/uk");
      return { emptyState: uk.growth?.empty };
    },
    rubric: [
      "CRITICAL: the copy is Ukrainian (NFR-LOC-01)",
      "CRITICAL: it is a helpful empty state, not a blank/placeholder or an error (FR-GROWTH-02)",
      "it explains there are no measurements yet AND invites logging the first one",
      "tone is friendly and addressed to the Owner, not technical",
    ],
  },
];

export default cases;
