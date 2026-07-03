## Context

"Any error → silently skip" is the core render invariant and must stay. But the same swallow-everything behavior leaks into interactive subcommands, where it actively harms: today a config YAML typo silently killed aliases, and an unparsable azureProfile.json silently emptied the cloud slot — both took a debugging session to find, with the answer being one stderr line away. The building blocks exist: `config.Resolve` already returns debug notes (discarded by every caller), and the parsers already know when a file exists but fails to parse.

## Goals / Non-Goals

**Goals:**
- One-line stderr warnings (`omnictx: warning: ...`) in interactive paths for: broken omnictx config, invalid env values, unparsable azureProfile.json, unparsable kubeconfig files.
- Zero change to exit codes, stdout contracts, or render behavior.

**Non-Goals:**
- AWS/GCP INI warnings — `internal/ini` is lenient by design (skips bad lines, never errors); a "broken" INI is indistinguishable from a sparse one. Documented, not probed.
- A `--verbose`/`--debug` render flag (out of scope; render stays flag-free except `--shell`).
- Failing commands on warnings — warnings inform, they never gate.

## Decisions

1. **Probes, not signature changes: `azure.Check()` and `kube.Check()` return `[]string` of human-readable problems.**
   Alternative — making `Subscriptions()`/`Contexts()` return errors — was rejected: it ripples through render-path callers that must keep ignoring problems, and conflates "empty" (normal) with "broken" (warn) at every call site. A separate probe keeps read paths pure and is called only where warnings are wanted. Probe logic: file exists (`os.Stat` succeeds) AND parse fails → problem; missing file → normal, no warning.
2. **Config notes are printed where `config.Resolve` is called interactively** (`runCloud` read-back / bare list / use). A tiny `warnAll(stderr, notes)` helper prefixes each with `omnictx: warning:`. The notes' wording stays as `config.Resolve` produces it (it already names the file and reason).
3. **Wire-up points are exactly three:** `runCloud` (config notes always; azure probe in the azure-list branches), `runKube` list branch (kube probe). `on/off/toggle`/`init` don't read these sources and stay untouched.
4. **Warnings go to stderr only** so scripts consuming stdout tables/values are unaffected; exit codes unchanged so `set -e` pipelines don't start failing on cosmetic issues.

## Risks / Trade-offs

- [Warning noise for users who intentionally keep a broken file around] → warnings appear only in commands the user types by hand, never in the prompt loop; one line per source.
- [Probe duplicates a parse (list + check both read the file)] → these are interactive, sub-millisecond reads of small files; clarity wins over a micro-optimization.

## Migration Plan

Additive; no behavior change for healthy configurations. Revert to roll back.

## Open Questions

None.
