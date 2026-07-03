## Why

`omnictx kube list` currently prints a bare marker list (`* kind-1` / `  kind-2`), while users coming from `kubectl config get-contexts` expect the familiar table with cluster, user, and namespace columns. omnictx already parses the kubeconfig; showing the extra columns costs nothing at runtime and makes the listing genuinely useful for choosing where to switch.

## What Changes

- `omnictx kube list` output becomes a kubectl-style table (stdlib `text/tabwriter`, no new dependency):

  ```
  CURRENT   NAME     CLUSTER   AUTHINFO      NAMESPACE
            kind-1   kind-1    kind-1-user   payments
  *         kind-2   kind-2    kind-2-user   staging
  ```

  `*` marks the current context in the CURRENT column; missing values render as blank cells. **BREAKING** for anyone parsing the old two-column output (accepted: the command is interactive; script-stable output was never promised).
- `internal/kube`: the kubeconfig projection additionally decodes `contexts[].context.cluster` and `.user`; `Contexts()` returns `[]ContextEntry{Name, Cluster, AuthInfo, Namespace}` instead of `[]string` (internal API only; switch validation reads names from the entries).
- Unchanged: multi-file `$KUBECONFIG` merge order, dedupe by name (first definition wins), broken files skipped, and the quiet no-contexts case (empty output, no header).
- Docs: README listing example.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `kube-context-cli`: the "List available contexts with `omnictx kube list`" requirement changes its output contract from a marker list to the tabwriter table with CURRENT/NAME/CLUSTER/AUTHINFO/NAMESPACE columns.

## Impact

- `internal/kube/write.go` (Contexts + projection in kube.go), `internal/kube/write_test.go`, fixtures already carry cluster/user data.
- `cmd/omnictx/main.go` (`runKube` list branch, tabwriter), `cmd/omnictx/main_test.go` (list tests).
- `README.md` usage line; spec `kube-context-cli` delta.
- No new dependencies (`text/tabwriter` is stdlib).
