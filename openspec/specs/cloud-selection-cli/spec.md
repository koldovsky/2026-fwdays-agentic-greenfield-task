# cloud-selection-cli

## Purpose

The `omnictx cloud` subcommand: a persistent CLI switch for the active-cloud selection (`azure|aws|gcp|auto|none`). Complements the session-scoped `OMNICTX_CLOUD` env var the same way `omnictx on/off` complements `OMNICTX_ENABLED` — by persisting the choice to the config file.

## Requirements

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
The subcommand SHALL validate its argument strictly. The words `list` and `use` are reserved and SHALL never be persisted as cloud values. For any single argument other than `azure|aws|gcp|auto|none|on|off|list` (case-insensitive, surrounding whitespace ignored) it SHALL print a usage message naming the allowed values to stderr, SHALL NOT modify the config file, and SHALL exit with code 2. A two-argument form is valid only as `<azure|aws|gcp> list`; a three-argument form is valid only as `<azure|aws|gcp> use <account>`; anything else SHALL print the usage message and exit 2. This is deliberately stricter than render mode, which silently normalizes unknown values to `auto` to protect the prompt.

#### Scenario: Unknown value
- **WHEN** the user runs `omnictx cloud awz`
- **THEN** stderr contains a usage message listing the allowed values, the config file is not modified, and the exit code is 2

#### Scenario: Case-insensitive input is normalized
- **WHEN** the user runs `omnictx cloud AWS`
- **THEN** the config file contains `cloud: aws` and the exit code is 0

#### Scenario: Invalid two-argument form
- **WHEN** the user runs `omnictx cloud aws gcp`
- **THEN** stderr contains the usage message, no file is modified, and the exit code is 2

#### Scenario: Invalid three-argument form
- **WHEN** the user runs `omnictx cloud gcp activate work`
- **THEN** stderr contains the usage message, no file is modified, and the exit code is 2

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

### Requirement: List provider accounts with `omnictx cloud <provider> list`
The subcommand SHALL support `omnictx cloud <azure|aws|gcp> list`, printing an offline, read-only table of that provider's locally configured accounts with a header row, `text/tabwriter`-style alignment, and `*` in the `CURRENT` column for the active entry. Data comes exclusively from local files (never CLI tools or the network). With nothing to list, the command SHALL print nothing (no header) and exit 0; config and provider files are never modified.

Provider tables:
- **aws**: columns `CURRENT NAME REGION`. Profiles are the union of `~/.aws/config` sections (`[default]`, `[profile NAME]`, honoring `AWS_CONFIG_FILE`) and `~/.aws/credentials` section names, in file order (config first, then credentials-only names), deduplicated. Region from the profile's `region` key in the config file (blank when absent). Current = `AWS_PROFILE` > `AWS_VAULT` > `default`.
- **gcp**: columns `CURRENT NAME ACCOUNT PROJECT`. One row per `<gcloud>/configurations/config_<name>` file (honoring `CLOUDSDK_CONFIG`), `ACCOUNT` from `[core] account`, `PROJECT` from `[core] project` (blank when absent). Current = `CLOUDSDK_ACTIVE_CONFIG_NAME` > `active_config` file > `default`.
- **azure**: columns `CURRENT NAME ID STATE`. One row per subscription in `azureProfile.json` (BOM-aware, honoring `AZURE_CONFIG_DIR`), `STATE` blank when absent. Current = the subscription with `isDefault: true`.

#### Scenario: AWS profiles with regions
- **WHEN** `~/.aws/config` defines `[default]` (region us-east-1) and `[profile prod]` (region eu-west-1), no AWS env vars are set, and the user runs `omnictx cloud aws list`
- **THEN** the table has header `CURRENT NAME REGION`, the `default` row is marked `*`, the `prod` row shows `eu-west-1`, and the exit code is 0

#### Scenario: AWS current profile from env
- **WHEN** the same config exists and `AWS_PROFILE=prod`, and the user runs `omnictx cloud aws list`
- **THEN** the `prod` row is marked `*` and the `default` row is not

#### Scenario: GCP configurations
- **WHEN** `<gcloud>/configurations/` contains `config_default` and `config_work` (`[core] project = my-work-project`), `active_config` contains `work`, and the user runs `omnictx cloud gcp list`
- **THEN** the table has header `CURRENT NAME ACCOUNT PROJECT`, the `work` row is marked `*` and shows `my-work-project`, and the exit code is 0

#### Scenario: Azure subscriptions
- **WHEN** `azureProfile.json` (with UTF-8 BOM) lists `dev-subscription` (`isDefault: false`) and `prod-subscription` (`isDefault: true`), and the user runs `omnictx cloud azure list`
- **THEN** the table has header `CURRENT NAME ID STATE`, the `prod-subscription` row is marked `*` with its id, and the exit code is 0

#### Scenario: Nothing configured stays quiet
- **WHEN** the provider's local files do not exist and the user runs `omnictx cloud <provider> list`
- **THEN** stdout is empty (no header) and the exit code is 0

#### Scenario: Broken source degrades to empty
- **WHEN** the provider's source file is unparsable and the user runs `omnictx cloud <provider> list`
- **THEN** stdout is empty, nothing is modified, and the exit code is 0

### Requirement: List the active provider's accounts with `omnictx cloud list`
The form `omnictx cloud list` SHALL resolve the active provider with the same selection semantics as render (`OMNICTX_CLOUD` env > `cloud:` config > default `auto`; `auto` picks the first present provider in priority azure → aws → gcp) and print that provider's table. When the selection is `none` or no provider is present, it SHALL print nothing and exit 0.

