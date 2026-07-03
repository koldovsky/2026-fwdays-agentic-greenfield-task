## 1. Subcommand implementation (cmd/omnictx/main.go)

- [x] 1.1 Add `case "cloud": os.Exit(runCloud(args[1:]))` to the dispatch in `main()`, next to `on`/`off`/`toggle`
- [x] 1.2 Implement `runCloud(args []string) int`: no args → print effective value via `config.Resolve` (env > config > default) and return 0; one arg → validate and persist; more than one arg → usage error, return 2
- [x] 1.3 Implement strict validation: lowercase + trim the argument; accept only `azure|aws|gcp|auto|none`; on failure print usage naming the allowed values to stderr and return 2 without touching the config
- [x] 1.4 Persist via `setConfigKey(globalConfigPath(), "cloud", v)`; return 1 with an error message on write failure (same convention as `runEnable`)

## 2. Help and docs

- [x] 2.1 Add the `cloud <azure|aws|gcp|auto|none>` line to the Subcommands section of `printUsage`, noting that env `OMNICTX_CLOUD` overrides it per-session
- [x] 2.2 Update `AGENTS.md`: add `cloud` to the subcommand list in the structure section
- [x] 2.3 Update `README.md`: document `omnictx cloud <value>` and the no-arg read-back form

## 3. Tests (cmd/omnictx/main_test.go, table-driven, following on/off/toggle patterns)

- [x] 3.1 Set each valid value (`azure`, `aws`, `gcp`, `auto`, `none`) → config contains `cloud: <v>`, exit 0; include uppercase input (`AWS` → `cloud: aws`)
- [x] 3.2 Existing config with other keys and comments → only the `cloud:` line changes, comments and `enabled:` preserved
- [x] 3.3 No config file → file and parent dir created with `cloud: <v>`
- [x] 3.4 `OMNICTX_CONFIG` set → custom path written, default path untouched
- [x] 3.5 Invalid value (`awz`) → exit 2, usage on stderr mentions `azure|aws|gcp|auto|none`, config unmodified
- [x] 3.6 No-arg read-back: value from config; env `OMNICTX_CLOUD` overrides config; nothing configured → `auto`
- [x] 3.7 `--help` output test extended: Subcommands section lists `cloud`

## 4. Verification

- [x] 4.1 `make test` green (`go test ./... -race -count=1`)
- [x] 4.2 `make lint` and `go vet ./...` green
- [x] 4.3 Manual smoke: `OMNICTX_CONFIG=$(mktemp) go run ./cmd/omnictx cloud aws && cat $OMNICTX_CONFIG` shows `cloud: aws`; `omnictx cloud` prints `aws`
