// Shared server-action result contract (design.md D3) — FROZEN.
// Every server action backing a form returns this discriminated union; slices
// 2–5 (plants, growth, watering, charts) depend on its exact shape. A
// form-backing action NEVER throws on user input — it catches, translates
// (FK/unique/validation/driver errors → a human Ukrainian message), and returns
// { ok: false, ... } so the failure stays on the same screen.
//
// @trace FR-SHELL-03

/** Field name -> Ukrainian message, so a form can place each message inline. */
export type FieldErrors = Record<string, string>;

/**
 * Submitted field name -> raw submitted string. A failure arm may echo this so
 * the form can repopulate uncontrolled inputs via `defaultValue` after a
 * validation-failure round-trip. This is REQUIRED for "input intact" because
 * React 19's `<form action>` auto-resets uncontrolled fields once the action
 * resolves (design D3); echoing values back is how slices 2–5 keep the Owner's
 * typed data on the screen on `{ ok:false }`.
 */
export type SubmittedValues = Record<string, string>;

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | {
      ok: false;
      fieldErrors?: FieldErrors;
      formError?: string;
      values?: SubmittedValues;
    };

/** Success arm. Optional payload travels under `data` for later slices. */
export const ok = <T>(data?: T): ActionResult<T> => ({ ok: true, data });

/**
 * Failure arm: per-field Ukrainian messages keyed by field name. Optionally
 * echoes the submitted `values` so the form repopulates its inputs after the
 * React 19 form-action auto-reset (keeps the Owner's input intact).
 */
export const fieldError = (
  fieldErrors: FieldErrors,
  values?: SubmittedValues,
): ActionResult<never> => ({
  ok: false,
  fieldErrors,
  ...(values ? { values } : {}),
});

/**
 * Failure arm: a whole-form Ukrainian message (e.g. a translated DB error).
 * Optionally echoes the submitted `values` for input repopulation.
 */
export const formError = (
  message: string,
  values?: SubmittedValues,
): ActionResult<never> => ({
  ok: false,
  formError: message,
  ...(values ? { values } : {}),
});
