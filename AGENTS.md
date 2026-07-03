# AGENTS.md — omnictx

## What this is
`omnictx` is a Go CLI that prints a prompt segment with the active **cloud**
(Azure / AWS / GCP — exactly one) and the current **kube-context** + namespace,
and can also **switch** them (kube-context, gcloud configuration, Azure
subscription). It works on local config files directly, without
kubectl/az/aws/gcloud and without network access — including the switches.

## Core invariant
RENDER MODE NEVER breaks the prompt line and never writes anything: any error →
skip the segment and exit 0. No panics in production (top-level recover in main).
Writes to foreign files (kubeconfig, active_config, azureProfile.json) happen
ONLY in explicit interactive subcommands, which do the opposite: validate
strictly, warn on stderr, and fail loudly with non-zero exit codes.

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
- cmd/omnictx/main.go — flags/env, glue, top-level recover; dispatches subcommands.
  `--help`/`-h` prints a custom grouped usage (description, usage, subcommands,
  flags, `--flag` double-dash display) and exits 0.
  Only flag exposed in render mode: `--shell <bash|zsh|none>` (supplied by `init`,
  not persisted in config). All other settings via env vars or config file.
  Subcommands: `init <bash|zsh>`, `on` / `off` (persist enabled state to config),
  `cloud [azure|aws|gcp|auto|none|on|off]` (persist active cloud to config; `on`/`off`
  alias `auto`/`none` — a pin is not remembered across off/on; no argument prints
  the effective value; invalid value → usage error, exit 2),
  `cloud [azure|aws|gcp] list` (offline read-only table of local accounts: AWS
  profiles from config+credentials names, gcloud configurations, Azure
  subscriptions; bare `cloud list` = active provider; `list` reserved),
  `cloud <azure|gcp> use <account>` (switch active account: gcp writes
  <gcloud>/active_config, azure flips isDefault in azureProfile.json via JSON
  round-trip with BOM preserved; name/id or `aliases.<provider>.<short>` from
  omnictx config; unknown/ambiguous → exit 2, broken source → exit 1; AWS
  excluded — prints `export AWS_PROFILE=<x>` hint, exit 2),
  `kube [<context>|list|on|off]` (switch current-context in kubeconfig / print
  current / list all / toggle the kube segment via config key `kube:`; reserved
  words list|on|off; unknown context → exit 2, unparsable target → exit 1).
- internal/cloud — Provider interface + active-cloud Select (azure|aws|gcp|auto|none).
- internal/azure — Azure provider: active subscription from azureProfile.json (UTF-8 BOM).
- internal/aws — AWS provider: profile (+region) from ~/.aws/config (offline; no STS).
- internal/gcp — GCP provider: active-config project from ~/.config/gcloud (offline).
- internal/ini — tiny stdlib INI reader shared by aws/gcp (no new dependency).
- internal/kube — current-context + namespace from kubeconfig ($KUBECONFIG-aware).
  Also the ONLY write path to a foreign file: `kube <context>` rewrites the
  current-context line (parse-before-write, single-line surgery, atomic rename;
  target = first $KUBECONFIG file with current-context, else first). Writes happen
  only on explicit user command — render mode never writes anything.
- internal/render — format, ANSI colors, bash (\[ \]) / zsh (%{ %}) escaping; the
  cloud slot is provider-driven (label from the active provider, color colors["cloud"]
  with optional per-provider colors[key] override).
- internal/config — merge flags + env + YAML config file → struct
  (precedence: flag > env > config > default). Config: ~/.config/omnictx/config.yaml.
  Boolean env vars (OMNICTX_ENABLED / OMNICTX_ICONS / OMNICTX_KUBE) accept on/off
  on top of ParseBool forms. `kube: true|false` (default true) gates the kube
  segment on top of the segments list; OMNICTX_KUBE is the session override.
- internal/shellinit — `init bash|zsh` code generation (go:embed templates).
  Output must be idempotent. No shell functions defined (omnion/omnioff removed).
- testdata — fixtures and golden files.

## Conventions
- Business logic lives in internal/*, tested against fixtures in testdata/.
- Errors reading/parsing sources OR config are NOT propagated as fatal — the segment
  is simply skipped / defaults are used.
- Each data source, config merge, render, and shellinit output is covered by
  table-driven tests.
- When OMNICTX_ENABLED=false, print empty and exit 0.
- Mandatory test cases: UTF-8 BOM in azureProfile.json; $KUBECONFIG merge
  (current-context from the first file); color escaping for bash and zsh;
  config precedence; idempotent init output; AWS profile/region precedence and
  GCP active-config/project precedence; INI parsing (sections/comments/broken →
  empty); cloud Select (explicit pin / auto-by-priority / none).

## Design decisions (resolved during implementation)
- The `namespace` segment is visually coupled to `kube` and rendered as
  `context:namespace` (icons) / `context/namespace` (ASCII). It has no standalone
  representation: if kube is disabled/unavailable, namespace is not shown.
- Exactly ONE cloud is shown. `cloud: azure|aws|gcp|auto|none` selects it
  (precedence `OMNICTX_CLOUD` > config > default `auto`); `auto` picks the single
  present cloud by priority azure→aws→gcp. Kubernetes is an independent segment,
  unaffected by the cloud selection.
- The `segments` list uses a single `cloud` slot; `azure`/`az`/`aws`/`gcp` are
  accepted aliases for `cloud` (kube aliases k/k8s; namespace alias ns). Unknown
  and duplicate entries are dropped while preserving order.
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
