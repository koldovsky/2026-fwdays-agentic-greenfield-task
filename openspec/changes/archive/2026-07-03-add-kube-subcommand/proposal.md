## Why

omnictx shows the current kube-context but cannot switch it — users still need kubectx or `kubectl config use-context`. Since omnictx already parses kubeconfig directly and now has a persistent-switch pattern (`omnictx cloud`, `omnictx on/off`), a `kube` subcommand completes the picture: one self-contained binary to see *and* switch the active context, still with no kubectl and no network.

This is a deliberate scope extension: until now omnictx only ever wrote its own config file. `omnictx kube <ctx>` writes to the kubeconfig — a file owned by kubectl — on an explicit user command. Render mode stays strictly read-only.

## What Changes

- New subcommand `omnictx kube <context>`: sets `current-context: <context>` in the kubeconfig via single-line surgery (no YAML round-trip — comments, ordering, and formatting are preserved) with an atomic write (temp file + rename).
- Strict validation: the target context must exist in the parsed kubeconfig files; otherwise a usage error listing available contexts, exit 2, and no write. A broken/unreadable kubeconfig also refuses to write.
- `$KUBECONFIG` colon-list handling: the write goes to the first file that already sets `current-context`, else the first file in the list — mirroring the existing read logic and kubectl behavior.
- `omnictx kube` (no argument) prints the current context (symmetry with `omnictx cloud`).
- `omnictx kube list` prints all contexts from all kubeconfig files, marking the current one. `list` is a reserved word: a context literally named `list` cannot be switched to via this subcommand.
- Namespace switching is explicitly **out of scope** (nested YAML edit; too risky for a file we do not own).
- Docs: grouped `--help`, `AGENTS.md`, `README.md`, plus a PRD note that omnictx now writes `current-context` to kubeconfig on explicit user command only.

No breaking changes: render mode, all existing subcommands, and the never-break-the-prompt invariant are untouched.

## Capabilities

### New Capabilities

- `kube-context-cli`: the `omnictx kube` subcommand — switching `current-context` in kubeconfig safely (validation, line surgery, atomic write), printing the current context, and listing available contexts.

### Modified Capabilities

<!-- none: cloud-selection-cli requirements are not affected -->

## Impact

- `internal/kube`: new write-side functions (list contexts across files, pick target file, set current-context) next to the existing read logic; fixture-driven tests.
- `cmd/omnictx/main.go`: dispatch `case "kube"`, `runKube`; `printUsage` update.
- `cmd/omnictx/main_test.go`: subcommand-level tests.
- `AGENTS.md`, `README.md`, `PRD.md`: document the subcommand and the write-on-explicit-command caveat.
- No new dependencies; kubeconfig is the only external file gaining a (surgical, opt-in) write path.
