# PRD — `omnictx`: a zero-config multi-cloud context segment for the shell prompt

> Status: Living spec (current state documented; multi-cloud is the next build).
> Branch: `feat/omnictx`
> Implementation language: **Go** · Single external dependency: `gopkg.in/yaml.v3`
> Intended executor: Claude Code / any coding agent, driven by this spec + `AGENTS.md`.

---

## 1. Goal and problem

When working across multiple Kubernetes clusters and cloud accounts it is easy to
run a command "in the wrong place." `omnictx` is a small Go binary that prints a
single prompt segment showing **which cloud account and which kube-context are
active right now**:

```
☁ prod-subscription ⎈ aks-prod:payments
```

It reads local config files **directly** (no `kubectl`/`az`/`aws`/`gcloud`, no
network), so it is fast enough to run on every prompt render.

**Core invariant — the prompt never breaks.** Any error (missing file, broken
YAML/JSON/INI, not logged in) causes the affected segment to be silently skipped
and the process to `exit 0`. There is never an error in the prompt line.

**Positioning.** Tools like `kube-ps1` (Kubernetes only) and `starship` (built-in
`kubernetes`/`aws`/`gcloud`/`azure` modules, assembled and configured separately)
cover parts of this. `omnictx`'s niche is a **single self-contained binary that
shows the active cloud + kube context out of the box, zero-config**, reading all
sources directly with one consistent format and one set of toggles.

---

## 2. Current state (already implemented and green)

The following is **done** on `feat/omnictx` and must remain working:

- Binary `omnictx`; module `omnictx` (bare path); packages under `internal/*`.
- Segments: active **Azure subscription**, **kube-context**, **namespace**.
- Reads `~/.azure/azureProfile.json` (BOM-aware) and kubeconfig (`$KUBECONFIG`-aware).
- ANSI colors with shell-correct escaping: `--shell bash` → `\[ \]`, `zsh` → `%{ %}`, `none` → raw.
- Config `~/.config/omnictx/config.yaml`; precedence **flag > env > config > default**.
- Env prefix `OMNICTX_*`.
- `omnictx init bash|zsh` emits idempotent, non-clobbering prompt integration
- Custom grouped `--help` (replaces `flag.PrintDefaults()`): description, usage,
  subcommands, `--shell` flag, `--version`, `-h/--help`. All other settings via
  env vars (`OMNICTX_*`) or config file.
- Tests: table-driven per package, golden tests for `render`, a `bash -c` eval
  smoke test for `init`, a `--help` test, a render benchmark.
- CI on node24-pinned actions: `actions/checkout@v6`, `actions/setup-go@v6`,
  `golangci/golangci-lint-action@v9` (`version: v2.12`), `actions/upload-artifact@v7`;
  steps `go vet` → `golangci-lint` → `go test -race` → build matrix `linux/amd64,arm64`.

**The next functionality to add is multi-cloud (AWS + GCP) — §5.**

---

## 3. Scope

### In scope
- Existing Azure + Kubernetes segments (§2, §4).
- **New:** AWS and GCP cloud providers, read offline from local config (§5).
- **New:** a single *active cloud* selected via config (`azure`/`aws`/`gcp`/`auto`/`none`).
- A tiny shared INI reader for `~/.aws/config` and gcloud config (no new dependency).

### Out of scope
- Network calls or shelling out to `kubectl`/`az`/`aws`/`gcloud`.
- Showing **more than one** cloud at a time (by design: one active cloud).
- AWS account-id (requires `sts`/network) and GCP account email (best-effort, off).
- Windows and fish shells.
- Watch mode, daemon, caching (direct reads are already < 10 ms).
- Switching the module path to a domain path (a future, separate task).

---

## 4. Functional requirements (base — the current contract)

### 4.1 Segments and output
Order follows the configured `segments` list. Default (with icons):
```
☁ <cloud>  ⎈ <context>:<namespace>
```
ASCII mode (`icons: false` / `OMNICTX_ICONS=false`): `az:<...> k8s:<context>/<namespace>` (provider label per §5.3).
Rules: a segment whose data is unavailable is **skipped entirely** (no empty
placeholders); namespace renders only as a suffix of the kube segment; if nothing
renders, print an empty string and exit 0; `separator` (default `" "`) joins parts.

### 4.2 Colors and escaping
ANSI codes wrapped per `--shell` (`bash`/`zsh`/`none`) so the shell measures prompt
width correctly. Each segment has its own color from config.

