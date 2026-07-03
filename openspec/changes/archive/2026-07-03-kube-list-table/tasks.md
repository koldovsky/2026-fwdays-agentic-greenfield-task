## 1. internal/kube: richer context entries

- [x] 1.1 Extend the `kubeFile` projection: decode `contexts[].context.cluster` and `.user` alongside `namespace`
- [x] 1.2 Add `ContextEntry{Name, Cluster, AuthInfo, Namespace}`; change `Contexts()` to return `[]ContextEntry` (dedupe by name, first definition wins, order preserved, broken files skipped — unchanged)
- [x] 1.3 Update `TestContexts` to assert full entries (incl. a context with missing user/namespace → empty fields) and adjust any other callers/tests

## 2. cmd/omnictx: tabwriter table

- [x] 2.1 `runKube` list branch: render via `text/tabwriter` (padding 3, spaces) — header `CURRENT NAME CLUSTER AUTHINFO NAMESPACE` only when entries exist; `*` in CURRENT for the current context; blank cells for missing values
- [x] 2.2 Switch validation: take names from `[]ContextEntry`
- [x] 2.3 Update list tests: table shape for kind fixtures (header, `*` row, blank cells), reserved-word tests (`list` context name still listed, kubeconfig untouched), empty case → no output

## 3. Docs and verification

- [x] 3.1 README: replace the `kube list` usage comment/example with the table
- [x] 3.2 `go test ./... -race -count=1`, `make lint`, `go vet ./...` green
- [x] 3.3 Manual smoke against `~/.kube/config-test`: table matches the kubectl get-contexts shape from the user's example
