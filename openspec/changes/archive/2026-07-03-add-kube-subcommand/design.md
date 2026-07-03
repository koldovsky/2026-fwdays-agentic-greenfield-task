## Context

`internal/kube` currently reads kubeconfig files directly (yaml.v3, `$KUBECONFIG` colon-list, first-file-wins for `current-context`) and is strictly read-only. The CLI has an established persistent-switch pattern: `omnictx on/off/toggle` and `omnictx cloud <v>` rewrite exactly one line of omnictx's own config via `setConfigKey`. This change extends the pattern to the kubeconfig — a file omnictx does *not* own — which raises the safety bar: a bug here can corrupt the file kubectl depends on.

Constraints:
- No kubectl/client-go/network (AGENTS.md); the switch must be a direct file edit.
- Render mode must stay read-only and never break the prompt.
- Subcommands are interactive mode: loud errors and non-zero exits are correct there (`runInit`, `runCloud` precedents: 2 = usage, 1 = I/O).

## Goals / Non-Goals

**Goals:**
- `omnictx kube <context>` — switch `current-context` safely (validate, line surgery, atomic write).
- `omnictx kube` — print the current context; `omnictx kube list` — list all contexts, current marked.
- Preserve the kubeconfig byte-for-byte except the one line we own.

**Non-Goals:**
- Namespace switching (`contexts[i].context.namespace` is nested; line surgery is fragile there and a yaml.Node round-trip reformats a file we don't own). Explicitly deferred.
- Creating kubeconfig files or contexts; if no kubeconfig exists, switching fails (there is nothing valid to switch to — validation already guarantees this).
- Windows (`;` list separator) — already out of scope project-wide.

## Decisions

1. **Line surgery on the top-level `current-context:` line, not a YAML round-trip.**
   `current-context` is a top-level scalar key, so a single-line replacement (or append, if absent) is exact and preserves comments/order/formatting. `yaml.Marshal` round-trip would rewrite the whole file; even the yaml.Node API normalizes indentation and quoting. Matching rule: a line whose trimmed form starts with `current-context:` at indent 0 (not inside a block) — in practice kubeconfigs are flat here; the parse-before-write step (Decision 3) guards the pathological cases.

2. **Atomic write: temp file in the same directory + `os.Rename`, preserving the original file's permission bits.**
   Same-directory temp file keeps the rename on one filesystem (atomic on POSIX). A crash mid-write leaves the original untouched. Kubeconfigs are commonly 0600 — the temp file is chmod'ed to the original's mode before rename.

3. **Validate against parsed state before touching anything.**
   Reuse the existing read path: parse all `$KUBECONFIG` files, collect `contexts[].name` across them. Unknown target → error listing available contexts, exit 2, no write. Write-target unreadable/unparsable → error, exit 1, no write. This is the main defense against corrupting a file we don't own: we never write into a file we could not parse.

4. **Write-target selection mirrors the read logic (and kubectl):** first file in the list with a non-empty `current-context`, else the first file. Keeps read-after-write consistent: the context we just set is the one `Read` (and the prompt) resolves.

5. **Write-side lives in `internal/kube` (e.g., `Contexts()`, `WriteContext()`), `cmd` stays glue.**
   Follows the project layout rule (business logic in `internal/*`, fixture-tested). The cmd layer only parses args and maps errors to exit codes.

6. **`list` is a reserved word, checked before context lookup.**
   `omnictx kube list` always lists; a context literally named `list` is visible in the listing but not switchable via this subcommand (edge case accepted; kubectl remains available for it). Listing marks the current context with `* ` and indents others by two spaces (kubectx-familiar).

7. **No-arg form prints the current context via the existing `kube.Read`,** empty stdout + exit 0 when nothing is set — same "quiet on absence" behavior as render, and symmetric with `omnictx cloud`.

## Risks / Trade-offs

- [Corrupting a user's kubeconfig] → parse-before-write, single-line edit, atomic rename, and a refuse-on-broken rule; fixture tests assert byte-identity of all untouched lines and files.
- [`current-context:` matched inside a nested block by naive line matching] → kubeconfigs are generated flat by kubectl/kind/cloud CLIs; additionally the indent-0 match rule and parse-before-write make a false match implausible. Accepted residual risk, documented.
- [Concurrent modification (kubectl writing at the same time)] → last-writer-wins, same as kubectl vs kubectl today; no locking (kubectl itself uses none for this file). Accepted.
- [Scope creep of a "display tool" into a mutator] → confined to one explicit subcommand; render mode provably read-only (spec requirement + no write API reachable from the render path).

## Migration Plan

Additive; no migration. Rollback = revert the commit. The kubeconfig write path did not exist before, so no existing behavior changes.

## Open Questions

None — boundaries (context switch yes, namespace no; `list` reserved) were settled with the user before this change was created.
