## Context

The CLI has a persistent-toggle family built on `setConfigKey` (single-line YAML surgery on omnictx's own config): `omnictx on/off/toggle` → `enabled:`, `omnictx cloud <v>` → `cloud:`. The user wants the same verbs per segment: `omnictx kube on|off`, `omnictx cloud on|off`. A subcommand cannot mutate the calling shell's environment, so these are persistent by definition; session-scoped hiding stays in env vars. Cloud already has both tiers (`cloud: none` / `OMNICTX_CLOUD`); kube has neither a persistent nor a session toggle short of editing `segments`.

## Goals / Non-Goals

**Goals:**
- `omnictx cloud on|off` and `omnictx kube on|off` with the exact semantics and error conventions of the existing family.
- Session tier for kube: `OMNICTX_KUBE`.
- `on`/`off` accepted wherever booleans are parsed from env (ergonomics, matches the command verbs).

**Non-Goals:**
- Remembering a previous cloud pin across `off`/`on` (would need a second config key; re-pinning is one command).
- A namespace toggle (`omnictx ns on/off`) — possible later with the same pattern; not requested.
- Shell functions in `init` for session toggles — stays removed (settled design decision).

## Decisions

1. **`cloud on|off` are aliases, not new state: `off` → `cloud: none`, `on` → `cloud: auto`.**
   Mapped in `runCloud` before validation; the config vocabulary (`azure|aws|gcp|auto|none`) is unchanged, so render-mode `normalizeCloud` needs no changes. Alternative — a separate `cloud_enabled` boolean orthogonal to the pin — was rejected: two keys for one visible slot invites contradictory states.

2. **`kube` is a new top-level boolean config key, not a `segments` edit.**
   `omnictx kube off` must not destroy the user's `segments` order/customization; a boolean key composes cleanly (`segments` says where, `kube:` says whether). Default `true`, so absent key = today's behavior. Resolution: `Kube bool` in `config.Config`, pointer field in `fileConfig`, `OMNICTX_KUBE` in `applyEnv`.

3. **Enforcement point: `gather` in cmd (skip reading kubeconfig when disabled), mirroring how a missing segment already works.**
   Render receives no kube data → segment and namespace suffix vanish; no render-package changes needed beyond none — golden tests already cover the "no kube" shape.

4. **Reserved words of `runKube` become `list|on|off`, checked before context lookup.**
   `on`/`off` route to `setConfigKey(globalConfigPath(), "kube", ...)` — they write omnictx's config, never a kubeconfig. Contexts literally named `list`/`on`/`off` stay reachable via kubectl only; accepted (such names are unrealistic, and the alternative — positional escape syntax — is not worth the complexity).

5. **One shared bool parser (`parseBool`: trim, lowercase, `on`→true, `off`→false, else `strconv.ParseBool`) used by `OMNICTX_ENABLED`, `OMNICTX_ICONS`, `OMNICTX_KUBE`, and the YAML `kube:` key via string round-trip only where needed.**
   YAML `kube: on` is parsed by yaml.v3 as the string `"on"` into a typed field — the config key is declared as `*bool`, so YAML `true/false` works natively; `on/off` support in the *file* is NOT provided (YAML 1.1 on/off ambiguity; env vars are the ergonomic layer). Keeps the file vocabulary strict and the env vocabulary friendly.

## Risks / Trade-offs

- [User confusion: `omnictx kube off` (display toggle) vs `omnictx kube <ctx>` (real context switch) under one verb] → help text separates the forms explicitly; `off` never touches kubeconfig, which the README states in one sentence.
- [`cloud off` → `on` loses a pin] → documented in help/README; deliberate simplicity.
- [YAML file rejects `kube: on`] → `on/off` documented as env/CLI vocabulary; the file uses `true/false` (what `setConfigKey` writes).

## Migration Plan

Additive; default `kube: true` preserves existing behavior. Rollback = revert.

## Open Questions

None — persistence semantics, alias mapping (`on`→`auto`), and reserved words were confirmed with the user before this change was created.
