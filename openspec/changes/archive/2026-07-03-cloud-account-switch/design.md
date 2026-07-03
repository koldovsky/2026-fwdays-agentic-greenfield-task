## Context

After `cloud-account-list`, omnictx can show AWS profiles, gcloud configurations, and Azure subscriptions. Switching them still needs the vendor CLIs. Both switchable targets are local files: gcloud's `active_config` (a single-line name file) and Azure's `azureProfile.json` (`isDefault` flags). The project already has one foreign-file write path (kubeconfig `current-context`) with an established safety recipe: parse-before-write, minimal edit, atomic rename, explicit-command-only. AWS has no analogous persistent state — `AWS_PROFILE` is the mechanism, and it is session-scoped by design.

## Goals / Non-Goals

**Goals:**
- `cloud gcp use <name>` and `cloud azure use <name-or-id>` with the kube-switch safety properties.
- Short aliases from omnictx's own config (`aliases.<provider>.<short>`).
- An honest AWS answer: a hint, not a fake.

**Non-Goals:**
- AWS persistent profile switching (would desynchronize omnictx from the real `aws` CLI).
- Creating configurations/subscriptions; only activating existing ones.
- Aliases for kube contexts (possible later; not requested).

## Decisions

1. **Explicit `use` verb instead of a bare positional account** (`cloud gcp use work`, not `cloud gcp work`). Keeps the grammar unambiguous against the pin form (`cloud gcp`) and future verbs; `use` joins `list`/`on`/`off` as reserved words. Chosen by the user.
2. **GCP: write `active_config` wholesale.** The file's entire content is one name — this is line surgery degenerated to its simplest case. Validate `config_<name>` exists first (reuse `Configurations()`); write atomically via the same temp+rename helper pattern as kube (extract or mirror `atomicWrite`).
3. **Azure: full JSON round-trip via `map[string]any`, not line surgery.** Flipping one `true` and N `false`s across array-object boundaries cannot be done reliably by line matching. JSON carries no comments, so a decode→edit→`MarshalIndent`→write cycle preserves every field; only key order and whitespace normalize — `az` parses either. BOM: strip before decode, re-prepend on write when originally present. Unknown fields survive because the whole document is generic maps.
4. **Matching: exact name OR exact id (case-insensitive for ids); ambiguous name → exit 2 with the candidates and their ids.** Real-world files contain duplicate display names ("N/A(tenant level account)" twice in the user's own profile), so id support is a correctness requirement, not a nicety.
5. **Aliases in `internal/config` as `Aliases map[string]map[string]string`, file-only.** No env var: aliases are static personal shorthand, and an env-var encoding for a nested map would be ugly. Resolution happens in `runCloud` before calling the provider's `Use` — providers stay alias-agnostic.
6. **AWS `use` → hint + exit 2.** Printing `export AWS_PROFILE=<x>` teaches the correct mechanism; exiting non-zero keeps scripts from believing a switch happened.
7. **Switch functions live in the provider packages** (`gcp.Use`, `azure.Use`), mirroring `kube.WriteContext`: business logic + file safety in `internal/*`, cmd maps errors to exit codes (2 = user error with candidates in the message, 1 = I/O/parse).

## Risks / Trade-offs

- [Rewriting `azureProfile.json` reorders keys/whitespace] → az reads parsed JSON, not bytes; accepted and documented. All *data* is preserved by construction.
- [az CLI writing the file concurrently] → last-writer-wins, same as az vs az; atomic rename prevents torn files. Accepted.
- [User switches Azure account that a render then shows stale in an open shell] → render re-reads on every prompt; no staleness beyond the current line.
- [Alias shadowing a real account name] → alias map is consulted first by design; documented ("aliases win"). The user controls both sides.

## Migration Plan

Additive. No changes to existing forms or files until `use` is invoked. Revert to roll back.

## Open Questions

None — verb form (`use`), alias home (omnictx config), and the AWS exclusion were all decided with the user.