#### Scenario: Active provider's table
- **WHEN** the effective cloud selection resolves to aws and the user runs `omnictx cloud list`
- **THEN** the output equals that of `omnictx cloud aws list` and the exit code is 0

#### Scenario: Selection none stays quiet
- **WHEN** the effective cloud selection is `none` and the user runs `omnictx cloud list`
- **THEN** stdout is empty and the exit code is 0

### Requirement: Switch the active GCP configuration with `omnictx cloud gcp use <name>`
The form `omnictx cloud gcp use <name>` SHALL activate the named gcloud configuration by atomically writing the name to `<gcloud>/active_config` (honoring `CLOUDSDK_CONFIG`), after verifying that `<gcloud>/configurations/config_<name>` exists. On success it SHALL also persist `cloud: gcp` to the omnictx config file, so the prompt immediately displays the provider that was just switched to, and exit 0. An unknown name SHALL print the available configuration names to stderr, write nothing, and exit 2. An unwritable target SHALL exit 1 with nothing partially written. `CLOUDSDK_ACTIVE_CONFIG_NAME` continues to override the file per-session; render reflects the switch on the next invocation.

#### Scenario: Activate an existing configuration
- **WHEN** `<gcloud>/configurations/` contains `config_default` and `config_work` with `active_config` = `default`, and the user runs `omnictx cloud gcp use work`
- **THEN** `active_config` contains exactly `work`, the exit code is 0, and `omnictx cloud gcp list` marks `work` as current

#### Scenario: Successful use pins the displayed cloud
- **WHEN** the omnictx config pins `cloud: azure` and the user runs `omnictx cloud gcp use work` successfully
- **THEN** the omnictx config contains `cloud: gcp` and the next render shows the GCP segment

#### Scenario: Unknown configuration
- **WHEN** no `config_prod` exists and the user runs `omnictx cloud gcp use prod`
- **THEN** stderr names the available configurations, `active_config` is unchanged, and the exit code is 2

### Requirement: Switch the default Azure subscription with `omnictx cloud azure use <name-or-id>`
The form `omnictx cloud azure use <account>` SHALL set `isDefault: true` on the subscription in `azureProfile.json` whose `name` or `id` exactly matches the argument, and `isDefault: false` on all others. The rewrite SHALL be a parsed JSON round-trip (all fields preserved; key order/whitespace may change), SHALL preserve a leading UTF-8 BOM when the original file has one, and SHALL be written atomically. On success it SHALL also persist `cloud: azure` to the omnictx config file (the prompt immediately displays the switched-to provider) and exit 0. A failed switch SHALL NOT touch the omnictx config. When the argument matches more than one subscription by name, the command SHALL print the ambiguous entries with their ids, write nothing, and exit 2. An unknown account SHALL print the available subscriptions to stderr, write nothing, and exit 2. A missing or unparsable `azureProfile.json` SHALL exit 1 with nothing written.

#### Scenario: Switch by name
- **WHEN** `azureProfile.json` lists `dev-subscription` (`isDefault: false`) and `prod-subscription` (`isDefault: true`), and the user runs `omnictx cloud azure use dev-subscription`
- **THEN** `dev-subscription` has `isDefault: true`, `prod-subscription` has `isDefault: false`, all other fields survive, and the exit code is 0

#### Scenario: Switch by id
- **WHEN** the user runs `omnictx cloud azure use 0000-aaaa`
- **THEN** the subscription with that id becomes the default and the exit code is 0

#### Scenario: BOM is preserved
- **WHEN** the original file starts with the UTF-8 BOM and a switch succeeds
- **THEN** the rewritten file still starts with the BOM (and `omnictx` itself can re-read it)

#### Scenario: Duplicate names require the id
- **WHEN** two subscriptions share the name `N/A(tenant level account)` and the user runs `omnictx cloud azure use "N/A(tenant level account)"`
- **THEN** stderr lists the matching entries with their ids, the file is unchanged, and the exit code is 2

#### Scenario: Broken profile refuses the write
- **WHEN** `azureProfile.json` is unparsable and the user runs `omnictx cloud azure use anything`
- **THEN** the file is unchanged, an error is printed, and the exit code is 1

### Requirement: AWS has no persistent switch — print the session hint
The form `omnictx cloud aws use <profile>` SHALL NOT write anything. It SHALL print an explanation that AWS has no persistent current-profile concept together with the session command `export AWS_PROFILE=<profile>` to stderr, and exit 2.

#### Scenario: AWS hint
- **WHEN** the user runs `omnictx cloud aws use prod`
- **THEN** stderr contains `export AWS_PROFILE=prod`, no file is modified, and the exit code is 2

### Requirement: Account aliases from the omnictx config file
The `use` argument SHALL first be resolved through a new optional `aliases` config key (`aliases.<provider>.<short> → canonical name or id`), defined only in the omnictx config file (no env var). When the argument matches an alias for that provider, the canonical value is used for matching; otherwise the argument is used as-is. Aliases never apply to the `list`, `on`, `off`, or pin forms.

#### Scenario: GCP alias resolves
- **WHEN** the config contains `aliases: {gcp: {w: work}}` and the user runs `omnictx cloud gcp use w`
- **THEN** the `work` configuration is activated and the exit code is 0

#### Scenario: Azure alias to an id resolves
- **WHEN** the config contains `aliases: {azure: {dev: "0000-aaaa"}}` and the user runs `omnictx cloud azure use dev`
- **THEN** the subscription with id `0000-aaaa` becomes the default

#### Scenario: Full names keep working without aliases
- **WHEN** no `aliases` key is configured and the user runs `omnictx cloud gcp use work`
- **THEN** the switch succeeds exactly as before

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
