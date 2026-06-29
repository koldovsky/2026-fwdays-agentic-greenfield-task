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

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; fieldErrors?: FieldErrors; formError?: string };

/** Success arm. Optional payload travels under `data` for later slices. */
export const ok = <T>(data?: T): ActionResult<T> => ({ ok: true, data });

/** Failure arm: per-field Ukrainian messages keyed by field name. */
export const fieldError = (fieldErrors: FieldErrors): ActionResult<never> => ({
  ok: false,
  fieldErrors,
});

/** Failure arm: a whole-form Ukrainian message (e.g. a translated DB error). */
export const formError = (message: string): ActionResult<never> => ({
  ok: false,
  formError: message,
});
