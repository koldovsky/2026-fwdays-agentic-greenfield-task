# AGENTS.md — omnictx

## What this is
`omnictx` is a Go CLI that prints a prompt segment with the current kube-context,
namespace, and active Azure subscription. It reads config files directly, without
kubectl/az and without network access.

## Core invariant
The utility NEVER breaks the prompt line. Any error → skip the segment and exit 0.
No panics in production (top-level recover in main).

## Stack and dependencies
- Go (current stable version, pinned in go.mod).
- Single external dependency: gopkg.in/yaml.v3. Everything else is stdlib.
- Do not add client-go or network libraries.

## Commands
- Build:    make build   (go build -o bin/omnictx ./cmd/omnictx)
- Test:     make test    (go test ./... -race -count=1)
- Lint:     make lint    (golangci-lint run)
- Install:  make install (copy binary to ~/.local/bin)
- Update golden: go test ./internal/render -update

## Structure
- cmd/omnictx/main.go — flags/env, glue, top-level recover; dispatches `init` subcommand.
  `--help`/`-h` prints a custom grouped usage (description, usage, subcommands,
  flags with allowed values + env vars, `--flag` double-dash display) and exits 0;
  the master on/off is a single `--enabled[=<bool>]` flag (no `--disabled`).
- internal/kube — current-context + namespace from kubeconfig ($KUBECONFIG-aware).
- internal/azure — active subscription from azureProfile.json (handle UTF-8 BOM).
- internal/render — format, ANSI colors, bash (\[ \]) / zsh (%{ %}) escaping.
- internal/config — merge flags + env + YAML config file → struct
  (precedence: flag > env > config > default). Config: ~/.config/omnictx/config.yaml.
- internal/shellinit — `init bash|zsh` code generation (go:embed templates) +
  omnion/omnioff/omnitoggle functions. Output must be idempotent.
- testdata — fixtures and golden files.

## Conventions
- Business logic lives in internal/*, tested against fixtures in testdata/.
- Errors reading/parsing sources OR config are NOT propagated as fatal — the segment
  is simply skipped / defaults are used. Diagnostics only under --debug to stderr.
- Each data source, config merge, render, and shellinit output is covered by
  table-driven tests.
- When OMNICTX_ENABLED=false, print empty and exit 0 (drives omnion/omnioff).
- Mandatory test cases: UTF-8 BOM in azureProfile.json; $KUBECONFIG merge
  (current-context from the first file); color escaping for bash and zsh;
  config precedence; idempotent init output.

## Design decisions (resolved during implementation)
- The `namespace` segment is visually coupled to `kube` and rendered as
  `context:namespace` (icons) / `context/namespace` (ASCII). It has no standalone
  representation: if kube is disabled/unavailable, namespace is not shown.
- Segment names accept aliases (az→azure, k/k8s→kube, ns→namespace); unknown and
  duplicate entries are dropped while preserving order.
- A `default` namespace is shown as-is (no special suppression) when the segment is
  enabled and the value is non-empty.
- `init` snippets call the binary via its bare name `omnictx` (must be on PATH),
  matching starship/zoxide/direnv conventions.

## CI
GitHub Actions pinned to node24 majors (checkout@v6, setup-go@v6,
golangci-lint-action@v9 with `version: v2.12`, upload-artifact@v7); no Node-20
deprecation warnings. Job shape: go vet → golangci-lint → go test -race → build
matrix linux/amd64,arm64.

## Definition of Done
See section 7.5 of PRD.md. In short: build+test(-race) green, edge cases covered,
prompt never breaks, config + init/toggles work, CI green, README with the
`eval "$(omnictx init bash)"` install path.
