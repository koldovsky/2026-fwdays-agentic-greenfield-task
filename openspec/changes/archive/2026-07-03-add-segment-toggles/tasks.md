## 1. Config resolution (internal/config)

- [x] 1.1 Add `Kube bool` to `Config` (default `true` in `Defaults()`), `Kube *bool` to `fileConfig` (`yaml:"kube"`), apply in `applyFile`
- [x] 1.2 Add shared `parseBool` helper (trim, lowercase, `on`→true, `off`→false, else `strconv.ParseBool`); use it for `OMNICTX_ENABLED`, `OMNICTX_ICONS`, and new `OMNICTX_KUBE` in `applyEnv` (invalid → debug note, layer ignored)
- [x] 1.3 Table tests: `kube:` key from file; `OMNICTX_KUBE` overrides file; default true; `on`/`off`/`ON`/`Off` accepted for all three bool envs; invalid value ignored with lower layer winning

## 2. Subcommands (cmd/omnictx/main.go)

- [x] 2.1 `runCloud`: map `on`→`auto`, `off`→`none` after lowercase/trim, before validation; usage strings mention `on|off`
- [x] 2.2 `runKube`: reserved words `on`/`off` checked with `list` before context lookup → `setConfigKey(globalConfigPath(), "kube", "true"/"false")`, exit 0 (write error → exit 1); kubeconfig never touched by these forms
- [x] 2.3 `gather`: treat kube as enabled only when `cfg.Segments` contains kube AND `cfg.Kube` is true (namespace follows kube automatically)
- [x] 2.4 Tests: `cloud on`/`cloud off` persist `auto`/`none` (incl. pin-loss scenario aws→off→on→auto); `kube off`/`kube on` persist the key with other config lines preserved; kubeconfig byte-identical after `kube off` even when a context named `off` exists; render integration: `kube: false` config / `OMNICTX_KUBE=off` env hide kube+namespace while cloud still renders; `OMNICTX_KUBE=on` overrides `kube: false`

## 3. Help and docs

- [x] 3.1 `printUsage`: `cloud [azure|aws|gcp|auto|none|on|off]`; `kube [<context>|list|on|off]` with a note that on/off toggle display and never touch kubeconfig; extend usage tests
- [x] 3.2 `AGENTS.md`: subcommand list + `kube:` config key + `OMNICTX_KUBE` env + on/off bool vocabulary
- [x] 3.3 `README.md`: extend the toggles section with the session-vs-persistent table (enabled/cloud/kube rows); document `kube:` config key and pin-loss caveat; config example gains `kube: true`

## 4. Verification

- [x] 4.1 `go test ./... -race -count=1`, `make lint`, `go vet ./...` green
- [x] 4.2 Manual smoke: `omnictx kube off` → render (config-test kubeconfig) shows no kube; `omnictx kube on` restores; `omnictx cloud off` → `cloud: none` in config; `omnictx cloud on` → `cloud: auto`; `OMNICTX_KUBE=off` hides for one invocation only
