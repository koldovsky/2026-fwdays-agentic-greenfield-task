# PRD — `ctxline`: prompt segment for kube-context and Azure subscription

> Status: Draft v1 (for human review, then input for a coding agent)
> Intended executor: Claude Code / Codex CLI / any coding agent
> Implementation language: **Go**

---

## 1. Goal and problem

When working across several AKS clusters and Azure subscriptions it's easy to run a command "in the wrong place." We need a fast indicator in the shell prompt that shows, with no latency, the current **kube-context**, **namespace**, and active **Azure subscription**.

`ctxline` is a small Go binary that prints a formatted string for PS1/PROMPT. It reads config files directly (no network calls, no `kubectl`/`az`), so it fits within the prompt-render budget.

**Key invariant:** the utility **never breaks the prompt**. Any error (missing file, broken YAML/JSON, no Azure login) results in the segment being silently skipped and `exit 0`, never an error in the prompt line.

---

## 2. Scope

### In scope
- Read the current kube-context and namespace from kubeconfig (honoring `$KUBECONFIG`).
- Read the active Azure subscription (`name`) from `azureProfile.json`.
- Single-line formatted output with ANSI colors and correct escaping for bash/zsh.
- Toggle each segment on/off via flags, env vars, and a config file.
- A YAML config file (`~/.config/ctxline/config.yaml`) for persistent defaults.
- An `init` subcommand that emits shell integration code, plus `ctxon`/`ctxoff` toggle functions (kube-ps1 style).
- Unit tests, golden tests, CI, shell integration instructions.
- Agent context files: `AGENTS.md` (single source of truth) + `CLAUDE.md` (thin import reference).

### Out of scope (explicitly not doing)
- Network calls, shelling out to `kubectl`/`az`.
- Watch mode, daemon, caching (direct reads are already < 10 ms).
- Windows and fish (can be future iterations).
- Multiple default Azure subscriptions, multi-tenant logic.

---

## 3. User scenarios

1. **Setup (one line):** the engineer adds `eval "$(ctxline init bash)"` to `~/.bashrc` (or `zsh`). That's the whole installation into the prompt.
2. **Standalone (debugging):** the engineer runs `ctxline` manually and sees the current segment.
3. **bash/zsh:** the prompt automatically shows the segment before each command.
4. **Toggle live:** `ctxoff` hides the segment in the current session, `ctxon` brings it back (no rc edits).
5. **Persistent preferences:** the engineer sets segment order, icons, and colors once in `~/.config/ctxline/config.yaml`.
6. **Disabling a segment:** `ctxline --no-namespace`, or `segments: [azure, kube]` in the config, or `CTXLINE_SEGMENTS=azure,kube`.

---

## 4. Functional requirements

### 4.1. Segments and output format

Segments in fixed order (each optional):

1. `azure` — `name` of the active subscription.
2. `kube` — name of the current context.
3. `namespace` — namespace of the current context (if set).

Default format (with icons):

```
☁ <subscription> ⎈ <context>:<namespace>
```

ASCII mode (`--no-icons`):

```
az:<subscription> k8s:<context>/<namespace>
```

Rules:
- If `namespace` is empty or equals `default` — show it only if the segment is enabled and the value is non-empty (finalize the policy for `default` during implementation; by default — show as-is when the segment is enabled and the value is non-empty).
- If a segment is enabled but its data is unavailable — the segment is **skipped entirely** (no empty `:`/placeholders).
- If all segments are empty — print an empty string and `exit 0`.
- The separator between segment groups is configurable (`--separator`, default a single space).

### 4.2. Colors and escaping (important prompt detail)

ANSI color codes in PS1 must be wrapped in non-printing markers, otherwise the shell miscalculates line width and breaks line editing.

The `--shell` flag controls the wrapping of each ANSI code:
- `--shell bash` → `\[<ansi>\]`
- `--shell zsh` → `%{<ansi>%}`
- `--shell none` (default) → raw ANSI codes (for standalone runs and pipes).

Color scheme (proposal, revisit during review): kube — cyan, namespace — dim gray, azure — blue. Color reset (`\033[0m`) after each segment.

### 4.3. Flags and configuration