### 4.3 Flags / env / config
Precedence **flag > env > config > default**. Env prefix `OMNICTX_*`. Config at
`~/.config/omnictx/config.yaml` (`OMNICTX_CONFIG` env var to override path).
A missing/broken config silently falls back to defaults.
Only CLI flag in render mode: `--shell <bash|zsh|none>` (supplied by `init`, never
persisted in config). All other settings via env vars or config file.

### 4.4 Data sources (existing)
- **Kubernetes:** files from `$KUBECONFIG` (colon list) else `~/.kube/config`;
  current-context = first file that sets it; namespace from the matching context.
- **Azure:** `$AZURE_CONFIG_DIR/azureProfile.json` else `~/.azure/azureProfile.json`;
  strip UTF-8 BOM; subscription with `isDefault: true` → its `name`.

### 4.5 Error behavior & init
Always `exit 0` in render mode; top-level `recover`; `OMNICTX_ENABLED=false` →
print empty. `init` output is idempotent and prepends to the user's prompt without
clobbering it. `omnictx on` / `omnictx off` persist the enabled state to config.

### 4.6 Global on/off
`omnictx on` / `omnictx off` persist the enabled state to config so all future
shells see it:

```
omnictx off   # writes enabled: false to config — all future shells start quiet
omnictx on    # writes enabled: true  to config — restores default behaviour
```

Session-only: `export OMNICTX_ENABLED=false` (not persisted).

### 4.7 Kube-context switching (later scope extension)

`omnictx kube <context>` switches the kubeconfig `current-context`;
`omnictx kube` prints the current one; `omnictx kube list` lists all contexts
(current marked, `list` reserved). This is the only write to a file omnictx does
not own, and only on an explicit user command — render mode stays read-only.
Safety: the context must exist in the parsed kubeconfigs (else exit 2, no
write), the edit is a single-line surgery preserving all other bytes, the write
is atomic (same-dir temp + rename, permissions preserved), and an unparsable
target is refused (exit 1). Multi-file `$KUBECONFIG`: the first file that sets
`current-context` is updated, else the first file (mirrors the read rule and
kubectl). Namespace switching is out of scope (nested YAML edit in a foreign
file).

Implementation: subcommands in the binary that read the config path
(`OMNICTX_CONFIG` > `~/.config/omnictx/config.yaml`), update only the `enabled:`
line in the YAML (preserving comments and other keys), and create the file/dir if
absent. No shell functions needed.

---

## 5. NEXT: multi-cloud (AWS + GCP) — the new work

### 5.1 Model: exactly one active cloud, chosen in config
A new config key selects the active cloud provider:

```yaml
cloud: auto        # azure | aws | gcp | auto | none
```

- `azure` / `aws` / `gcp` — pin that provider as the active cloud.
- `auto` (default) — pick the **single** cloud whose local config is present, by
  priority **azure → aws → gcp** (first present wins). If none are present, the
  cloud slot is empty.
- `none` — no cloud segment (kube-only).

Override order (same precedence as everything): `--cloud <v>` > `OMNICTX_CLOUD` >
`cloud:` in config > default (`auto`). **Kubernetes is independent** — it is its
own segment and is unaffected by the cloud selection.

The `segments` list uses a single **`cloud`** slot (not per-provider names).
Default segments: `[cloud, kube, namespace]`. (`azure` remains accepted as a
backward-compatible alias for `cloud`.)

### 5.2 Provider interface (refactor FIRST, before adding AWS/GCP)
Introduce a small interface and make the existing Azure reader implement it, so
`render` stops special-casing Azure. Do this first and keep all tests green.

```go
// internal/cloud
type Reading struct { Text string; OK bool }

type Provider interface {
    Key() string                       // "azure" | "aws" | "gcp"
    Label(icons bool) string           // icon prefix "☁ " or ASCII "az:"/"aws:"/"gcp:"
    Present(lookup LookupEnv, home string) bool   // for `auto` detection
    Read(lookup LookupEnv, home string) Reading
}
```
`render` asks the **active** provider (per §5.1) for its `Reading` and renders the
cloud slot with `colors["cloud"]` (optional per-provider color overrides allowed).

### 5.3 AWS provider (`internal/aws`, offline)
- **profile:** `AWS_PROFILE` > `AWS_VAULT` > `default`.
- **region:** `AWS_REGION` > `AWS_DEFAULT_REGION` > the profile's `region` in
  `~/.aws/config` (`AWS_CONFIG_FILE` overrides the path). Note: non-default
  profiles are sections `[profile NAME]`; the default is `[default]`.
