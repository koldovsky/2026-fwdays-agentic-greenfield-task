## Why

`omnictx cloud <provider> list` shows the locally configured accounts, but switching still requires `az account set` / `gcloud config configurations activate`. Both switches are pure local-file writes omnictx can do safely — completing the loop: see where you are (render), see what exists (`list`), switch (`use`). AWS is deliberately excluded: the AWS ecosystem has no persistent "current profile" (it is `AWS_PROFILE`, session-scoped), and inventing an omnictx-only convention would make the prompt disagree with the real `aws` CLI.

## What Changes

- New form `omnictx cloud <azure|gcp> use <account>` (`use` joins `list`/`on`/`off` as reserved words of the cloud subcommand):
  - **gcp**: validates `configurations/config_<name>` exists, then atomically writes the name to `<gcloud>/active_config` — the same single-line file gcloud itself uses. `CLOUDSDK_ACTIVE_CONFIG_NAME` still overrides per-session.
  - **azure**: flips the `isDefault` flags in `azureProfile.json`, matching by exact subscription name **or id** (ids are required in practice: real files contain duplicate display names). JSON round-trip via `map[string]any` (JSON has no comments — nothing is lost, only key order/whitespace), UTF-8 BOM preserved, parse-before-write, atomic rename.
  - **aws**: `omnictx cloud aws use X` prints an explanatory hint (`export AWS_PROFILE=X`) to stderr and exits 2 — no fake persistence.
- `<account>` accepts the full name/id **or a short alias** from a new `aliases` key in omnictx's own config file (file-only, no env var):

  ```yaml
  aliases:
    azure: { prod: "Azure subscription 1" }   # values may be names or ids
    gcp:   { w: work }
  ```

- Errors: unknown account → stderr lists available entries, exit 2, nothing written; ambiguous duplicate Azure name → exit 2 asking for the id; unreadable/unparsable source → exit 1, nothing written.
- Render reflects switches automatically (it reads the same files). The explicit-user-command write boundary now covers kubeconfig, `active_config`, and `azureProfile.json`; render stays strictly read-only.
- Docs: grouped `--help`, `AGENTS.md`, `README.md`, config example.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `cloud-selection-cli`: validation requirement gains the `use` reserved word and the three-argument grammar; new requirements for the `use` switch (gcp/azure/aws-hint) and for config-file aliases.

## Impact

- `internal/config`: `Aliases map[string]map[string]string` key + tests.
- `internal/gcp`: `Use()` (validate + atomic single-line write) + tests.
- `internal/azure`: `Use()` (JSON round-trip, BOM, name/id matching, ambiguity) + tests; fixture with duplicate names.
- `cmd/omnictx`: `runCloud` three-arg grammar, alias resolution, aws hint; help; tests.
- `AGENTS.md`, `README.md`. No new dependencies.
