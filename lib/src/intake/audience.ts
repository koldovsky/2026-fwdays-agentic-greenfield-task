// MINIMAL TYPED STUB — NOT this thread's task. tasks.md 2.3/3.3 own
// audience.ts's full contract, its own audience.test.ts, and the green
// implementation; that is a different (parallel) test-engineer pass over
// lib/src/intake/age.ts / format.ts / audience.ts (task family 2.1-2.3),
// out of scope for the "conversation state machine unit tests" assignment
// this file otherwise belongs to.
//
// This stub exists ONLY so state-machine.test.ts's 2.11 case — which
// composes `addressesParent` with `transition()`'s `amend` event per
// design.md Decision 1 ("the derived flag flips ... computed live off
// fields.studentAge, never stored separately") — type-checks and runs red
// for the right reason (Not-implemented throw) instead of a TS2307 module-
// not-found error. Do not treat this as the canonical implementation or
// extend it here; the owning task supersedes this file.
//
// CONTRACT (design.md, tasks.md 2.3): `addressesParent(age)` returns `true`
// for students younger than 10 (BC-AGE-02: profiling questions address the
// parent), `false` at 10 and above.
export function addressesParent(age: number): boolean {
  void age;
  throw new Error(
    "Not implemented — lib/src/intake/audience.ts addressesParent (tasks.md 2.3/3.3, owned by a different task)",
  );
}