- **display:** `profile` + (`/<region>` if known). Label: icon `☁ ` / ASCII `aws:`.
- **Present():** `~/.aws/config` or `~/.aws/credentials` exists, or `AWS_PROFILE`/`AWS_REGION` set.
- account-id is **out of scope** (needs `sts`).

### 5.4 GCP provider (`internal/gcp`, offline)
- **active config name:** `CLOUDSDK_ACTIVE_CONFIG_NAME` > the single line in
  `<gcloud>/active_config` (default `default`), where `<gcloud>` = `CLOUDSDK_CONFIG`
  or `~/.config/gcloud`.
- **project:** `CLOUDSDK_CORE_PROJECT` > `GOOGLE_CLOUD_PROJECT` > `[core] project`
  in `<gcloud>/configurations/config_<name>`.
- **display:** `project`. Label: icon `☁ ` / ASCII `gcp:`.
- **Present():** `<gcloud>` dir exists, or `CLOUDSDK_*`/`GOOGLE_CLOUD_PROJECT` set.

### 5.5 Shared INI reader (`internal/ini`)
A minimal INI parser (sections `[name]`, `key = value`, comments `#`/`;`, a default
section) used by both AWS and GCP. ~40–60 lines, stdlib only — **no new dependency**.
Graceful: any parse error yields no value (never breaks the prompt).

### 5.6 Config / env additions
- Config: `cloud:` key (§5.1); `colors.cloud` (+ optional `colors.azure|aws|gcp`).
- Env: `OMNICTX_CLOUD=azure|aws|gcp|auto|none`.
- `--help` lists env vars under the Configuration section.

### 5.7 Icons / ASCII
Icon mode: per-provider Nerd Font glyph + value (`󰠅 ` Azure, ` ` AWS, `󱇶 ` GCP).
ASCII mode: provider label `az:` / `aws:` / `gcp:` + value.

---

## 6. Non-functional requirements
- **Performance:** cold start + render < 10 ms; keep the `render` benchmark.
- **Dependencies:** only `gopkg.in/yaml.v3` (+ stdlib). No cloud SDKs, no `client-go`,
  no network libraries. The INI reader is hand-written stdlib.
- **Binary:** single static file; cross-compiled `linux/amd64` + `linux/arm64`.

---

## 7. Architecture and repository structure (target)
```
omnictx/
├── cmd/omnictx/            # flags/env, init dispatch, grouped --help, top-level recover
├── internal/cloud/         # Provider interface + active-cloud selection (auto/none)
├── internal/azure/         # Azure provider (subscription)
├── internal/aws/           # AWS provider (profile + region)        [NEW]
├── internal/gcp/           # GCP provider (project)                 [NEW]
├── internal/ini/           # tiny shared INI reader                 [NEW]
├── internal/kube/          # current-context + namespace
├── internal/render/        # format, colors, bash/zsh escaping (provider-driven)
├── internal/config/        # flags+env+YAML → Config (adds `cloud`)
├── internal/shellinit/     # init bash|zsh (go:embed, idempotent; no shell functions)
├── testdata/               # kubeconfig/azureProfile/aws/gcloud fixtures + goldens
├── .github/workflows/ci.yml
├── AGENTS.md · CLAUDE.md · README.md · Makefile · PRD.md · go.mod
```
Principle: business logic in `internal/*`, tested against fixtures; `cmd/omnictx`
is a thin glue layer.

---

## 8. Verification plan

### 8.1 New fixtures (`testdata/`)
- AWS: `aws_config_default` (`[default]` with region), `aws_config_named`
  (`[profile prod]` with region), and one with no region.
- GCP: `gcloud/active_config` (name), `gcloud/configurations/config_<name>` with
  `[core] project`; plus a "no project" case.
- Broken INI files for both → graceful empty.

### 8.2 New tests (table-driven)
- `internal/ini`: sections, default section, comments, `key=value` spacing, broken input → empty.
- `internal/aws`: profile precedence (`AWS_PROFILE`/`AWS_VAULT`/default); region
  precedence (env → config → none); display string; missing files → empty.
- `internal/gcp`: active-config resolution; project precedence (env → config); missing → empty.
- `internal/cloud`: selection — explicit pins; `auto` picks the single present by
  priority; `auto` with none present → empty; `none` → empty; Azure still works
  through the Provider interface.
- `internal/render`: golden tests extended for aws/gcp cloud values × icons/shell.

