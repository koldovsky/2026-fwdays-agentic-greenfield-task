## ADDED Requirements

### Requirement: Persist the active-cloud selection via `omnictx cloud <value>`
The CLI SHALL provide a subcommand `omnictx cloud <azure|aws|gcp|auto|none>` that writes the given value to the `cloud:` key of the config file (path resolved as `OMNICTX_CONFIG` > `~/.config/omnictx/config.yaml`) and exits with code 0. The write SHALL change only the `cloud:` line, preserving all other keys and comments, and SHALL create the file and its parent directory if absent.

#### Scenario: Set a provider pin in an existing config
- **WHEN** the config file contains `enabled: true`, a comment line, and `cloud: auto`, and the user runs `omnictx cloud aws`
- **THEN** the config file contains `cloud: aws`, the comment and `enabled: true` are unchanged, and the exit code is 0

#### Scenario: Config file does not exist yet
- **WHEN** no config file exists and the user runs `omnictx cloud gcp`
- **THEN** the file and its parent directory are created, the file contains `cloud: gcp`, and the exit code is 0

#### Scenario: Custom config path via OMNICTX_CONFIG
- **WHEN** `OMNICTX_CONFIG` points to a custom path and the user runs `omnictx cloud azure`
- **THEN** the file at the custom path is updated (not the default path)

#### Scenario: All selection values are accepted
- **WHEN** the user runs `omnictx cloud <v>` for each of `azure`, `aws`, `gcp`, `auto`, `none`
- **THEN** each invocation persists exactly that value and exits 0

### Requirement: Reject invalid values with a usage error
The subcommand SHALL validate its argument strictly. For any value other than `azure|aws|gcp|auto|none` (case-insensitive, surrounding whitespace ignored) it SHALL print a usage message naming the allowed values to stderr, SHALL NOT modify the config file, and SHALL exit with code 2. This is deliberately stricter than render mode, which silently normalizes unknown values to `auto` to protect the prompt.

#### Scenario: Unknown value
- **WHEN** the user runs `omnictx cloud awz`
- **THEN** stderr contains a usage message listing `azure|aws|gcp|auto|none`, the config file is not modified, and the exit code is 2

#### Scenario: Case-insensitive input is normalized
- **WHEN** the user runs `omnictx cloud AWS`
- **THEN** the config file contains `cloud: aws` and the exit code is 0

### Requirement: Print the current effective value with `omnictx cloud`
When invoked with no argument, the subcommand SHALL print the effective cloud selection — resolved with the normal precedence (env `OMNICTX_CLOUD` > config file > default `auto`) — to stdout followed by a newline, and exit 0. Resolution failures (missing/broken config) SHALL degrade to the default rather than erroring.

#### Scenario: Value comes from the config file
- **WHEN** the config file contains `cloud: gcp`, `OMNICTX_CLOUD` is unset, and the user runs `omnictx cloud`
- **THEN** stdout is `gcp` and the exit code is 0

#### Scenario: Env overrides the persisted value
- **WHEN** the config file contains `cloud: gcp`, `OMNICTX_CLOUD=aws` is set, and the user runs `omnictx cloud`
- **THEN** stdout is `aws` and the exit code is 0

#### Scenario: Nothing configured
- **WHEN** no config file exists, `OMNICTX_CLOUD` is unset, and the user runs `omnictx cloud`
- **THEN** stdout is `auto` and the exit code is 0

### Requirement: Help lists the cloud subcommand
The grouped `--help` output SHALL list the `cloud` subcommand under the Subcommands section, including the allowed values, alongside the existing `init` and `on`/`off` entries.

#### Scenario: Help mentions cloud
- **WHEN** the user runs `omnictx --help`
- **THEN** the Subcommands section contains a `cloud` entry showing `azure|aws|gcp|auto|none`

### Requirement: Render behavior is unchanged
The new subcommand SHALL NOT alter render-mode behavior: rendering still never breaks the prompt, `OMNICTX_CLOUD` still overrides the config per-session, and no new render-mode flags are introduced.

#### Scenario: Persisted pin is honored on next render
- **WHEN** `omnictx cloud aws` has been run and a subsequent render invocation occurs without `OMNICTX_CLOUD` set
- **THEN** the cloud slot uses the AWS provider (subject to its data being readable), and any provider read failure still results in the segment being skipped with exit 0
