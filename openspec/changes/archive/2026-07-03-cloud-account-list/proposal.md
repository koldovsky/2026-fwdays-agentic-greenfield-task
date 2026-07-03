## Why

Users can list kube-contexts (`omnictx kube list`) but have no offline equivalent of `aws configure list-profiles`, `gcloud config configurations list`, or `az account list --output table`. All three data sources are local files omnictx already parses — showing them is instant, network-free, and helps decide what to pin with `omnictx cloud <provider>`.

## What Changes

- New read-only listing forms of the `cloud` subcommand (kubectl-style tables, shared tabwriter printer):
  - `omnictx cloud aws list` — profiles from `~/.aws/config` (+ names from `~/.aws/credentials`), columns `CURRENT NAME REGION`; current = `AWS_PROFILE` > `AWS_VAULT` > `default`.
  - `omnictx cloud gcp list` — configurations from `<gcloud>/configurations/config_*`, columns `CURRENT NAME ACCOUNT PROJECT`; current = active-config resolution. The account email comes from the same local file (no network; the PRD exclusion applies to the prompt segment, not this table).
  - `omnictx cloud azure list` — subscriptions from `azureProfile.json` (BOM-aware), columns `CURRENT NAME ID STATE`; current = `isDefault`.
  - `omnictx cloud list` — the same table for the **effective/active** provider (selection semantics as render); nothing to show → empty output, exit 0.
- `list` becomes a reserved word of the `cloud` subcommand (like `on`/`off`); it is not a persistable value.
- **Account switching is explicitly out of scope** — write access to foreign files stays kube-only (user decision).
- `internal/ini` gains ordered section enumeration (stdlib, ~15 lines) needed for AWS profiles.
- Docs: grouped `--help`, `AGENTS.md`, `README.md`.

No changes to render mode, providers' Read/Present, or persistence.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `cloud-selection-cli`: new listing requirement (`cloud [provider] list` tables); the strict-validation requirement gains `list` as a reserved word.

## Impact

- `internal/ini`: `Sections()` (ordered, deduped) + tests.
- `internal/aws` (`Profiles()`), `internal/gcp` (`Configurations()`), `internal/azure` (`Subscriptions()` + extended JSON projection: id, state) + fixture tests; azure fixture gains `state` fields.
- `cmd/omnictx`: `runCloud` grammar (1–2 args), generic `printTable` extracted from `printKubeTable`.
- `README.md`, `AGENTS.md`; no new dependencies.
