## Why

The active cloud provider (`azure|aws|gcp|auto|none`) can currently be changed only by hand-editing `~/.config/omnictx/config.yaml` or per-session via `OMNICTX_CLOUD`. There is no persistent CLI switch, unlike the `enabled` setting which already has `omnictx on|off|toggle`. Users who move between clouds during the day need a one-command, persistent way to pin the displayed cloud.

## What Changes

- New subcommand `omnictx cloud <azure|aws|gcp|auto|none>` that persists the selection to the config file (`cloud:` key), creating the file/dir if absent and preserving all other keys and comments — same mechanism as `omnictx on/off`.
- `omnictx cloud` with no argument prints the current effective value (after merging config + env), aiding "why is the wrong cloud shown?" debugging.
- Strict validation in this interactive mode: an unknown value prints a usage error and exits with code 2 (unlike render mode, which silently normalizes unknown values to `auto` to protect the prompt).
- Grouped `--help` gains the `cloud` subcommand line under Subcommands.
- Docs updated: `AGENTS.md`, `README.md`.

No breaking changes: render behavior, precedence (`OMNICTX_CLOUD` env still overrides the persisted value per-session), and all existing subcommands are unchanged.

## Capabilities

### New Capabilities

- `cloud-selection-cli`: the `omnictx cloud` subcommand — persisting the active-cloud choice to the config file, printing the current effective value, and strict argument validation.

### Modified Capabilities

<!-- none: openspec/specs/ is empty; no existing specs to modify -->

## Impact

- `cmd/omnictx/main.go`: subcommand dispatch (`case "cloud"`), new `runCloud` reusing `setConfigKey`; `printUsage` update.
- `cmd/omnictx/main_test.go`: table-driven tests following the existing `on`/`off`/`toggle` patterns.
- `AGENTS.md`, `README.md`: document the new subcommand.
- No new dependencies; no changes to `internal/*` packages.
