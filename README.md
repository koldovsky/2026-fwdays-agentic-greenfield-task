# omnictx

A tiny, fast Go binary that prints a shell-prompt segment showing your current
**Azure subscription**, **kube-context**, and **namespace**.

```
☁ prod-subscription ⎈ prod-cluster:payments
```

It reads config files **directly** — no `kubectl`, no `az`, no network calls — so
it fits comfortably inside the prompt-render budget (cold start + render < 10 ms).

**Core invariant:** `omnictx` never breaks your prompt. Any error (missing file,
broken YAML/JSON, not logged into Azure) silently skips the affected segment and
exits 0.

---

## Install

```bash
make install      # builds and copies the binary to ~/.local/bin/omnictx
```

Make sure `~/.local/bin` is on your `PATH`.

## Shell integration (recommended: one line)

```bash
# bash — ~/.bashrc
eval "$(omnictx init bash)"

# zsh — ~/.zshrc
eval "$(omnictx init zsh)"
```

This captures your existing prompt once, **prepends** the omnictx segment without
clobbering it, registers the render hook (`PROMPT_COMMAND` for bash, a `precmd`
hook for zsh), and defines the toggle functions. The snippet is idempotent — it is
safe to `eval` more than once in the same shell.

### Daily use — live toggles (no rc edits)

```bash
omnioff      # hide the segment in this shell
omnion       # show it again
omnitoggle   # flip the current state
```

These just flip `OMNICTX_ENABLED`; the change takes effect on the very next prompt.

### Manual integration (advanced)

```bash
# bash
__omnictx_prompt() { PS1="$(omnictx --shell bash) ${__ORIG_PS1}"; }
__ORIG_PS1="$PS1"; PROMPT_COMMAND=__omnictx_prompt
```

```zsh
# zsh
setopt PROMPT_SUBST
__omnictx_precmd() { OMNICTX="$(omnictx --shell zsh)"; }
precmd_functions+=(__omnictx_precmd)
PROMPT='${OMNICTX} '"$PROMPT"
```

---

## Usage

```bash
omnictx                      # print the segment (standalone / debugging)
omnictx --no-namespace       # hide the namespace
omnictx --no-icons           # ASCII labels:  az:<sub> k8s:<ctx>/<ns>
omnictx --segments azure,kube
omnictx --shell bash|zsh|none
omnictx --version
omnictx init bash|zsh        # print shell integration code
```

### Output format

- Icons (default): `☁ <subscription> ⎈ <context>:<namespace>`
- ASCII (`--no-icons`): `az:<subscription> k8s:<context>/<namespace>`

The `namespace` is visually coupled to `kube` (`context:namespace`). If a segment's
data is unavailable, it is skipped entirely — no empty placeholders.

### Colors and shell escaping

ANSI color codes in a prompt must be wrapped in non-printing markers, or the shell
miscalculates line width and breaks line editing. `--shell` controls this:

| `--shell` | wrapping |
|---|---|
| `bash` | `\[ <ansi> \]` |
| `zsh`  | `%{ <ansi> %}` |
| `none` (default) | raw ANSI (for pipes / standalone) |

`omnictx init` passes the correct `--shell` value automatically.

---

## Configuration

Flags, env vars, and an optional YAML config file are merged with this precedence:

**flag > env var > config file > built-in default**

(`--no-*` flags take precedence over `--segments`.)

| Flag | Env | Default | Purpose |
|---|---|---|---|
| `--segments az,kube,ns` | `OMNICTX_SEGMENTS` | `azure,kube,namespace` | which segments, in what order |
| `--no-azure` / `--no-kube` / `--no-namespace` | — | off | disable a segment |
| `--shell bash\|zsh\|none` | `OMNICTX_SHELL` | `none` | color escaping mode |
| `--icons` / `--no-icons` | `OMNICTX_ICONS` | icons on | icons vs ASCII |
| `--separator <str>` | `OMNICTX_SEPARATOR` | `" "` | separator between groups |
| `--enabled[=<bool>]` | `OMNICTX_ENABLED` | enabled | master on/off (normally via `omnion`/`omnioff`) |
| `--config <path>` | `OMNICTX_CONFIG` | `~/.config/omnictx/config.yaml` | config file path |
| `--debug` | — | off | diagnostics to stderr |
| `--version` | — | — | print version |

Segment names accept aliases: `az`→azure, `k`/`k8s`→kube, `ns`→namespace.

### Config file (`~/.config/omnictx/config.yaml`)

All keys are optional; a missing or broken config falls back to defaults and never
breaks the prompt.

```yaml
enabled: true
segments: [azure, kube, namespace]   # order matters
icons: true
separator: " "
colors:                              # names or raw SGR codes (e.g. "1;34")
  azure: blue
  kube: cyan
  namespace: dim
```

> `shell` is intentionally **not** a config key — it is supplied per-shell by
> `omnictx init`, not persisted.

---

## Data sources

- **Kubernetes:** `$KUBECONFIG` (colon-separated) or `~/.kube/config`. The
  `current-context` is taken from the first file that sets it; the namespace is
  looked up by matching that context across all files.
- **Azure:** `$AZURE_CONFIG_DIR/azureProfile.json` or `~/.azure/azureProfile.json`.
  The leading UTF-8 BOM is stripped before parsing; the subscription with
  `isDefault: true` is used.

---

## Development

```bash
make build     # go build -> bin/omnictx
make test      # go test ./... -race -count=1
make vet       # go vet ./...
make lint      # golangci-lint run
make bench     # BenchmarkRender
make golden    # regenerate render golden files
```

Only one external dependency: `gopkg.in/yaml.v3`. Everything else is stdlib.
See [`AGENTS.md`](./AGENTS.md) for the project conventions and the
[`PRD.md`](./PRD.md) for the full product requirements.

---

## About this repository

This project was built as a homework submission for the **fwdays Academy ·
Agentic Engineering: Greenfield** course — the emphasis is on the *engineering
process* (context engineering via `AGENTS.md`, spec-driven development, test/lint
loops, and a separate maker ≠ checker review pass), not the size of the product.
