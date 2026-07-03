## 1. internal/ini: ordered sections

- [x] 1.1 Add `Sections(data []byte) []string` — ordered, deduplicated section names (default section "" excluded); table tests incl. duplicates, comments, broken lines

## 2. Provider listers

- [x] 2.1 `aws.Profiles(lookup, home) []Profile{Name, Region}` — config sections (strip `profile ` prefix) ∪ credentials section names, config order first; region from config only; tests: default+named fixture, credentials-only profile, missing/broken files → empty
- [x] 2.2 `gcp.Configurations(lookup, home) []Configuration{Name, Account, Project, Active}` or Active resolved in cmd — rows from `config_*` files in `<gcloud>/configurations`; tests: default+work+noproject fixtures, active from file and env, missing dir → empty
- [x] 2.3 `azure.Subscriptions(lookup, home) []Subscription{Name, ID, State, IsDefault}` — extend the JSON projection; extend `azureProfile_default.json` fixture with `state`; tests: two subscriptions with default marked, BOM fixture, broken/missing → empty

## 3. cmd/omnictx: grammar and table

- [x] 3.1 Extract `printTable(w, header, rows)` from `printKubeTable`; kube list reuses it (existing kube tests stay green)
- [x] 3.2 `runCloud`: single-arg `list` → active provider via `config.Resolve` + `cloud.Select` (none/absent → quiet exit 0); two-arg `<azure|aws|gcp> list` → that provider's table; other two-arg → usage exit 2
- [x] 3.3 Tests: aws table with `*` on default and on `AWS_PROFILE=prod`; gcp table with active from `active_config`; azure table with `isDefault` marker; bare `cloud list` follows effective selection and is quiet for `none`; `cloud aws gcp` → exit 2; empty/broken sources → quiet

## 4. Docs and verification

- [x] 4.1 `--help`: cloud subcommand line gains the `list` forms; usage tests extended
- [x] 4.2 `AGENTS.md` subcommand list; `README.md` usage + example table
- [x] 4.3 `go test ./... -race -count=1`, `make lint`, `go vet ./...` green
- [x] 4.4 Manual smoke: `omnictx cloud aws list` / `gcp list` / `azure list` / bare `list` against real local files