### 8.3 Acceptance criteria (Definition of Done)
- [ ] `PRD.md` (this file) contains the course task and is fully `omnictx` (no `ctxline`).
- [ ] Provider interface added; Azure routed through it; existing tests stay green.
- [ ] `internal/ini`, `internal/aws`, `internal/gcp` implemented with tests + fixtures.
- [ ] `cloud: azure|aws|gcp|auto|none` works; `auto` picks exactly one present cloud
      by priority; `none` disables the cloud slot; `--cloud`/`OMNICTX_CLOUD` honored.
- [ ] Each new source is offline-only and degrades gracefully (no prompt breakage).
- [ ] Only one cloud is ever shown; kube remains independent.
- [ ] No dependency beyond `yaml.v3`.
- [ ] `--help` stays grouped and unambiguous; env vars listed in Configuration section.
- [ ] `go build`, `go vet`, `go test ./... -race`, `golangci-lint` all green; CI green.
- [ ] `AGENTS.md`, `README.md`, `Makefile` reflect AWS/GCP + the `cloud` config.

---

## 9. CI
Current (keep): `actions/checkout@v6`, `actions/setup-go@v6`,
`golangci/golangci-lint-action@v9` (`version: v2.12`), `actions/upload-artifact@v7`;
steps `go vet` → `golangci-lint` → `go test -race -count=1` → build matrix. Must
stay green with **no Node-20 deprecation warnings**.

---

## 10. Implementation order (loop engineering)
Single branch, single PR at the end. The agent works the loop
(`implement → make test → fix → repeat → make lint`) without step-by-step prompting,
in this order so tests stay green and review stays easy:

1. **Provider-interface refactor** (`internal/cloud`); route Azure through it; keep green.
2. **`internal/ini`** + tests.
3. **AWS provider** + fixtures + tests.
4. **GCP provider** + fixtures + tests.
5. **Active-cloud selection** (config `cloud`, `auto`/`none`, `--cloud`/`OMNICTX_CLOUD`).
6. **Render/segments** use the `cloud` slot; extend golden tests.
7. **Docs:** `--help`, `AGENTS.md`, `README.md`, `Makefile`, config example.
8. Self-review against §8.3 → hand to the checker (§11).

---

## 11. Maker ≠ Checker (separate review pass)
An independent checker verifies **by running, not reading**:
- [ ] All §8.3 criteria actually hold; `go test ./... -race` green; CI green.
- [ ] "Never breaks the prompt": top-level `recover`; missing/broken AWS/GCP/INI → empty, exit 0.
- [ ] `auto` selects exactly one cloud; `none` works; explicit pins work; kube independent.
- [ ] AWS profile/region precedence and GCP active-config/project precedence are correct.
- [ ] No dependency beyond `yaml.v3`; INI reader is stdlib-only.
- [ ] `grep -rniE 'ctxline|CTXLINE'` returns nothing (a "formerly ctxline" note in README is allowed).
- [ ] `AGENTS.md` matches the real structure/commands.

Findings go back to the maker; the loop repeats.

---

## 12. Agentic Engineering practices applied
- **Context engineering.** `AGENTS.md` is the single source of truth (rules,
  commands, structure, invariants); `CLAUDE.md` is a thin `@AGENTS.md` import.
  *Static* context = `AGENTS.md` + this `PRD.md`; *dynamic* context = the specific
  files/fixtures the agent reads per task and `REVIEW.md` findings.
- **Loop engineering.** §10 defines an autonomous `implement → make test → fix`
  loop; the agent iterates against tests/lint, not step-by-step human prompts.
- **Verification.** Table-driven tests, golden files, fixtures, a `bash -c` eval
  smoke test, a `--help` test, and a benchmark — real checks, not "seems to work."
- **Maker ≠ checker.** §11 is an independent review pass (separate session /
  reviewer) that runs the suite and the grep, and returns findings.
- **SDD.** This PRD is written before the multi-cloud code; the spec drives the
  tests, the tests drive the implementation.
- **Tooling.** Claude Code (terminal) as maker; a separate review pass as checker;
  CI (GitHub Actions) + golangci-lint as automated verification; CodeRabbit on PRs.

---

## Appendix A — config example (target, with multi-cloud)
```yaml
# ~/.config/omnictx/config.yaml
enabled: true
cloud: auto                    # azure | aws | gcp | auto | none
segments: [cloud, kube, namespace]
icons: true
separator: " "
colors:
  cloud: blue                  # optional per-provider overrides: azure/aws/gcp
  kube: cyan
  namespace: dim
```

## Appendix B — `CLAUDE.md` (unchanged, thin reference)
```markdown
# CLAUDE.md
Project context and rules live in @AGENTS.md (the single source of truth).
This file is intentionally thin: do not duplicate content, read AGENTS.md.
```