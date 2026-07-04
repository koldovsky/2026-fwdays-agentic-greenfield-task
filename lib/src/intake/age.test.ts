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
