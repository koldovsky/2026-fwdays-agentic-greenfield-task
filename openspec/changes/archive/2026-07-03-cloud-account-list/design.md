## Context

`omnictx kube list` already renders a kubectl-style tabwriter table. The three cloud providers read their sources offline (`~/.aws/config` via `internal/ini`, `<gcloud>/configurations/*` via `internal/ini`, `azureProfile.json` via a minimal JSON projection). Listing accounts is the same data, one level wider: all sections/files/array entries instead of the resolved one. The user has fixed the boundary: listing is read-only; switching foreign state stays kube-only.

## Goals / Non-Goals

**Goals:**
- `cloud <provider> list` + `cloud list` (active provider), offline, quiet-on-empty, exit 0.
- Reuse: one shared table printer with `printKubeTable`; existing resolution helpers for "current" markers.

**Non-Goals:**
- Account/profile/subscription switching (user decision: kube-only writes).
- Sorting or filtering flags; kubectl/az/gcloud remain for advanced output.
- AWS SSO session sections (`[sso-session ...]`) — not profiles, skipped.

## Decisions

1. **Listers are per-package typed functions, not Provider-interface methods:** `aws.Profiles()`, `gcp.Configurations()`, `azure.Subscriptions()`. Columns differ per provider; forcing a generic `List()` into `cloud.Provider` (a render-focused interface) would flatten types into `[][]string` at the wrong layer. The cmd switch maps entries to rows next to the header literals.
2. **`internal/ini` gains `Sections(data []byte) []string`** — ordered, deduplicated section names from a second lightweight scan. `File` stays a map (no API break for `Get` callers); order lives only where it matters.
3. **AWS profile set = config sections ∪ credentials section names.** `aws configure list-profiles` merges both files; profiles that exist only in `~/.aws/credentials` are common. Config order first, then credentials-only names; region only ever comes from the config file. The `[profile X]` prefix is stripped; bare `[default]` maps to `default`.
4. **GCP rows from directory listing:** `os.ReadDir(<gcloud>/configurations)`, files with the `config_` prefix (sorted by ReadDir — deterministic); each parsed for `[core] account/project`. Active name via the existing `activeConfigName` resolution.
5. **Azure projection extended, not replaced:** the `profile` struct gains `ID`, `State` (fixtures gain `state`); `Read` (render path) is untouched. Blank STATE cells for old/partial files.
6. **Grammar in `runCloud`:** single arg `list` → active-provider table (resolve `cfg.Cloud` via `config.Resolve`, then `cloud.Select`; nil → quiet). Two args `<provider> list` → that provider. Any other two-arg combination → usage, exit 2. `list` joins the reserved words and is rejected as a persist value by construction (it is consumed before validation).
7. **`printTable(w, header []string, rows [][]string)`** extracted from `printKubeTable`; both call sites use it (kube passes its CURRENT marker rows the same way). Header printed only when rows exist.

## Risks / Trade-offs

- [Account email in the GCP table vs PRD's "account email off"] → the PRD exclusion targets the prompt segment (best-effort display); the table reads the same local INI with zero extra I/O classes. Documented in the proposal.
- [AWS credentials file may contain secrets] → we read only section names, never key values; no secret ever reaches output.
- [Provider file formats drift] → same graceful degradation as everywhere: unparsable → empty table, exit 0.

## Migration Plan

Additive; no behavior change for existing forms. Revert to roll back.

## Open Questions

None — read-only scope and the bare `cloud list` form were confirmed by the user.
