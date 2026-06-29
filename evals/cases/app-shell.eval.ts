// Eval case (Phase 4b authored, graded in Phase 6) for the app-shell slice.
// Grades the QUALITATIVE clarity of an inline validation error surfaced via the
// shared FR-SHELL-03 pattern (server-action result -> <FieldError>) in
// Ukrainian. Tests assert the exact mechanics (shape, id wiring); this eval
// scores whether the message a human reads is clear, blame-free, and actionable.
//
// @trace FR-SHELL-03
// @trace NFR-LOC-01

// Self-contained EvalCase shape — mirrors evals/README.md and the eval-suite
// workflow contract (id, trace, dimension, capability, scenario, produce, rubric).
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
    id: "eval-error-clarity-empty-plant-name",
    trace: ["FR-SHELL-03", "NFR-LOC-01"],
    dimension: "error-clarity",
    capability: "app-shell",
    scenario:
      "The Owner submits the add-plant form with the required name left empty. " +
      "The form-backing server action must NOT throw a raw 500; it returns the " +
      "shared { ok: false, fieldErrors } result and the form surfaces the message " +
      "inline next to the name field via <FieldError>. Grade the Ukrainian message " +
      "a human actually reads.",
    // produce() references code that exists AFTER implementation (graded in
    // Phase 6, not now). It exercises the shared pattern and returns the
    // user-visible inline message string for the judge to score.
    produce: async () => {
      // Imported lazily so authoring/collecting this file does not require the
      // implementation to exist yet (RED phase). The eval-suite collect step
      // resolves these once slice 1 is green.
      // @ts-expect-error slice-2 module: lib/plants/validation does not exist
      // yet (this eval is collected/graded in Phase 6 once slice 2 lands). The
      // narrow ts-expect-error keeps every OTHER eval file under typecheck
      // coverage instead of excluding the whole evals/ tree.
      const { validatePlantInput } = await import("@/lib/plants/validation");
      const form = new FormData();
      form.set("name", ""); // required name omitted
      const result = validatePlantInput(form);
      // Expected shape: { ok: false, fieldErrors: { name: "<Ukrainian message>" } }
      return {
        ok: result.ok,
        inlineMessageForName:
          result.ok === false ? result.fieldErrors?.name : undefined,
      };
    },
    rubric: [
      "CRITICAL: the error is returned as an inline field-level message (fieldErrors.name), never a raw 500 or a silent no-op",
      "CRITICAL: the message text is Ukrainian (NFR-LOC-01)",
      "the message names WHAT is wrong (the plant name is required / missing), not a generic 'invalid input'",
      "the message is blame-free and addressed to the Owner (no stack traces, error codes, or driver internals leaking through)",
      "the message is actionable — the Owner can tell what to do to fix it (enter a name)",
    ],
  },
];

export default cases;
