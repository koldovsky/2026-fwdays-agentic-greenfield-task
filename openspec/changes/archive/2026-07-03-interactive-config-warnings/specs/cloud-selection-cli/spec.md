## ADDED Requirements

### Requirement: Interactive cloud commands warn about broken sources
Interactive forms of the `cloud` subcommand SHALL surface source problems as warnings on stderr, prefixed `omnictx: warning:`, without changing their exit codes or stdout contract. Specifically: (a) any form that resolves the omnictx configuration (`cloud` read-back, bare `cloud list`, `cloud ... use`) SHALL print the configuration debug notes (broken config file, invalid env values); (b) `cloud azure list` — and bare `cloud list` when azure is the active provider — SHALL print a warning naming the path when `azureProfile.json` exists but cannot be parsed. Render mode SHALL remain completely silent on stderr regardless of source state.

#### Scenario: Broken omnictx config is reported by the read-back
- **WHEN** the omnictx config file contains invalid YAML and the user runs `omnictx cloud`
- **THEN** stdout still prints the effective value (`auto`), stderr contains `omnictx: warning:` naming the broken config, and the exit code is 0

#### Scenario: Unparsable azureProfile is reported by list
- **WHEN** `azureProfile.json` exists but is invalid JSON and the user runs `omnictx cloud azure list`
- **THEN** stdout is empty, stderr contains `omnictx: warning:` naming the file, and the exit code is 0

#### Scenario: Render stays silent
- **WHEN** both the omnictx config and `azureProfile.json` are unparsable and a render invocation runs
- **THEN** stderr is empty and the exit code is 0

#### Scenario: Healthy sources produce no warnings
- **WHEN** all sources parse and the user runs `omnictx cloud azure list`
- **THEN** stderr is empty
