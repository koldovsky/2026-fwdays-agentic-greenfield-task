## Why

Two real incidents today exposed the same UX gap: a one-character YAML typo in the omnictx config silently disabled aliases (the whole config is ignored by design), and a hand-edited, unparsable `azureProfile.json` silently emptied both `cloud azure list` and the auto-selected cloud slot. "Silently ignore broken sources" is exactly right for render mode (the prompt must never break) — but in **interactive** subcommands the silence hides the root cause from the very person who could fix it.

## What Changes

- Interactive subcommand paths print warnings to **stderr**, prefixed `omnictx: warning:`; exit codes are unchanged (`list` still exits 0 with whatever it could read).
- Three sources of warnings:
  1. **omnictx config debug notes** — `config.Resolve` already produces them (broken config file, invalid env values); they are currently discarded. Every interactive call site (`runCloud` no-arg / bare `list` / `use`) prints them.
  2. **`azure.Check`** — new probe: `azureProfile.json` exists but is unparsable → one warning naming the path. Printed by `cloud azure list` and bare `cloud list` when azure is the active provider.
  3. **`kube.Check`** — new probe: each `$KUBECONFIG` file that exists but fails to parse → one warning per file. Printed by `kube list`.
- **Render mode emits nothing on stderr**, even with every source broken — the invariant is untouched.
- Non-goal (documented): AWS/GCP INI sources — the INI reader is lenient by design and effectively cannot fail; nothing to probe.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `cloud-selection-cli`: ADDED requirement — interactive warnings for broken omnictx config and unparsable azureProfile.json.
- `kube-context-cli`: ADDED requirement — `kube list` warns about unparsable kubeconfig files while still listing the readable ones.

## Impact

- `internal/azure`: `Check()` probe + tests.
- `internal/kube`: `Check()` probe + tests.
- `cmd/omnictx`: small `warn` helper; wire-ups in `runCloud`/`runKube`; tests (incl. render-stays-silent).
- `AGENTS.md` conventions note, `README.md` troubleshooting line. No new dependencies.
