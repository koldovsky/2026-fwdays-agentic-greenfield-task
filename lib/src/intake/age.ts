// TYPED THROWING STUB — red state for tasks.md section 2 (2.1's red half).
// The signature and discriminated result type below are the contract pinned
// by age.test.ts; the body is implemented in tasks.md section 3 (3.1). No
// logic lives here yet — the function body is a single Not-implemented
// throw (same convention as the other section-2 red-round stubs).
//
// Framework-free pure core (TC-PURE-01): pure, synchronous, no I/O, no LLM.
//
// CONTRACT (design.md Decision 1's "Age/format validation gate"):
//   validateAge(age) -> { ok: true; age } | { ok: false; code: "AGE_BELOW_MIN" }
//     Deliberately narrow, matching the baseline spec's own vocabulary — it
//     names ONLY "AGE_BELOW_MIN" (FR-GUARD-04, BC-AGE-01). Text-to-number
//     normalization ("їй сім" -> 7) is the MODEL's job before the tool is
//     ever called (design.md Decision 1); this validator's only remaining
//     job is the guardrail range check the model cannot talk its way
//     around: any age below 4 — including a fractional value like 3.9 —
//     is rejected with "AGE_BELOW_MIN", NEVER rounded/coerced up to the
//     boundary. Ages of exactly 4 and above pass, echoing the validated
//     age back in `{ ok: true; age }`.

/** Discriminated validation result — the spec's only named age error code
 *  (FR-GUARD-04, BC-AGE-01). */
export type AgeValidation = { ok: true; age: number } | { ok: false; code: "AGE_BELOW_MIN" };

const MINIMUM_AGE = 4;

export function validateAge(age: number): AgeValidation {
  // Runtime type/finiteness guard (review-gate finding #2, MAJOR): `age` is
  // typed as `number` at compile time, but the reducer's `amend_field` path
  // carries the model's raw, untyped tool-call value straight through to
  // here — a non-numeric, NaN, or +/-Infinity value would otherwise slip
  // past the `age < MINIMUM_AGE` comparison (`NaN < 4` is always `false`;
  // `Infinity < 4` is `false`) and be echoed back as `{ ok: true, age }`.
  // The guardrail vocabulary stays deliberately narrow (BC-AGE-01 names only
  // "AGE_BELOW_MIN") — no new error code is invented for "not a number";
  // anything that is not a genuine finite number is treated as below the
  // minimum, never as a silent pass.
  if (typeof age !== "number" || !Number.isFinite(age)) {
    return { ok: false, code: "AGE_BELOW_MIN" };
  }
  if (age < MINIMUM_AGE) {
    return { ok: false, code: "AGE_BELOW_MIN" };
  }
  return { ok: true, age };
}
