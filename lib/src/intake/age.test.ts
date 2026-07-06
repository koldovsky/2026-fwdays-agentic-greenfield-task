// Test-first (red): lib/src/intake/age.ts's `validateAge` does not exist as
// behavior yet (typed throwing stub only) — tasks.md 2.1.
//
// Contract this file pins down for the implementer (design.md Decision 1's
// "Age/format validation gate", spec.md "Minimum-age guardrail"):
//   - `validateAge(age)` is a PURE, synchronous function — deterministic,
//     no LLM involved (spec.md "Enforcement is code, not prompt").
//   - Its vocabulary is deliberately narrow: the ONLY error code is
//     "AGE_BELOW_MIN" (the baseline spec names no other).
//   - Text-to-number normalization is the MODEL's job before the tool is
//     called; this validator never coerces — a fractional 3.9 is rejected
//     as below-minimum, never rounded up to the 4 boundary.
import { describe, expect, it } from "vitest";
import { validateAge } from "./age";

describe("validateAge — minimum-age guardrail (BC-AGE-01)", () => {
  // @trace FR-GUARD-04
  // @trace FR-INTAKE-02
  it("passes a clearly eligible age, echoing it back: validateAge(9) -> { ok: true, age: 9 }", () => {
    expect(validateAge(9)).toEqual({ ok: true, age: 9 });
  });

  // @trace FR-GUARD-04
  it("accepts exactly the age-4 boundary (BC-AGE-01: 'від 4 років' — 4 itself is eligible)", () => {
    expect(validateAge(4)).toEqual({ ok: true, age: 4 });
  });

  // @trace FR-GUARD-04
  // @trace FR-INTAKE-02
  it("rejects age 3 with AGE_BELOW_MIN deterministically, no LLM involved — same result on every call", () => {
    const first = validateAge(3);
    expect(first).toEqual({ ok: false, code: "AGE_BELOW_MIN" });
    // Determinism probe (spec.md "Enforcement is code, not prompt"): a pure
    // function returns the identical result on a repeat call — no
    // model-dependent variance can ever creep in.
    expect(validateAge(3)).toEqual(first);
  });

  // @trace FR-GUARD-04
  it("never coerces/rounds a fractional value up to the boundary: validateAge(3.9) is AGE_BELOW_MIN (the model normalizes, lib re-validates)", () => {
    expect(validateAge(3.9)).toEqual({ ok: false, code: "AGE_BELOW_MIN" });
  });
});

// Regression coverage (review-gate finding #2, MAJOR): validateAge had no
// runtime type/finiteness guard, so a non-numeric/NaN/Infinity value
// (reachable via the reducer's untyped `amend_field` path, e.g. a model
// tool call carrying `value: "seven"` or a NaN from a bad parse) silently
// passed straight through — `age < MINIMUM_AGE` is `false` for both NaN and
// a string, since NaN comparisons are always false and a string is coerced
// oddly by `<`. Guardrail vocabulary stays deliberately narrow
// (AGE_BELOW_MIN only, per BC-AGE-01/design.md — no new error code invented
// for "not a number"): any non-numeric or non-finite value is treated as
// below the minimum, never as a silent pass.
describe("validateAge — runtime type/finiteness guard (review-gate finding #2)", () => {
  // @trace FR-GUARD-04
  it("rejects NaN as AGE_BELOW_MIN, never a silent pass", () => {
    expect(validateAge(NaN)).toEqual({ ok: false, code: "AGE_BELOW_MIN" });
  });

  // @trace FR-GUARD-04
  it("rejects Infinity as AGE_BELOW_MIN, never a silent pass", () => {
    expect(validateAge(Infinity)).toEqual({ ok: false, code: "AGE_BELOW_MIN" });
    expect(validateAge(-Infinity)).toEqual({ ok: false, code: "AGE_BELOW_MIN" });
  });

  // @trace FR-GUARD-04
  it("rejects a non-numeric value (reachable via amend_field's untyped `value`) as AGE_BELOW_MIN, never a silent pass", () => {
    expect(validateAge("7" as unknown as number)).toEqual({ ok: false, code: "AGE_BELOW_MIN" });
    expect(validateAge(null as unknown as number)).toEqual({ ok: false, code: "AGE_BELOW_MIN" });
    expect(validateAge(undefined as unknown as number)).toEqual({ ok: false, code: "AGE_BELOW_MIN" });
  });
});
