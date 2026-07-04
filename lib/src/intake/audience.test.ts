// Test-first (red): lib/src/intake/audience.ts's `addressesParent` does not
// exist as behavior yet (typed throwing stub only) — tasks.md 2.3.
//
// Contract this file pins down for the implementer (FR-INTAKE-04,
// BC-AGE-02; spec.md "Musical tastes capture"):
//   - `addressesParent(age)` is a PURE, synchronous predicate.
//   - Students YOUNGER than 10 are parent-addressed (favourite cartoons,
//     songs the child sings along to — never addressing the child
//     directly); at exactly 10 and above the student is addressed
//     directly. The boundary follows the spec's own wording ("younger
//     than 10") and its scenario evidence (age 7 -> parent; age 14 ->
//     student), so 9 is the last parent-addressed age and 10 the first
//     student-addressed one.
//   - It is a DERIVED flag, computed live off the current age — never
//     stored (state-machine.test.ts 2.11 proves the flip on amend 9 -> 12).
import { describe, expect, it } from "vitest";
import { addressesParent } from "./audience";

describe("addressesParent — question addressing boundary (BC-AGE-02)", () => {
  // @trace FR-INTAKE-04
  // @trace BC-AGE-02
  it("addresses the parent for a 7-year-old (spec.md's own parent-addressed scenario age)", () => {
    expect(addressesParent(7)).toBe(true);
  });

  // @trace FR-INTAKE-04
  // @trace BC-AGE-02
  it("addresses the parent at 9 — the last age below the 'younger than 10' boundary", () => {
    expect(addressesParent(9)).toBe(true);
  });

  // @trace FR-INTAKE-04
  // @trace BC-AGE-02
  it("addresses the student directly at exactly 10 — 'younger than 10' excludes 10 itself", () => {
    expect(addressesParent(10)).toBe(false);
  });

  // @trace FR-INTAKE-04
  // @trace BC-AGE-02
  it("addresses the student directly at 14 (spec.md's own student-addressed scenario age)", () => {
    expect(addressesParent(14)).toBe(false);
  });
});
