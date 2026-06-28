# PRD — Rename `ctxline` → `omnictx` (+ `--help` rewrite, CI node24)

> Status: Draft (spec-first input for Claude Code)
> Branch: `omnictx`
> Scope: **rename only**, plus two adjacent cleanups (`--help`, CI actions).
> Explicitly NOT in this PRD: AWS/GCP multi-cloud — that is the next PRD.
> This document supersedes the v1 `ctxline` PRD on this branch once merged.

---

## 0. Why this PRD

The branch was renamed to `omnictx`, but the code is still `ctxline` everywhere
(binary, module, env vars, config dir, shell hooks). This PRD makes the code
match the new name, and while the CI/CLI surface is being touched, fixes two
small things that are already visible:

1. `--help` prints a raw, confusing flag dump (e.g. bare `-enabled` / `-disabled`
   with no values, no env mapping).
2. CI emits a Node-20 deprecation warning from an outdated `golangci-lint-action`.

No behavior of the rendered prompt segment changes. This is a refactor + polish
pass; all existing tests must stay green (after mechanical renames).

---

## 1. Rename map (authoritative)

Apply consistently across code, tests, docs, fixtures, and templates.

| Area | Before | After |
|---|---|---|
| Binary | `ctxline` | `omnictx` |
| Module path (go.mod) | `ctxline` | `omnictx` (bare — see note) |
| Import paths | `ctxline/internal/...` | `omnictx/internal/...` |
| Main package dir | `cmd/ctxline/` | `cmd/omnictx/` |
| Env prefix | `CTXLINE_*` | `OMNICTX_*` |
| Config dir/file | `~/.config/ctxline/config.yaml` | `~/.config/omnictx/config.yaml` |
| Config env | `CTXLINE_CONFIG` | `OMNICTX_CONFIG` |
| Enabled env | `CTXLINE_ENABLED` | `OMNICTX_ENABLED` |
| Install target | `~/.local/bin/ctxline` | `~/.local/bin/omnictx` |
| Shell guard vars | `__CTXLINE_*` | `__OMNICTX_*` |
| Shell hook funcs | `__ctxline_prompt` / `__ctxline_precmd` | `__omnictx_prompt` / `__omnictx_precmd` |
| Toggle functions | `ctxon` / `ctxoff` / `ctxtoggle` | **`omnion` / `omnioff` / `omnitoggle`** |
| `init` subcommand invocation inside templates | `ctxline --shell ...` | `omnictx --shell ...` |
| All user-facing strings, comments, README, AGENTS.md, Makefile | `ctxline` | `omnictx` |

> **Module path note:** keep it **bare** (`module omnictx`) for now. It builds and
> tests locally; `go install` from a remote path is intentionally out of scope.
> A future task will move the project to its own repo and switch the path to
> `github.com/<user>/omnictx`. Do not introduce the domain path in this PRD.

### 1.1. Env var precedence is unchanged
Only names change (`CTXLINE_` → `OMNICTX_`). Precedence stays **flag > env >
config > default**. There is **no backward-compatible fallback** to the old
`CTXLINE_*` names — this is a clean rename (the tool has no external users yet).

---

## 2. `--help` / usage rewrite

### 2.1. Problem
Today the flag set prints Go's default dump. Paired booleans like `-enabled` /
`-disabled` appear with no allowed values, no env mapping, and ambiguous meaning.

### 2.2. Requirements
- Replace the default usage with a **custom `fs.Usage`** (not `flag.PrintDefaults()`).
- Structure the output into clear sections:
  1. **One-line description** of what `omnictx` does.
  2. **Usage line** + a quick example: `eval "$(omnictx init bash)"`.
  3. **Subcommands:** `init <bash|zsh>`, `--version`.
  4. **Flags:** each with allowed values and the matching env var inline, e.g.
     ```
     --shell <bash|zsh|none>     color escaping for the prompt (env: OMNICTX_SHELL)
     --segments <list>           ordered segments, comma-separated (env: OMNICTX_SEGMENTS)
     --separator <str>           separator between segments (env: OMNICTX_SEPARATOR)
     --icons / --no-icons        icons vs ASCII labels (env: OMNICTX_ICONS)
     --config <path>             config file path (env: OMNICTX_CONFIG)
     --debug                     print diagnostics to stderr
     --version                   print version and exit
     ```
- **Resolve the enabled/disabled confusion.** Pick ONE model and document it:
  - **Preferred:** a single `--enabled=<true|false>` flag (Go `flag` supports
    `-enabled=false`). Drop the separate `--disabled` flag.
  - The master on/off is normally driven by the env var `OMNICTX_ENABLED`
    (set by `omnion`/`omnioff`), so the flag is rarely used directly — say so in
    the help text for `--enabled`.
  - If keeping two flags is strongly preferred, then `--disabled` must win over
    `--enabled` and the help must state that explicitly. (Default to the single
    `--enabled=<bool>` form unless there is a concrete reason not to.)
- **Dash consistency:** Go's `flag` prints single-dash (`-flag`) but README uses
  `--flag`. The custom usage MUST print `--flag` (double dash) so help and docs
  match. (Parsing still accepts both; this is display-only.)
- Same treatment for `--icons` / `--no-icons`: present as one line with clear
  semantics rather than two unrelated booleans.

### 2.3. Behavior
- `omnictx --help` / `-h` prints the custom usage and exits 0.
- A genuinely bad flag in **render mode** must still NOT break the prompt
  (parse error → print nothing, exit 0) — the help rewrite must not regress the
  "never break the prompt" invariant.

---

