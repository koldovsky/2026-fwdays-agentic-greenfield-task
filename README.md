# omnictx

A tiny, fast Go binary that prints a shell-prompt segment showing your active
**cloud** (Azure, AWS, or GCP — exactly one), **kube-context**, and
**namespace** — and lets you **switch** them (kube-context, gcloud
configuration, Azure subscription) without leaving the prompt.

```
☁ prod-subscription ⎈ prod-cluster:payments
```

It works on local config files **directly** — no `kubectl`/`az`/`aws`/`gcloud`,
no network calls, even when switching — so rendering fits comfortably inside
the prompt budget (cold start + render < 10 ms).

**Core invariant:** rendering never breaks your prompt and never writes
anything. Any error (missing file, broken YAML/JSON/INI, not logged in)
silently skips the affected segment and exits 0. Writes happen only in
explicit commands (`kube <ctx>`, `cloud <p> use`, toggles), which do the
opposite: validate strictly and fail loudly.

**One active cloud.** The cloud slot shows a single provider, chosen by `cloud:`
(`azure`/`aws`/`gcp`/`auto`/`none`). `auto` (default) picks the one whose local
config is present, by priority **azure → aws → gcp**. Kubernetes is independent.

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
clobbering it, and registers the render hook (`PROMPT_COMMAND` for bash, a
`precmd` hook for zsh). The snippet is idempotent — it is safe to `eval` more
than once in the same shell — and defines no functions beyond the prompt hook.

### Daily use — toggles (no rc edits)

```bash
omnictx off        # persist enabled: false — all future shells start quiet
omnictx on         # persist enabled: true  — restore the segment
omnictx toggle     # flip the persisted state
omnictx cloud off  # hide just the cloud slot (alias for cloud none)
omnictx cloud on   # show it again (alias for cloud auto — re-pin if you had one)
omnictx kube off   # hide just the kube segment (namespace goes with it)
omnictx kube on    # show it again
```

The commands persist to the config file, so the change survives new shells. For
the **current session only**, use env vars — they override the config until
unset, and all boolean ones accept `on`/`off` as well as `true`/`false`:

| Segment | Persistent (command) | Session-only (env) |
|---|---|---|
| everything | `omnictx on/off/toggle` | `export OMNICTX_ENABLED=off` |
| cloud slot | `omnictx cloud on/off` | `export OMNICTX_CLOUD=none` / `unset` |
| kube (+namespace) | `omnictx kube on/off` | `export OMNICTX_KUBE=off` |

### Switching the displayed cloud

```bash
omnictx cloud aws    # persist: all future prompts show AWS
omnictx cloud auto   # persist: back to auto-detect
omnictx cloud        # print the effective selection (env > config > default)
```

The value is written to the `cloud:` key of the config file (comments and other
keys are preserved). For a session-only override use `export OMNICTX_CLOUD=<v>`,
which takes precedence over the persisted value until unset. An invalid value is
rejected with a usage error (exit 2) — nothing is written.

To see what there is to pin, list a provider's local accounts — offline, from
the same files omnictx already reads (AWS profiles from `~/.aws/config` +
`~/.aws/credentials` names, gcloud configurations, Azure subscriptions):

```
$ omnictx cloud aws list      # or: gcp list / azure list / bare "cloud list"
CURRENT   NAME      REGION
*         default   us-east-1
          prod      eu-west-1
```

### Switching cloud accounts

Azure and GCP keep their active account in local files, so omnictx can switch
them the same careful way it switches kube-contexts (validate first, atomic
write, never touch an unparsable file):

```bash
omnictx cloud gcp use work           # writes <gcloud>/active_config
omnictx cloud azure use "My Sub"     # flips isDefault in azureProfile.json
omnictx cloud azure use 11111111-2222-3333-4444-555555555555 # by id — for name collisions
```

A successful `use` also pins that provider as the displayed cloud (persists
`cloud: <provider>`), so the prompt immediately shows what you just switched to.

Short aliases live in the omnictx config file and are checked first:

```yaml
aliases:
  azure: { prod: "Azure subscription 1" }   # values may be names or ids
  gcp:   { w: work }
```

AWS is the honest exception: the ecosystem has no persistent "current profile"
(it is the session-scoped `AWS_PROFILE`), so `omnictx cloud aws use prod` just
prints the correct command — `export AWS_PROFILE=prod` — and exits non-zero.

### Switching the kube-context

```bash
omnictx kube prod-cluster # switch (rewrites current-context in kubeconfig)
omnictx kube              # print the current context
omnictx kube list         # all contexts across $KUBECONFIG files:
```
```
CURRENT   NAME     CLUSTER   AUTHINFO      NAMESPACE
          kind-1   kind-1    kind-1-user   payments
*         kind-2   kind-2    kind-2-user   staging
```

