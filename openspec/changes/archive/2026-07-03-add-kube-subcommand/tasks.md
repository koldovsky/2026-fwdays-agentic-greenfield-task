## 1. Write-side API in internal/kube

- [x] 1.1 Add `Contexts(lookup LookupEnv, home string) []string` — all context names across the `$KUBECONFIG` file list, deduplicated, file-then-definition order; broken/missing files skipped
- [x] 1.2 Add target-file selection: first file in the list with a non-empty `current-context`, else the first file (reuse `resolveFiles`; mirror the read logic)
- [x] 1.3 Add `WriteContext(lookup LookupEnv, home, context string) error` — parse-before-write guard (target must be readable, valid YAML), single-line replace/append of the top-level `current-context:` line, atomic write (same-dir temp file, original permission bits, `os.Rename`)
- [x] 1.4 Fixture tests for `Contexts`: multi-file merge and order, dedupe, broken file skipped, no files → empty
- [x] 1.5 Fixture tests for `WriteContext`: switch preserves every other line byte-for-byte (incl. comments); missing `current-context:` line is appended; `$KUBECONFIG` multi-file target selection (second file holds current-context → only it changes; none holds it → first file); broken target → error, no file modified; permission bits preserved

## 2. Subcommand in cmd/omnictx

- [x] 2.1 Dispatch `case "kube": os.Exit(runKube(args[1:], os.Stdout, os.Stderr))` in `main()`
- [x] 2.2 `runKube`: no args → print current context via `kube.Read` (empty stdout + exit 0 when unset); `list` (reserved word, checked first) → print all contexts, current marked `* `, others indented two spaces; one arg → validate against `kube.Contexts`, unknown → stderr error naming available contexts + exit 2; valid → `kube.WriteContext`, I/O error → exit 1; >1 arg → usage, exit 2
- [x] 2.3 Subcommand tests: switch via `KUBECONFIG` fixture then re-read shows new context; unknown context → exit 2, files untouched; `kube list` output with `* ` marker; no-arg with and without kubeconfig; too many args → exit 2; context named `list` → listing wins, no write

## 3. Help and docs

- [x] 3.1 `printUsage`: add `kube [<context>|list]` under Subcommands (switch / show current / list available)
- [x] 3.2 Extend the usage test for the new help lines
- [x] 3.3 `AGENTS.md`: add `kube` to the subcommand list; note that omnictx writes `current-context` to kubeconfig only on explicit user command, render mode stays read-only
- [x] 3.4 `README.md`: document `omnictx kube` / `omnictx kube <ctx>` / `omnictx kube list` (Daily use section) and the safety properties (validation, comment preservation, atomic write)
- [x] 3.5 `PRD.md`: note the scope extension (kubeconfig write on explicit command; namespace switching out of scope)

## 4. Verification

- [x] 4.1 `go test ./... -race -count=1` green
- [x] 4.2 `make lint` and `go vet ./...` green
- [x] 4.3 Manual smoke against `~/.kube/config-test` (kind-1/kind-2 fixture): `KUBECONFIG=~/.kube/config-test omnictx kube list`, switch to kind-2, re-render shows `kind-2:staging`, file diff shows exactly one changed line
