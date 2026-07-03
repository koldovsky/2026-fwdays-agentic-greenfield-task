## 1. Config: aliases key

- [x] 1.1 Add `Aliases map[string]map[string]string` to `Config` + `fileConfig` (`yaml:"aliases"`, file-only); tests: parsing, absent key → nil, lookup helper behavior

## 2. GCP switch

- [x] 2.1 `gcp.Use(lookup, home, name) error` — validate via existing configuration enumeration, atomic write of `<gcloud>/active_config`; typed "unknown" error carrying available names
- [x] 2.2 Tests: activate existing (file content exactly `name`), unknown → error + file untouched, missing configurations dir → error, mode/atomicity

## 3. Azure switch

- [x] 3.1 `azure.Use(lookup, home, target) error` — BOM-aware read, `map[string]any` round-trip, flip `isDefault` by exact name or id, ambiguous-name and unknown errors with candidates, `MarshalIndent`, BOM re-prepended, atomic write
- [x] 3.2 Fixture `azureProfile_dupnames.json` (two identical names, distinct ids); tests: switch by name, by id, BOM preserved and re-readable, unknown fields survive round-trip, duplicate name → ambiguity error + untouched file, broken/missing → error

## 4. cmd/omnictx: use grammar

- [x] 4.1 `runCloud`: three-arg form `<provider> use <account>`; alias resolution from `cfg.Aliases[provider]` before dispatch; gcp/azure → `Use` (unknown/ambiguous → exit 2 with candidates, I/O → exit 1); aws → hint `export AWS_PROFILE=<x>` + exit 2; other three-arg forms → usage exit 2
- [x] 4.2 Tests: gcp use by name and via alias; azure use by name/id/alias against temp `AZURE_CONFIG_DIR`; duplicate-name → 2; aws hint; `cloud gcp activate work` → 2; `use` never persisted as a value

## 5. Docs and verification

- [x] 5.1 `--help` cloud section gains the `use` form and the AWS note; usage tests extended
- [x] 5.2 `AGENTS.md` (subcommands + write-boundary note covers active_config/azureProfile.json), `README.md` (switching accounts section + aliases example), config example gains `aliases`
- [x] 5.3 `go test ./... -race -count=1`, `make lint`, `go vet ./...` green
- [x] 5.4 Manual smoke ONLY against temp copies (`CLOUDSDK_CONFIG`/`AZURE_CONFIG_DIR` pointed at copies of real files) — never mutate the user's real state

## 6. Follow-up: pin the displayed cloud after use (user feedback)

- [x] 6.1 `pinCloudAfterUse`: successful gcp/azure `use` persists `cloud: <provider>` via `setConfigKey` (failure → warning + exit 1); failed use never touches the omnictx config; AWS hint path unaffected
- [x] 6.2 Tests: config gains `cloud: gcp`/`cloud: azure` after successful use; failed use leaves config absent; spec + help + README updated
