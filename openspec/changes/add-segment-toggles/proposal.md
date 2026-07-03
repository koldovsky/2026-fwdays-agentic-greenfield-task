## Why

Users want one consistent command family to show/hide individual prompt segments: `omnictx kube on|off` and `omnictx cloud on|off`, matching the existing `omnictx on/off`. Today hiding the cloud slot requires knowing the `cloud: none` value, and hiding the kube segment requires editing the `segments` list by hand. These toggles are persistent (config-file writes) by nature — a subcommand cannot alter the calling shell's environment — and session-scoped overrides remain env vars, so the two-tier model (env = session, subcommand = persistent) stays intact and gains a missing env var for kube.

## What Changes

- `omnictx cloud on|off`: aliases resolved before validation — `off` persists `cloud: none`, `on` persists `cloud: auto`. No new config key. A previous provider pin is not remembered (`off` → `on` lands on auto-detect; re-pin with `omnictx cloud <provider>`).
- `omnictx kube on|off`: persists a NEW top-level boolean config key `kube: true|false` (default `true`). The kube segment renders only when the `segments` list contains `kube` AND the `kube` key resolves true; namespace disappears with kube as usual. `on`/`off` join `list` as reserved words of the `kube` subcommand, checked before context-name lookup (contexts literally named `on`/`off`/`list` are not switchable via omnictx — accepted edge case).
- NEW env var `OMNICTX_KUBE` — session-scoped override of the `kube` key (precedence env > config > default, unchanged).
- All boolean `OMNICTX_*` env vars (`OMNICTX_ENABLED`, `OMNICTX_ICONS`, new `OMNICTX_KUBE`) and the `kube`/`enabled`/`icons` config values accept `on`/`off` (case-insensitive) in addition to `strconv.ParseBool` values, via one shared parse helper. Invalid values are ignored with a debug note (existing behavior).
- Docs: grouped `--help`, `AGENTS.md`, `README.md` (session-vs-persistent table covering enabled/cloud/kube).

No breaking changes: all existing values, commands, and the render invariant are untouched.

## Capabilities

### New Capabilities

<!-- none: both affected areas already have capability specs -->

### Modified Capabilities

- `cloud-selection-cli`: the persist requirement gains `on`/`off` as accepted aliases (mapped to `auto`/`none` before writing); the strict-validation requirement's allowed set is extended accordingly.
- `kube-context-cli`: the validation requirement's reserved-word rule extends from `list` to `list|on|off`; new requirements for the persistent `omnictx kube on|off` toggle (config key `kube:`) and the session-scoped `OMNICTX_KUBE` override with on/off boolean parsing.

## Impact

- `internal/config`: `Kube bool` field, `kube:` YAML key, `OMNICTX_KUBE` env, shared bool-parse helper (`on`/`off` support for all bool envs).
- `cmd/omnictx/main.go`: `runCloud` alias mapping; `runKube` reserved words `on`/`off` → `setConfigKey("kube", ...)`; `gather` skips kube when disabled; `printUsage`.
- Tests: `internal/config` resolution tables; `cmd/omnictx` subcommand tables; render/gather integration.
- `AGENTS.md`, `README.md`; no new dependencies.
- Sequencing note: the active change `add-kube-subcommand` should be synced/archived first so the `kube-context-cli` main spec exists before this change's delta is synced.
