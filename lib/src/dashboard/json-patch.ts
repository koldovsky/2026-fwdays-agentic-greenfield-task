// TYPED THROWING STUB — red state for `dashboard` tasks.md section 2 (2.3).
// The signature and types below are the contract pinned by
// json-patch.test.ts; the body is implemented in tasks.md section 3 (3.3).
// No logic lives here yet.
//
// Framework-free pure core (TC-PURE-01): no dependency on any JSON-Patch npm
// package — the op set (`add`/`remove`/`replace`/`move`/`copy`/`test`) is
// small enough to implement directly (design.md Decision 3 / tasks.md 3.3).

/**
 * One RFC 6902 JSON-Patch operation, as carried by a `STATE_DELTA` AG-UI
 * event (design.md's AG-UI contract). `path`/`from` are RFC 6901 JSON
 * Pointers (e.g. "/studentName").
 */
export interface JsonPatchOp {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  /** Required for `move`/`copy` — the source pointer. */
  from?: string;
}

/**
 * Applies a batch of JSON-Patch operations to `state`, PURELY (returns a new
 * state; never mutates `state` or any op in `ops`).
 *
 * `knownPaths` is the "card's state model" — the finite set of top-level
 * RFC 6901 pointers (e.g. `["/studentName", "/studentAge"]`) the caller's
 * state shape actually has. An operation's target path (`path` for
 * `add`/`remove`/`replace`/`test`, `path` AND `from` for `move`/`copy`) is
 * matched against `knownPaths` by its TOP-LEVEL segment — nested paths under
 * a known top-level key still apply; a path whose top-level segment is not
 * in `knownPaths` is DISCARDED (not applied, not thrown), per the baseline
 * spec's "delta patching a nonexistent field is discarded" scenario. A
 * `test` operation whose target value does not match `value` discards only
 * that one operation and never throws. Every other valid operation in the
 * same batch still applies.
 */
export function applyJsonPatch<T extends Record<string, unknown>>(
  state: T,
  ops: JsonPatchOp[],
  knownPaths: readonly string[],
): T {
  void state; // referenced only to satisfy no-unused-vars until 3.3 implements this
  void ops;
  void knownPaths;
  throw new Error("not implemented");
}
