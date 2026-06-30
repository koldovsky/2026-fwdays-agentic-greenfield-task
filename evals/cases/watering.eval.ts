// Eval cases (Phase 4b authored, graded in Phase 6) for the add-watering slice.
// Tests assert exact mechanics; these evals score QUALITY a unit test can't: the
// CLARITY of a rejected-watering validation message (an over-long note and a
// future date — FR-WATER-02, FR-WATER-03/SC-2) and the helpfulness of the
// empty-waterings state copy (FR-WATER-03), all in Ukrainian. produce() lazily
// imports slice-4 code (lib/watering/validation, lib/i18n watering copy) that
// lands later; the eval-suite collect step resolves them once the slice is green.
//
// @trace FR-WATER-02
// @trace FR-WATER-03
// @trace NFR-LOC-01

// Self-contained EvalCase shape — mirrors evals/README.md and growth.eval.ts.
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
    id: "eval-error-clarity-invalid-watering",
    trace: ["FR-WATER-02", "NFR-LOC-01"],
    dimension: "error-clarity",
    capability: "watering",
    scenario:
      "The Owner submits a watering with a note longer than 500 characters, and " +
      "separately a watering date in the future. The validator returns the shared " +
      "{ ok:false, fieldErrors } with an inline message on the offending field " +
      "(note / date) — never a raw 500, never truncated, never a silent no-op. " +
      "Grade the Ukrainian messages the Owner reads.",
    produce: async () => {
      // lib/watering/validation lands with the add-watering slice (graded Phase 6).
      const { validateWateringInput } = await import("@/lib/watering/validation");

      const overLong = new FormData();
      overLong.set("wateredOn", "2026-06-20");
      overLong.set("note", "я".repeat(501));
      const overLongResult = validateWateringInput(overLong);

      const future = new FormData();
      future.set("wateredOn", "2999-01-01");
      future.set("note", "");
      const futureResult = validateWateringInput(future);

      return {
        overLongNote: {
          ok: overLongResult.ok,
          inlineMessageForNote:
            overLongResult.ok === false
              ? overLongResult.fieldErrors?.note
              : undefined,
        },
        futureDate: {
          ok: futureResult.ok,
          inlineMessageForDate:
            futureResult.ok === false
              ? futureResult.fieldErrors?.wateredOn
              : undefined,
        },
      };
    },
    rubric: [
      "CRITICAL: each error is an inline field-level message (fieldErrors.note / fieldErrors.wateredOn), never a raw 500 or silent no-op",
      "CRITICAL: the message text is Ukrainian (NFR-LOC-01)",
      "the over-long-note message names WHAT is wrong — the note is too long — AND states the 500-character limit so the Owner knows how much to cut, with no codes or driver internals",
      "the future-date message says the watering date cannot be in the future and hints an acceptable value (today or earlier); blame-free and actionable",
    ],
  },
  {
    id: "eval-usability-empty-waterings-state",
    trace: ["FR-WATER-03", "NFR-LOC-01"],
    dimension: "usability-clarity",
    capability: "watering",
    scenario:
      "The Owner opens a plant that has no watering events yet. Instead of a blank " +
      "area or an error, the waterings section shows a helpful empty state inviting " +
      "them to log the first watering. Grade the Ukrainian copy.",
    produce: async () => {
      // lib/i18n watering empty-state copy lands with the add-watering slice.
      const { uk } = await import("@/lib/i18n/uk");
      return { emptyState: uk.watering?.empty };
    },
    rubric: [
      "CRITICAL: the copy is Ukrainian (NFR-LOC-01)",
      "CRITICAL: it is a helpful empty state, not a blank/placeholder or an error (FR-WATER-03)",
      "it explains there are no waterings logged yet AND invites logging the first one",
      "tone is friendly and addressed to the Owner, not technical",
    ],
  },
];

export default cases;