This is the one place omnictx writes to a file it does not own, and it is
deliberately careful: the target context must exist (otherwise a usage error and
exit 2, nothing written), only the `current-context:` line changes — comments
and formatting are preserved byte-for-byte — and the write is atomic (temp file
+ rename, permissions kept). An unreadable or unparsable kubeconfig is never
touched. With a multi-file `$KUBECONFIG`, the file that already sets
`current-context` is updated (else the first file), matching kubectl. `list` is
a reserved word. Namespace switching is out of scope — use kubectl/kubens.

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
omnictx                       # print the segment (standalone / debugging)
omnictx --shell bash|zsh|none # color escaping mode (supplied by init)
omnictx --version
omnictx init bash|zsh         # print shell integration code
omnictx on|off|toggle         # persist the enabled state to the config file
omnictx cloud                 # show the effective active-cloud selection
omnictx cloud aws             # persist: pin AWS as the active cloud
omnictx cloud none            # persist: kube-only (no cloud slot)
omnictx cloud aws list        # offline table of AWS profiles (also: gcp, azure)
omnictx cloud list            # same table for the active provider
omnictx cloud gcp use work    # activate a gcloud configuration
omnictx cloud azure use prod  # switch the default Azure subscription (name/id/alias)
omnictx kube                  # show the current kube-context
omnictx kube list             # kubectl-style table of contexts (current marked *)
omnictx kube prod-cluster     # switch the current kube-context
```

`--shell` is the **only** render-mode flag. Everything else is controlled via
`OMNICTX_*` env vars or the config file (see Configuration below).

### Output format

- Icons (default): `☁ <cloud> ⎈ <context>:<namespace>` (one `☁` for any provider).
- ASCII (`icons: false` / `OMNICTX_ICONS=false`): `az:`/`aws:`/`gcp:` `<cloud>`
  `k8s:<context>/<namespace>`.

The cloud value is provider-specific: Azure subscription, AWS `profile[/region]`,
or GCP project. The `namespace` is visually coupled to `kube`
(`context:namespace`). If a segment's data is unavailable, it is skipped entirely
— no empty placeholders.

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

Env vars, the optional YAML config file, and the built-in defaults are merged
with this precedence (the only render-mode flag is `--shell`):

**flag > env var > config file > built-in default**

| Config key / command | Env | Default | Purpose |
|---|---|---|---|
| `segments` | `OMNICTX_SEGMENTS` | `cloud,kube,namespace` | which segments, in what order |
| `cloud` / `omnictx cloud <v>` | `OMNICTX_CLOUD` | `auto` | active cloud: `azure\|aws\|gcp\|auto\|none` |
| `kube` / `omnictx kube on\|off` | `OMNICTX_KUBE` | `true` | show the kube segment (namespace follows) |
| `icons` | `OMNICTX_ICONS` | `true` | icons vs ASCII labels |
| `separator` | `OMNICTX_SEPARATOR` | `" "` | separator between segments |
| `enabled` / `omnictx on\|off\|toggle` | `OMNICTX_ENABLED` | `true` | master on/off |
| `colors` | — | blue/cyan/dim | per-segment colors (config file only) |
| `--shell bash\|zsh\|none` (flag) | `OMNICTX_SHELL` | `none` | color escaping mode |
| — | `OMNICTX_CONFIG` | `~/.config/omnictx/config.yaml` | config file path |

Segment names accept aliases: `azure`/`az`/`aws`/`gcp`→`cloud`, `k`/`k8s`→kube,
`ns`→namespace. The concrete cloud provider is chosen by `cloud:`, not by the
segment name.

### Config file (`~/.config/omnictx/config.yaml`)

All keys are optional; a missing or broken config falls back to defaults and never
breaks the prompt.

```yaml
enabled: true
cloud: auto                          # azure | aws | gcp | auto | none
kube: true                           # show the kube segment (omnictx kube on/off)
segments: [cloud, kube, namespace]   # order matters
icons: true
separator: " "
colors:                              # names or raw SGR codes (e.g. "1;34")
  cloud: blue                        # optional per-provider overrides: azure/aws/gcp
  kube: cyan
  namespace: dim
aliases:                             # short names for `omnictx cloud <p> use <alias>`
  azure:
    prod: "Azure subscription 1"     # value = subscription name or id
  gcp:
    w: work                          # value = gcloud configuration name
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
- **AWS:** profile = `AWS_PROFILE` > `AWS_VAULT` > `default`; region = `AWS_REGION`
  > `AWS_DEFAULT_REGION` > the profile's `region` in `~/.aws/config`
  (`AWS_CONFIG_FILE` overrides the path; non-default profiles are `[profile NAME]`).
  Shows `profile[/region]`. Account-id is out of scope (needs STS/network).
- **GCP:** active config = `CLOUDSDK_ACTIVE_CONFIG_NAME` > `<gcloud>/active_config`
  (`<gcloud>` = `CLOUDSDK_CONFIG` or `~/.config/gcloud`); project =
  `CLOUDSDK_CORE_PROJECT` > `GOOGLE_CLOUD_PROJECT` > `[core] project` in
  `<gcloud>/configurations/config_<name>`. Shows the project.

---

## Troubleshooting

The prompt segment (render mode) never prints errors — a broken source is just
skipped, by design. If a segment silently disappears, run the equivalent
interactive command instead, which **does** warn on stderr:

```bash
omnictx cloud            # warns if the omnictx config itself is broken
omnictx cloud azure list # warns if azureProfile.json exists but won't parse
omnictx kube list        # warns about any $KUBECONFIG file that won't parse
```

Warnings never change the exit code or stdout — they just point at the file to fix.

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
