// TYPED THROWING STUB — red state for tasks.md section 2 (2.3's red half).
// The signature below is the canonical contract pinned by audience.test.ts
// (and composed with the reducer by state-machine.test.ts's amend-changes-
// addressing case, tasks.md 2.11); the body is implemented in tasks.md
// section 3 (3.3). No logic lives here yet — the function body is a single
// Not-implemented throw (same convention as the other section-2 red-round
// stubs).
//
// Framework-free pure core (TC-PURE-01): pure, synchronous, no I/O, no LLM.
//
// CONTRACT (FR-INTAKE-04, BC-AGE-02; spec.md "Musical tastes capture"):
//   addressesParent(age) -> boolean
//     `true` when the student is YOUNGER than 10 — profiling questions are
//     addressed to the parent about the child (favourite cartoons, songs
//     the child sings along to), never to the child directly. `false` at
//     exactly 10 and above — the student is addressed directly (spec.md's
//     own boundary evidence: age 7 -> parent-addressed; age 14 ->
//     student-addressed; "younger than 10" makes 10 itself
//     student-addressed).
//
//   This is a DERIVED flag, computed live off `fields.studentAge` on every
//   turn — never stored on IntakeFields or the `requests` row (design.md
//   Decision 1; state-machine.test.ts 2.11 asserts it flips when age is
//   amended 9 -> 12 with nothing persisted).
export function addressesParent(age: number): boolean {
  return age < 10;
}
