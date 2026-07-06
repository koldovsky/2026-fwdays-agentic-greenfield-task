// Test-first (red): lib/src/dashboard/json-patch.ts is a typed throwing
// stub — `applyJsonPatch` is not implemented yet (tasks.md section 2.3).
//
// Contract this test file pins down (design.md Decision 3, baseline spec's
// "Delta patching a nonexistent field is discarded" scenario, TC-PROTO-01):
//   `applyJsonPatch(state, ops, knownPaths) -> newState` is PURE (returns a
//   NEW state object; never mutates `state` or any op in `ops`). RFC 6902
//   `add`/`remove`/`replace` apply normally at a path whose TOP-LEVEL
//   segment is in `knownPaths` (the card's state model). An operation whose
//   top-level path segment is NOT in `knownPaths` is DISCARDED — the state
//   is unchanged for that op, but other valid ops in the SAME batch still
//   apply. A `test` op whose value does not match the current value at its
//   path discards ONLY that op — it never throws and never blocks the rest
//   of the batch. An empty `ops` array returns the state unchanged.
import { describe, expect, it } from "vitest";
import { applyJsonPatch, type JsonPatchOp } from "./json-patch.ts";

interface CardState extends Record<string, unknown> {
  studentName: string | null;
  studentAge: number | null;
  goalText: string | null;
}

const KNOWN_PATHS = ["/studentName", "/studentAge", "/goalText"];

function fixtureState(): CardState {
  return { studentName: null, studentAge: null, goalText: "цікавить вокал" };
}

