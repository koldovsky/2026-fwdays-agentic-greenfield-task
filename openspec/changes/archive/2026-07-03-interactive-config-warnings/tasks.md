## 1. Probes

- [x] 1.1 `azure.Check(lookup, home) []string` — azureProfile.json exists but unparsable → one warning naming the path; missing → nil; tests (broken, missing, healthy, BOM)
- [x] 1.2 `kube.Check(lookup, home) []string` — each `$KUBECONFIG` file that exists but fails to parse → warning naming it; missing files silent; tests (one broken among readable, all healthy, missing)

## 2. cmd wiring

- [x] 2.1 `warnAll(stderr, notes)` helper (`omnictx: warning:` prefix); `runCloud`: print config.Resolve notes in read-back / bare list / use paths; azure probe in `cloud azure list` and bare list when azure is active; `runKube` list: kube probe
- [x] 2.2 Tests: broken omnictx config → `omnictx cloud` warns on stderr, still prints auto, exit 0; broken azureProfile → `cloud azure list` warns, exit 0; `kube list` with one broken of two files warns but lists the rest; healthy → stderr empty; render with all sources broken → stderr empty

## 3. Docs and verification

- [x] 3.1 `AGENTS.md` conventions: errors are silent in render, warned in interactive subcommands; `README.md` troubleshooting line
- [x] 3.2 `go test ./... -race -count=1`, `make lint`, `go vet ./...` green; smoke with a deliberately broken temp config