| Flag | Env | Default | Purpose |
|---|---|---|---|
| `--segments az,k,ns` | `CTXLINE_SEGMENTS` | `azure,kube,namespace` | Which segments and in what order |
| `--no-kube` | — | false | Disable kube-context |
| `--no-namespace` | — | false | Disable namespace |
| `--no-azure` | — | false | Disable Azure |
| `--shell bash\|zsh\|none` | `CTXLINE_SHELL` | `none` | Color escaping mode |
| `--icons` / `--no-icons` | `CTXLINE_ICONS` | icons on | Icons vs ASCII |
| `--separator <str>` | `CTXLINE_SEPARATOR` | `" "` | Separator |
| `--enabled` / `--disabled` | `CTXLINE_ENABLED` | enabled | Master on/off (toggled by `ctxon`/`ctxoff`) |
| `--config <path>` | `CTXLINE_CONFIG` | `~/.config/ctxline/config.yaml` | Path to config file |
| `--version` | — | — | Print version and exit |

Precedence: **flag > env > config file > built-in default**. `--no-*` takes precedence over `--segments`. If `CTXLINE_ENABLED=false` (or `enabled: false` in config), the tool prints an empty string and exits 0.

### 4.3.1. Config file

Optional YAML at `~/.config/ctxline/config.yaml` (parsed with the already-present `yaml.v3`, no new dependency). All keys are optional; missing/broken config falls back to built-in defaults (and never breaks the prompt).

```yaml
# ~/.config/ctxline/config.yaml
enabled: true
segments: [azure, kube, namespace]   # order matters
icons: true
separator: " "
colors:                              # ANSI color names or codes
  azure: blue
  kube: cyan
  namespace: dim
```

Notes:
- `shell` is intentionally NOT a config key — it is supplied by `ctxline init` per shell, not persisted.
- A broken/unreadable config is ignored silently (diagnostics only under `--debug`).

### 4.4. Data source — Kubernetes

- Determine the file list: if `$KUBECONFIG` is non-empty — split it by `:` (colon); otherwise `~/.kube/config`.
- **current-context:** merge rule — take the first file in the list whose `current-context` field is non-empty.
- **namespace:** find the `contexts[]` entry with `name == current-context` (search across all files in the list), take `.context.namespace`.
- Parsing — `gopkg.in/yaml.v3`, read only the needed fields (not the whole kubeconfig).
- Edge cases (all → graceful, segment skipped):
  - file missing / no read permission;
  - `current-context` absent or empty;
  - context not found among `contexts[]`;
  - broken YAML.

### 4.5. Data source — Azure

- Path: `$AZURE_CONFIG_DIR/azureProfile.json`, otherwise `~/.azure/azureProfile.json`.
- **Strip the UTF-8 BOM** at the start of the file before JSON parsing (a well-known `azureProfile.json` gotcha).
- Find the `subscriptions[]` element with `isDefault == true`, take its `.name`.
- Parsing — stdlib `encoding/json`.
- Edge cases (graceful, segment skipped):
  - file missing (az not logged in);
  - no subscription with `isDefault: true`;
  - broken JSON / empty array.

### 4.6. Error behavior

- The utility **always** exits with `exit 0` in normal prompt mode.
- Error diagnostics — only under `--debug` (to stderr); in normal mode stderr is silent.
- No panics in production: top-level panic recovery → empty output.

### 4.7. `init` subcommand and live toggles (the "how to run it" part)

`ctxline init <bash|zsh>` prints shell code intended to be `eval`'d from the rc file. This is the single supported install path (mirrors `starship`/`zoxide`/`direnv`):

```bash
# ~/.bashrc
eval "$(ctxline init bash)"
```

The emitted code MUST:
- **Prepend** the ctxline segment to the user's existing prompt without clobbering it — capture the original `PS1`/`PROMPT` once on first eval, then on each render set the prompt to `"<ctxline output> " + <original prompt>`. This is the kube-ps1 model.
- Register the render via `PROMPT_COMMAND` (bash) or a `precmd` hook (zsh), passing the correct `--shell` value automatically.
- Define toggle functions:
  - `ctxon`   → `export CTXLINE_ENABLED=true`
  - `ctxoff`  → `export CTXLINE_ENABLED=false`
  - `ctxtoggle` → flips the current value.