describe("applyJsonPatch (TC-PROTO-01)", () => {
  // @trace TC-PROTO-01
  it("applies replace/add at known paths", () => {
    const state = fixtureState();
    const ops: JsonPatchOp[] = [
      { op: "replace", path: "/studentName", value: "Оксана" },
      { op: "add", path: "/studentAge", value: 7 },
    ];

    const result = applyJsonPatch(state, ops, KNOWN_PATHS);

    expect(result.studentName).toBe("Оксана");
    expect(result.studentAge).toBe(7);
    expect(result.goalText).toBe("цікавить вокал"); // untouched field survives
  });

  // @trace TC-PROTO-01
  it("applies remove at a known path", () => {
    const state = fixtureState();
    const ops: JsonPatchOp[] = [{ op: "remove", path: "/goalText" }];

    const result = applyJsonPatch(state, ops, KNOWN_PATHS);

    expect(result.goalText).toBeUndefined();
    expect("goalText" in result).toBe(false);
  });

  // @trace TC-PROTO-01, baseline spec "Delta patching a nonexistent field is discarded"
  it("discards an operation targeting a path absent from the known field set, while other valid ops in the same batch still apply", () => {
    const state = fixtureState();
    const ops: JsonPatchOp[] = [
      { op: "replace", path: "/secretInternalField", value: "should never appear" },
      { op: "replace", path: "/studentName", value: "Марійка" },
    ];

    const result = applyJsonPatch(state, ops, KNOWN_PATHS);

    // The unknown-field op is discarded: no new field rendered.
    expect((result as Record<string, unknown>).secretInternalField).toBeUndefined();
    expect(Object.keys(result).sort()).toEqual(["goalText", "studentAge", "studentName"]);
    // The valid op in the same batch still applied.
    expect(result.studentName).toBe("Марійка");
  });

  // @trace TC-PROTO-01
  it("discards an add/remove targeting an unknown path too (not just replace)", () => {
    const state = fixtureState();

    const addResult = applyJsonPatch(
      state,
      [{ op: "add", path: "/unknownField", value: 123 }],
      KNOWN_PATHS,
    );
    expect((addResult as Record<string, unknown>).unknownField).toBeUndefined();
    expect(addResult).toEqual(state);

    const removeResult = applyJsonPatch(
      state,
      [{ op: "remove", path: "/unknownField" }],
      KNOWN_PATHS,
    );
    expect(removeResult).toEqual(state);
  });

  // @trace TC-PROTO-01
  it("a failing test op discards only that op and never throws", () => {
    const state = fixtureState();
    const ops: JsonPatchOp[] = [
      { op: "test", path: "/studentName", value: "someone else entirely" }, // fails: current value is null
      { op: "replace", path: "/studentAge", value: 9 },
    ];

    expect(() => applyJsonPatch(state, ops, KNOWN_PATHS)).not.toThrow();

    const result = applyJsonPatch(state, ops, KNOWN_PATHS);
    // The failed test op had no side effect on studentName.
    expect(result.studentName).toBeNull();
    // The subsequent valid op in the same batch still applied.
    expect(result.studentAge).toBe(9);
  });

  // @trace TC-PROTO-01
  it("a passing test op is a pure assertion — it changes nothing by itself", () => {
    const state = fixtureState();
    const ops: JsonPatchOp[] = [{ op: "test", path: "/studentName", value: null }];

    const result = applyJsonPatch(state, ops, KNOWN_PATHS);

    expect(result).toEqual(state);
  });

  // @trace TC-PROTO-01
  it("returns the state unchanged when ops is an empty array", () => {
    const state = fixtureState();

    const result = applyJsonPatch(state, [], KNOWN_PATHS);

    expect(result).toEqual(state);
  });

  // @trace TC-PROTO-01
  it("never mutates the input state or the input ops array", () => {
    const state = fixtureState();
    const stateSnapshotBefore = { ...state };
    const ops: JsonPatchOp[] = [{ op: "replace", path: "/studentName", value: "Тарас" }];
    const opsSnapshotBefore = ops.map((op) => ({ ...op }));

    applyJsonPatch(state, ops, KNOWN_PATHS);

    expect(state).toEqual(stateSnapshotBefore);
    expect(ops).toEqual(opsSnapshotBefore);
  });

  // --- review-gate FIX 4 [MINOR]: prototype-pollution guard -----------------
  // @trace TC-PROTO-01
  // "/studentName" is itself a known top-level path, so `isKnownPath` alone
  // does not reject `/studentName/constructor/prototype/x` — the nested
  // segments walk straight through a string primitive's `.constructor`
  // (the global `String` function) to its `.prototype` (the REAL, shared
  // `String.prototype`), then write `x` on it: global prototype pollution.
  // `studentName` must be a non-null STRING for this walk to even reach
  // `.constructor` (a `null` field would already fail earlier via a plain
  // `TypeError`, a separate pre-existing robustness gap this fix does not
  // otherwise touch).
  it("discards an op whose path walks through 'constructor'/'prototype', never polluting a shared prototype", () => {
    const state = { ...fixtureState(), studentName: "Оксана" };
    const ops: JsonPatchOp[] = [
      { op: "add", path: "/studentName/constructor/prototype/x", value: "polluted" },
      { op: "add", path: "/studentAge", value: 9 }, // other valid ops in the batch still apply
    ];

    const result = applyJsonPatch(state, ops, KNOWN_PATHS);

    expect((String.prototype as unknown as Record<string, unknown>).x).toBeUndefined();
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(result.studentAge).toBe(9);

    delete (String.prototype as unknown as Record<string, unknown>).x; // defensive cleanup if the guard is missing
  });

  it("discards an op whose path targets '__proto__' directly, never polluting Object.prototype", () => {
    const state = fixtureState();
    const ops: JsonPatchOp[] = [
      { op: "add", path: "/__proto__/polluted", value: true },
      { op: "add", path: "/studentAge", value: 9 },
    ];

    const result = applyJsonPatch(state, ops, KNOWN_PATHS);

    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(result.studentAge).toBe(9);

    delete (Object.prototype as Record<string, unknown>).polluted; // defensive cleanup
  });

  it("discards a 'move' op whose 'from' pointer walks through a dangerous segment", () => {
    const state = { ...fixtureState(), studentName: "Оксана" };
    const ops: JsonPatchOp[] = [
      { op: "move", path: "/studentAge", from: "/studentName/constructor/prototype" },
      { op: "add", path: "/studentAge", value: 9 },
    ];

    const result = applyJsonPatch(state, ops, KNOWN_PATHS);

    expect((String.prototype as unknown as Record<string, unknown>).studentAge).toBeUndefined();
    expect(result.studentAge).toBe(9);
  });
});
