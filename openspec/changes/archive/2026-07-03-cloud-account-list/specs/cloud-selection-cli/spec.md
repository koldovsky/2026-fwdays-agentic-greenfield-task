## MODIFIED Requirements

### Requirement: Reject invalid values with a usage error
The subcommand SHALL validate its argument strictly. The word `list` is reserved for the listing forms and SHALL never be persisted as a cloud value. For any single argument other than `azure|aws|gcp|auto|none|on|off|list` (case-insensitive, surrounding whitespace ignored) it SHALL print a usage message naming the allowed values to stderr, SHALL NOT modify the config file, and SHALL exit with code 2. A two-argument form is valid only as `<azure|aws|gcp> list`; anything else SHALL print the usage message and exit 2. This is deliberately stricter than render mode, which silently normalizes unknown values to `auto` to protect the prompt.

#### Scenario: Unknown value
- **WHEN** the user runs `omnictx cloud awz`
- **THEN** stderr contains a usage message listing the allowed values, the config file is not modified, and the exit code is 2

#### Scenario: Case-insensitive input is normalized
- **WHEN** the user runs `omnictx cloud AWS`
- **THEN** the config file contains `cloud: aws` and the exit code is 0

#### Scenario: Invalid two-argument form
- **WHEN** the user runs `omnictx cloud aws gcp`
- **THEN** stderr contains the usage message, no file is modified, and the exit code is 2

## ADDED Requirements

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
