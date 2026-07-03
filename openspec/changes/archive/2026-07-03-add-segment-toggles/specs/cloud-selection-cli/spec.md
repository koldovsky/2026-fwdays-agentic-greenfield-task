## MODIFIED Requirements

### Requirement: Persist the active-cloud selection via `omnictx cloud <value>`
The CLI SHALL provide a subcommand `omnictx cloud <azure|aws|gcp|auto|none|on|off>` that writes the resolved value to the `cloud:` key of the config file (path resolved as `OMNICTX_CONFIG` > `~/.config/omnictx/config.yaml`) and exits with code 0. The aliases `on` and `off` SHALL be resolved before writing: `off` persists `cloud: none`, `on` persists `cloud: auto`. A previously pinned provider is not remembered across `off`/`on`. The write SHALL change only the `cloud:` line, preserving all other keys and comments, and SHALL create the file and its parent directory if absent.

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

#### Scenario: off is an alias for none
- **WHEN** the user runs `omnictx cloud off`
- **THEN** the config file contains `cloud: none` and the exit code is 0

#### Scenario: on is an alias for auto and does not restore a previous pin
- **WHEN** the config file contains `cloud: aws` and the user runs `omnictx cloud off` followed by `omnictx cloud on`
- **THEN** the config file contains `cloud: auto` (not `cloud: aws`) and both invocations exit 0

### Requirement: Reject invalid values with a usage error
The subcommand SHALL validate its argument strictly. For any value other than `azure|aws|gcp|auto|none|on|off` (case-insensitive, surrounding whitespace ignored) it SHALL print a usage message naming the allowed values to stderr, SHALL NOT modify the config file, and SHALL exit with code 2. This is deliberately stricter than render mode, which silently normalizes unknown values to `auto` to protect the prompt.

#### Scenario: Unknown value
- **WHEN** the user runs `omnictx cloud awz`
- **THEN** stderr contains a usage message listing the allowed values, the config file is not modified, and the exit code is 2

#### Scenario: Case-insensitive input is normalized
- **WHEN** the user runs `omnictx cloud AWS`
- **THEN** the config file contains `cloud: aws` and the exit code is 0
