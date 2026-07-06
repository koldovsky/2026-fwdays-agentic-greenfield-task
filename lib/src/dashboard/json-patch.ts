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
/** Top-level RFC 6901 pointer segment (e.g. "/studentName/foo" -> "/studentName"). */
function topLevelSegment(pointer: string): string {
  const rest = pointer.slice(1); // drop leading "/"
  const slashIndex = rest.indexOf("/");
  return slashIndex === -1 ? pointer : pointer.slice(0, slashIndex + 1);
}

function isKnownPath(pointer: string, knownPaths: readonly string[]): boolean {
  return knownPaths.includes(topLevelSegment(pointer));
}

/** Resolves an RFC 6901 pointer's key path segments, unescaping ~1 and ~0. */
function pointerSegments(pointer: string): string[] {
  if (pointer === "") {
    return [];
  }
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

/** Reads the value at `pointer` within `obj` (deep clone already assumed). */
function getAtPointer(obj: Record<string, unknown>, pointer: string): unknown {
  const segments = pointerSegments(pointer);
  let current: unknown = obj;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Sets the value at `pointer` within `obj`, mutating only the passed-in clone. */
function setAtPointer(obj: Record<string, unknown>, pointer: string, value: unknown): void {
  const segments = pointerSegments(pointer);
  const last = segments[segments.length - 1];
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    const next = current[segment];
    current = next as Record<string, unknown>;
  }
  current[last!] = value;
}

/** Deletes the value at `pointer` within `obj`, mutating only the passed-in clone. */
function removeAtPointer(obj: Record<string, unknown>, pointer: string): void {
  const segments = pointerSegments(pointer);
  const last = segments[segments.length - 1];
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    const next = current[segment];
    current = next as Record<string, unknown>;
  }
  delete current[last!];
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

export function applyJsonPatch<T extends Record<string, unknown>>(
  state: T,
  ops: JsonPatchOp[],
  knownPaths: readonly string[],
): T {
  const result = deepClone(state);

  for (const op of ops) {
    const pathKnown = isKnownPath(op.path, knownPaths);
    const fromKnown = op.from === undefined || isKnownPath(op.from, knownPaths);

    if (!pathKnown || !fromKnown) {
      continue; // unknown top-level path -- discard this op, keep going.
    }

    switch (op.op) {
      case "add":
      case "replace":
        setAtPointer(result, op.path, deepClone(op.value));
        break;
      case "remove":
        removeAtPointer(result, op.path);
        break;
      case "move": {
        const value = getAtPointer(result, op.from!);
        removeAtPointer(result, op.from!);
        setAtPointer(result, op.path, value);
        break;
      }
      case "copy": {
        const value = getAtPointer(result, op.from!);
        setAtPointer(result, op.path, deepClone(value));
        break;
      }
      case "test": {
        const current = getAtPointer(result, op.path);
        const matches = JSON.stringify(current) === JSON.stringify(op.value);
        if (!matches) {
          continue; // failing test discards only itself, never throws.
        }
        break;
      }
      default:
        break;
    }
  }

  return result;
}