- Be **idempotent**: eval'ing twice in one shell must not double-register the hook or double-capture the prompt.

Behavior of the binary itself: when `CTXLINE_ENABLED=false`, it prints an empty string and exits 0 — so `ctxoff`/`ctxon` take effect on the very next prompt with no re-sourcing.

> Naming: toggle functions are `ctxon`/`ctxoff` (short, ergonomic — the binary is `ctxline`). If preferred, `init` can emit `ctxlineon`/`ctxlineoff` instead; pick one and keep it consistent in README.

---

## 5. Non-functional requirements

- **Performance:** cold start + render < 10 ms on typical configs. Add a `BenchmarkRender` benchmark.
- **Dependencies:** only `gopkg.in/yaml.v3` (+ stdlib). No `client-go`, no network libraries.
- **Binary:** a single static file, cross-compiled for `linux/amd64` and `linux/arm64`.
- **Go version:** current stable (pinned in `go.mod`).

---

## 6. Architecture and repository structure

```
ctxline/
├── cmd/ctxline/main.go        # flag/env parsing, string assembly, top-level recover
├── internal/kube/             # read current-context + namespace
│   ├── kube.go
│   └── kube_test.go
├── internal/azure/            # read active subscription
│   ├── azure.go
│   └── azure_test.go
├── internal/render/           # formatting, colors, bash/zsh escaping
│   ├── render.go
│   └── render_test.go
├── internal/config/           # config model: flags + env + YAML file → struct
│   ├── config.go
│   ├── config_test.go
│   └── testdata/              # sample config.yaml + broken config fixtures
├── internal/shellinit/        # `init bash|zsh` code generation + toggles
│   ├── shellinit.go
│   ├── shellinit_test.go
│   └── templates/            # bash.tmpl, zsh.tmpl (embedded via go:embed)
├── testdata/                  # kubeconfig/azureProfile fixtures + golden files
├── .github/workflows/ci.yml
├── AGENTS.md                  # see Appendix A — single source of truth
├── CLAUDE.md                  # see Appendix B — thin reference to AGENTS.md
├── README.md                  # install + shell integration
├── Makefile                   # build/test/lint/install — see Appendix D
├── PRD.md                     # this document
└── go.mod
```

Principle: business logic in `internal/*` (tested in isolation against fixtures), `cmd/ctxline/main.go` is a thin glue layer.

---

## 7. Verification plan (instead of "seems to work")

### 7.1. Fixtures (`testdata/`)
- `kubeconfig_single.yaml` — one file, context with namespace.
- `kubeconfig_no_namespace.yaml` — context without namespace.
- `kubeconfig_no_current.yaml` — no `current-context`.
- `kubeconfig_a.yaml` + `kubeconfig_b.yaml` — to test `$KUBECONFIG` merge (current-context from the first file).
- `kubeconfig_broken.yaml` — broken YAML.
- `azureProfile_default.json` — has `isDefault: true`.
- `azureProfile_bom.json` — same content but with a UTF-8 BOM.
- `azureProfile_no_default.json` — no default subscription.
- `azureProfile_broken.json` — broken JSON.

### 7.2. Unit tests (table-driven)
- `internal/kube`: correct context/namespace; `$KUBECONFIG` merge; all graceful edge cases return empty values without propagating an error.
- `internal/azure`: reading `name`; **mandatory BOM case**; no-default → empty; broken JSON → empty.
- `internal/config`: precedence **flag > env > config file > default**; `--no-*` overrides `--segments`; missing config → defaults; broken config → defaults (no error); `enabled: false` → disabled.
- `internal/shellinit`: `init bash` and `init zsh` produce the expected templates; output is idempotent-safe (contains the double-register guard); toggle functions `ctxon`/`ctxoff`/`ctxtoggle` are present and set `CTXLINE_ENABLED` correctly. (Optional: smoke-test by `eval`-ing the bash output in a non-interactive `bash -c` and asserting the functions exist.)