## 3. CI actions update (node24, no deprecation warnings)

Current CI triggers a Node-20 deprecation warning from `golangci-lint-action`.
Update `.github/workflows/ci.yml`:

- `golangci/golangci-lint-action@v6` → **`@v9`** (runs on node24), and set an
  explicit pinned linter version in `with:`:
  ```yaml
  - uses: golangci/golangci-lint-action@v9
    with:
      version: v2.12   # pin, not "latest"; matches .golangci.yml version: "2"
  ```
- Refresh the other actions to current node24 majors:
  - `actions/checkout@v4` → **`@v6`**
  - `actions/setup-go@v5` → **`@v6`**
  - `actions/upload-artifact@v4` → current major (verify latest at implementation time)
- Keep the existing job shape: `go vet` → `golangci-lint` → `go test -race` →
  build matrix `linux/amd64,arm64`.
- `.golangci.yml` already declares `version: "2"`, which is compatible with
  `golangci-lint-action@v9`; do not downgrade it.

Acceptance: CI is green **with no Node-20 deprecation warnings** in the logs.

---

## 4. Out of scope (this PRD)
- AWS / GCP providers and the single-active-cloud config (next PRD).
- Any change to rendered output, segment logic, data sources, or precedence.
- Windows / fish support.
- Backward-compatible `CTXLINE_*` env aliases.
- Switching module path to a domain path.

---

## 5. Implementation order (for the agent loop)

Do it in this order so tests stay green and review stays easy:

1. **Mechanical rename** per §1: rename `cmd/ctxline` → `cmd/omnictx`, update
   `module` in go.mod, fix all imports, rename env constants, config dir, install
   target, shell guard vars/hook funcs, and the in-template binary invocation.
2. **Toggle rename:** `ctxon/ctxoff/ctxtoggle` → `omnion/omnioff/omnitoggle` in
   templates and any tests asserting on them.
3. `make test` → fix anything the rename broke → green. (Most changes are
   string/path; golden files and fixtures that embed the old name must be updated
   too — search testdata and `.golden` files for `ctxline`/`CTXLINE`.)
4. **`--help` rewrite** per §2 + a test in `cmd/omnictx` asserting the usage
   contains the sections and that `--help` exits 0.
5. **CI update** per §3.
6. `make lint` → fix → green.
7. Self-review against §6, then hand to the checker (§7).

A fast guard against missed spots:
```bash
grep -rniE 'ctxline|CTXLINE|ctxon|ctxoff|ctxtoggle' \
  --include='*.go' --include='*.tmpl' --include='*.md' \
  --include='*.yml' --include='*.yaml' --include='Makefile' .
```
After the rename this should return **nothing** (except, if you choose, an
intentional note in README/CHANGELOG about the former name).

---

## 6. Acceptance criteria (Definition of Done)
- [ ] `grep -rniE 'ctxline|CTXLINE'` over the repo returns no code/doc hits
      (an explicit "formerly ctxline" mention in README is allowed).
- [ ] Binary builds as `omnictx`; `cmd/omnictx/main.go` exists; module is `omnictx`.
- [ ] `go build ./...`, `go vet ./...`, `go test ./... -race -count=1` all green.
- [ ] Env vars are `OMNICTX_*`; config resolves `~/.config/omnictx/config.yaml`.
- [ ] `omnictx init bash|zsh` defines `omnion`/`omnioff`/`omnitoggle`; the snippet
      stays idempotent and does not clobber the prompt; toggles flip
      `OMNICTX_ENABLED` and take effect on the next render (test present, incl. a
      real `bash -c` eval smoke test).
- [ ] `omnictx --help` prints the grouped custom usage (description, usage,
      subcommands, flags with values + env), uses `--flag` double-dash display,
      resolves the enabled/disabled ambiguity, and exits 0 (test present).
- [ ] A bad flag in render mode still prints nothing and exits 0 (invariant intact).
- [ ] CI green with no Node-20 deprecation warnings; actions pinned per §3.
- [ ] README, AGENTS.md, CLAUDE.md, Makefile updated to `omnictx`; `CLAUDE.md`
      still references `@AGENTS.md`.

---

## 7. Checker pass (maker ≠ checker)
Independent reviewer verifies (by running, not reading):
- [ ] All §6 criteria actually hold; `go test ./... -race` is green.
- [ ] No stray `ctxline`/`CTXLINE`/`ctxon`/`ctxoff` anywhere (run the grep from §5).
- [ ] `--help` is actually readable and unambiguous about enabled/disabled and icons.
- [ ] CI logs show no Node-20 deprecation warning; lint version is pinned.
- [ ] "Never breaks the prompt" invariant intact after the help/usage changes.
- [ ] AGENTS.md matches the renamed structure and commands (not stale).

Findings go back to the maker; the loop repeats until clean.

---

## 8. Required doc updates (carry the rename into context files)

`AGENTS.md` and `Makefile` must be updated as part of the rename. Key deltas:

- `Makefile`: `BIN := bin/omnictx`, build `./cmd/omnictx`, install
  `~/.local/bin/omnictx`.
- `AGENTS.md`: replace every `ctxline`/`CTXLINE` with `omnictx`/`OMNICTX`;
  structure now lists `cmd/omnictx`; toggles are `omnion`/`omnioff`/`omnitoggle`;
  note the `--help` is a custom grouped usage; CI uses node24-pinned actions.
- `CLAUDE.md`: unchanged except it stays a thin `@AGENTS.md` import.
- `README.md`: install path `eval "$(omnictx init bash)"`, toggles renamed,
  config path `~/.config/omnictx/config.yaml`.
