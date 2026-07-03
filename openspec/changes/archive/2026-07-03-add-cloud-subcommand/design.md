## Context

`omnictx` already has a two-tier control pattern for the `enabled` setting: session-scoped via env (`OMNICTX_ENABLED`) and persistent via subcommands (`omnictx on|off|toggle`) that rewrite a single line of the YAML config through `setConfigKey` in `cmd/omnictx/main.go`. The `cloud` selection (`azure|aws|gcp|auto|none`) has the session tier (`OMNICTX_CLOUD`) but no persistent CLI tier — users must hand-edit `~/.config/omnictx/config.yaml`.

Constraints from AGENTS.md that shape the design:
- Render mode exposes only the `--shell` flag; all other knobs are env/config. New behavior must therefore be a subcommand, not a render flag.
- The prompt must never break; but subcommands (`init`, `on`, `off`) are interactive setup mode where non-zero exits are the established convention (`runInit` returns 2 on usage errors).
- Config writes must preserve comments and unrelated keys (already guaranteed by `setConfigKey`).

## Goals / Non-Goals

**Goals:**
- One-command persistent switching of the displayed cloud: `omnictx cloud aws`.
- Read-back of the effective selection: `omnictx cloud` (no argument).
- Strict validation with a clear usage error (exit 2) for unknown values.
- Zero new dependencies; reuse existing helpers.

**Non-Goals:**
- No `--cloud` render-mode flag (would violate the "only `--shell`" contract and would not persist anyway).
- No change to precedence: env `OMNICTX_CLOUD` still overrides the persisted config value per-session.
- No per-shell state, no toggle-style cycling through providers.
- No changes to `internal/cloud` selection logic or providers.

## Decisions

1. **Subcommand named `cloud`, matching the config key.**
   Alternative considered: `omnictx use <v>` (kubectx style). Rejected: `cloud` is self-documenting, mirrors the YAML key and `OMNICTX_CLOUD`, and keeps the mental model "subcommand name == config key" established by `on`/`off` → `enabled`.

2. **Dispatch in `main()` alongside `init`/`on`/`off`; implement as `runCloud(args []string) int`.**
   `case "cloud": os.Exit(runCloud(args[1:]))`. Same shape as `runInit`/`runEnable`, keeping `cmd/omnictx` a thin glue layer.

3. **Persist via the existing `setConfigKey(globalConfigPath(), "cloud", v)`.**
   Alternative considered: YAML round-trip via yaml.v3. Rejected: `setConfigKey` already exists, preserves comments/keys, creates file+dir, and is battle-tested by `on`/`off`. A YAML round-trip would destroy comments.

4. **Validation is a small local check against the canonical set, lowercasing and trimming input first.**
   The valid set (`azure|aws|gcp|auto|none`) is expressed with the existing constants (`config.CloudAuto`, `config.CloudNone`, `config.SegmentAzure`, plus `"aws"`, `"gcp"`). Deliberately NOT reusing `config.normalizeCloud`: it maps unknown → `auto` silently, which is correct for render mode but would swallow typos here (`omnictx cloud awz` must fail loudly, not pin `auto`).

5. **`omnictx cloud` (no args) prints the effective value via `config.Resolve`.**
   Reuses the standard precedence chain (env > config > default) instead of re-reading the file ad hoc, so the printed value is exactly what the renderer would use. Output is the bare value plus newline — script-friendly.

6. **Exit codes follow the `runInit` convention:** 0 on success, 2 on usage error (invalid value or too many arguments), 1 on I/O failure writing the config (matching `runEnable`).

## Risks / Trade-offs

- [User confusion: `OMNICTX_CLOUD` set in the shell masks the just-persisted value] → `omnictx cloud` (no args) reports the effective value, making the override visible; help text notes the precedence.
- [Config file with `cloud:` under a nested/unusual YAML structure] → `setConfigKey` matches a trimmed `cloud:` line prefix; same limitation already accepted for `enabled:`. Documented behavior is a flat config (Appendix A of PRD).
- [Value written is valid but provider absent (e.g., pin `aws` with no `~/.aws`)] → by design: a pinned-but-empty provider yields an empty Reading and the segment is skipped (existing `cloud.Select` semantics); nothing breaks.

## Migration Plan

Purely additive; no migration. Rollback = revert the commit. Existing configs, env vars, and subcommands are untouched.

## Open Questions

None — naming (`cloud` over `use`) and strict-validation semantics were settled during proposal discussion with the user.