### 7.3. Golden tests (`internal/render`)
- A set of inputs × flags (`--shell bash|zsh|none`, `--icons`/`--no-icons`, various segment combinations) → compared against `.golden` files.
- A `-update` flag to regenerate goldens.
- Explicit check that `--shell bash` wraps colors in `\[ \]` and `--shell zsh` in `%{ %}`.

### 7.4. Benchmark
- `BenchmarkRender` on typical fixtures; goal — confirm the target latency budget.

### 7.5. Acceptance criteria (Definition of Done)
- [ ] `go build ./...` produces a single binary.
- [ ] `go test ./... -race` is green and covers all edge cases from 7.1.
- [ ] Golden tests cover bash/zsh/none × icons/no-icons.
- [ ] When any data source is missing, the prompt does not break (`exit 0`, empty/partial output).
- [ ] BOM in `azureProfile.json` is handled correctly (test present).
- [ ] `--shell bash`/`--shell zsh` produce correct non-printing escaping (test present).
- [ ] Config file is read with precedence flag > env > config > default; missing/broken config never breaks the prompt (tests present).
- [ ] `ctxline init bash` and `ctxline init zsh` emit working, idempotent integration code with `ctxon`/`ctxoff`/`ctxtoggle` (tests present).
- [ ] `CTXLINE_ENABLED=false` makes the binary print empty and exit 0 (test present).
- [ ] CI is green: `go vet`, `golangci-lint`, `go test -race`, build amd64+arm64.
- [ ] `README.md` documents the `eval "$(ctxline init bash)"` install path and the `ctxon`/`ctxoff` toggles.
- [ ] The repo contains `AGENTS.md` and `CLAUDE.md`, and `CLAUDE.md` references `AGENTS.md`.

---

## 8. CI (`.github/workflows/ci.yml`)
- Triggers: push / pull_request.
- Steps: `go vet ./...` → `golangci-lint run` → `go test ./... -race -count=1` → build matrix `GOOS=linux GOARCH=amd64,arm64`.

---

## 9. Shell integration (for README)

### Recommended: one-line install via `init`
```bash
# bash — ~/.bashrc
eval "$(ctxline init bash)"

# zsh — ~/.zshrc
eval "$(ctxline init zsh)"
```

This wires the prompt hook and defines the toggles. Daily use:
```bash
ctxoff      # hide the segment in this shell
ctxon       # show it again
ctxtoggle   # flip
```

### Manual (advanced, if you don't want the managed hook)
```bash
# bash
__ctxline_prompt() { PS1="$(ctxline --shell bash) ${__ORIG_PS1}"; }
__ORIG_PS1="$PS1"; PROMPT_COMMAND=__ctxline_prompt
```
```zsh
# zsh
setopt PROMPT_SUBST
__ctxline_precmd() { CTXLINE="$(ctxline --shell zsh)"; }
precmd_functions+=(__ctxline_precmd)
PROMPT='${CTXLINE} '"$PROMPT"
```

Install the binary: `make install` copies it to `~/.local/bin/` (must be on `PATH`).
Persistent preferences go in `~/.config/ctxline/config.yaml` (see 4.3.1).

---

## 10. Implementation loop for the agent (loop engineering)

The agent works in a loop, without step-by-step manual prompting:

1. Read `AGENTS.md` and `PRD.md`.
2. Generate `testdata/` fixtures and write tests **before or alongside** the implementation (SDD spirit).
3. Implement `internal/*`, then `cmd/ctxline/main.go`.
4. Loop: `make test` → read failures → fix → repeat until green.
5. `make lint` → fix findings.
6. Self-review against the Acceptance criteria (section 7.5).
7. Hand off to the checker pass (section 11).

The agent does not ask the human at every step — it iterates against tests and the linter until the DoD is met.

---

## 11. Maker ≠ Checker (separate review pass)

After the maker agent closes the DoD, a **separate** checker (a second agent session or a review subagent) independently verifies:

- [ ] All Acceptance criteria from 7.5 are actually met (not on paper — run `go test ./... -race`).
- [ ] The "prompt never breaks" invariant is truly upheld: there's a top-level `recover`, no paths with `os.Exit(1)` in normal mode.
- [ ] All edge cases from 7.1 are covered, including BOM and `$KUBECONFIG` merge.
- [ ] No extra dependencies beyond `yaml.v3`.
- [ ] `AGENTS.md` matches the real repo structure and commands (not stale).
- [ ] The README integration snippets actually work (colors don't break line width).
- [ ] `init` output is idempotent and does NOT clobber the user's existing prompt; `ctxon`/`ctxoff` actually toggle visibility on the next render.
- [ ] Config precedence is correct and a broken config never breaks the prompt.

The checker does not fix the code itself — it returns a list of findings to the maker, and the loop repeats.

---

## 12. Context engineering: AGENTS.md + CLAUDE.md

Repository requirement: **AGENTS.md is the single source of truth** for project context. `CLAUDE.md` is a thin file that imports/references `AGENTS.md` to avoid duplicating content across agents (Claude Code, Codex, Copilot). Ready-to-use content is in Appendices A and B.

---

## Appendix A — `AGENTS.md` (single source of truth)

```markdown
# AGENTS.md — ctxline

## What this is
`ctxline` is a Go CLI that prints a prompt segment with the current kube-context,
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
- Build:    make build   (go build -o bin/ctxline ./cmd/ctxline)
- Test:     make test    (go test ./... -race -count=1)
- Lint:     make lint    (golangci-lint run)
- Install:  make install (copy binary to ~/.local/bin)
- Update golden: go test ./internal/render -update

## Structure
- cmd/ctxline/main.go — flags/env, glue, top-level recover; dispatches `init` subcommand.
- internal/kube — current-context + namespace from kubeconfig ($KUBECONFIG-aware).
- internal/azure — active subscription from azureProfile.json (handle UTF-8 BOM).
- internal/render — format, ANSI colors, bash (\[ \]) / zsh (%{ %}) escaping.
- internal/config — merge flags + env + YAML config file → struct
  (precedence: flag > env > config > default). Config: ~/.config/ctxline/config.yaml.
- internal/shellinit — `init bash|zsh` code generation (go:embed templates) +
  ctxon/ctxoff/ctxtoggle functions. Output must be idempotent.
- testdata — fixtures and golden files.

## Conventions
- Business logic lives in internal/*, tested against fixtures in testdata/.
- Errors reading/parsing sources OR config are NOT propagated as fatal — the segment
  is simply skipped / defaults are used. Diagnostics only under --debug to stderr.
- Each data source, config merge, render, and shellinit output is covered by
  table-driven tests.
- When CTXLINE_ENABLED=false, print empty and exit 0 (drives ctxon/ctxoff).
- Mandatory test cases: UTF-8 BOM in azureProfile.json; $KUBECONFIG merge
  (current-context from the first file); color escaping for bash and zsh;
  config precedence; idempotent init output.

## Definition of Done
See section 7.5 of PRD.md. In short: build+test(-race) green, edge cases covered,
prompt never breaks, config + init/toggles work, CI green, README with the
`eval "$(ctxline init bash)"` install path.
```

## Appendix B — `CLAUDE.md` (thin reference)

```markdown
# CLAUDE.md

Project context and rules live in @AGENTS.md (the single source of truth).
This file is intentionally thin: do not duplicate content, read AGENTS.md.
```

> Note: Claude Code supports imports via the `@path` syntax, so `@AGENTS.md` is
> pulled in automatically. For agents without `@`-import support, the line still
> reads as a plain instruction "see AGENTS.md."

## Appendix C — fixture example

`testdata/azureProfile_default.json`:
```json
{
  "subscriptions": [
    { "id": "0000-aaaa", "name": "dev-subscription", "isDefault": false },
    { "id": "1111-bbbb", "name": "prod-subscription", "isDefault": true }
  ]
}
```
(`azureProfile_bom.json` — same content, but preceded by a UTF-8 BOM `EF BB BF`.)

## Appendix D — `Makefile` (skeleton)

```makefile
BIN := bin/ctxline

build:
	go build -o $(BIN) ./cmd/ctxline

test:
	go test ./... -race -count=1

lint:
	golangci-lint run

install: build
	install -Dm755 $(BIN) $(HOME)/.local/bin/ctxline

.PHONY: build test lint install
```
