<!-- Homework — Agentic Engineering: Greenfield.
     Fill in every section. Any stack. -->

## Author
Dmytro Tarasenko

## Project

`omnictx` — a Go binary that prints a shell-prompt segment with the active
cloud (Azure / AWS / GCP) and the current kube-context, and can also *switch*
those contexts (kube-context, gcloud configuration, Azure subscription). It
works on local config files directly — no network, no shelling out to
`kubectl`/`az`/`aws`/`gcloud`, not even for switching. Core invariant:
**render mode** is read-only and never breaks the prompt (any error → skip
the segment, exit 0); writes happen only on explicit interactive commands,
which — deliberately, the opposite way — validate strictly and fail loudly
with non-zero exit codes.

Built in two phases:

1. **Base (PRD-driven):** multi-cloud rendering — provider interface,
   AWS/GCP providers, a hand-written INI reader, active-cloud selection
   (`azure|aws|gcp|auto|none`), shell integration (`init bash|zsh`).
2. **Extensions (OpenSpec-driven, 7 changes):** persistent `cloud`/`kube`
   display toggles (`on|off` + session `OMNICTX_*` env counterparts); safe
   kube-context switching (`omnictx kube <ctx>`); kubectl-style offline
   account listing for all three clouds (`cloud <provider> list`); account
   switching for Azure/GCP with short aliases (`cloud <provider> use
   <name|alias>`) and auto-pinning of the displayed cloud; interactive-mode
   warnings about broken source files (render stays silent).

## Video demo (1–2 min)

Video: https://www.loom.com/share/2dd3fd61c1554aeca800dba3cfe1fd30

## Agentic Engineering practices applied

### 1. Context engineering (`AGENTS.md`)

- `AGENTS.md` is the single source of truth: commands, package structure,
  invariants ("never break the prompt"), conventions, resolved design
  decisions. It was updated in the same change as the code it describes, so
  it never drifted.
- `CLAUDE.md` is a thin one-line import (`@AGENTS.md`) — no duplication.
- Static context = `AGENTS.md` + `PRD.md`; dynamic context = the specific
  source files and fixtures the agent read per task. Before designing each
  feature the agent read the real implementation first (e.g. checked that
  `ini.File` had no ordered sections before proposing `ini.Sections`).

### 2. Loops

- **Autonomous implement→verify loop:** the base phase ran as
  `implement → make test → fix → repeat → make lint` per PRD §10, without
  step-by-step prompting; the same loop ran inside every OpenSpec change.
- **Enforced by a hook, not by discipline:** `.claude/hooks/quality-gate.sh`
  is wired to the agent's **Stop** event in `.claude/settings.json` — every
  time the agent tries to finish a turn, `go vet` + `golangci-lint` +
  `go test ./... -race -count=1` run; a red result blocks completion and
  feeds the errors back to the agent. Green was not optional.
- **Fluid re-entry:** changes were re-opened when reality demanded it (e.g.
  the "pin the displayed cloud after `use`" feedback landed inside the still
  active change: spec updated → code → tests → tasks re-ticked).

### 3. Maker ≠ Checker

- **Automated checkers independent of the maker:** GitHub Actions CI
  (`go vet → golangci-lint → go test -race → build matrix linux/amd64,arm64`)
  and CodeRabbit review on the PR.
- **Human as checker on live data:** I dogfooded every feature on my real
  machine and caught two bugs the test suite had missed:
  1. `omnictx kube off` corrupted my real config — `setConfigKey` matched the
     key without anchoring to column 0 and overwrote the nested `colors.kube`
     line, producing invalid YAML. Fixed (column-0 anchoring) + regression
     test.
  2. A hand-broken `azureProfile.json` silently emptied the cloud slot and
     `cloud azure list` — correct for render, hostile in interactive mode.
     This became its own change (`interactive-config-warnings`).
- **Agent as diagnostician:** both incidents were root-caused by the agent in
  real time from symptoms ("не працює") to the exact broken line, including
  repairing my real config files with a backup first.

### 4. Specifications → tests → evals (SDD)

- `PRD.md` was written **before** the multi-cloud code (with Opus 4.8, in a
  separate session): functional requirements, verification plan (§8),
  implementation order (§10), definition of done (§8.3).
- All seven follow-up features ran on **OpenSpec**: each change is a
  `proposal.md` (why) → `design.md` (decisions, alternatives, risks) → delta
  `specs/` with WHEN/THEN scenarios → `tasks.md` checklist → implementation →
  spec sync → archive. Scenarios were written before code and became test
  cases almost one-to-one.
- The merged living specs — `openspec/specs/cloud-selection-cli/spec.md`
  (12 requirements) and `openspec/specs/kube-context-cli/spec.md`
  (9 requirements) — are the current source of truth for CLI behavior;
  `openspec/changes/archive/` holds the full history of all seven changes.

### 5. Verification

- Table-driven tests in every package (`internal/{ini,aws,gcp,azure,cloud,
  config,render,shellinit,kube}`, `cmd/omnictx`); golden files for render
  (shell × icons × provider); `bash -c` eval smoke test for `init`
  idempotency; `--help` contract test; render benchmark (<10 ms budget).
- Write paths to foreign files (kubeconfig, `active_config`,
  `azureProfile.json`) are tested for byte-identity of everything not owned:
  comments survive, permissions survive, atomic rename, parse-before-write
  refusal on broken input, and "failed switch touches nothing".
- Manual smokes ran **only** against isolated fixtures (`~/.kube/config-test`,
  `~/.azure-test`, `~/.gcloud-test`, toggled by `use-test-env.sh`) or temp
  copies — never against real state.
- A final sweep for leaked secrets/identifiers (emails, GUIDs, AWS keys, real
  project names) before committing — found and sanitized one real
  subscription-id prefix in the README.

### 6. Tools & MCP

- **Claude Code** (terminal + IDE) — the maker.
- **Skills** — the OpenSpec workflow is implemented as project skills
  (`openspec-propose / apply / sync-specs / archive`) driving the OpenSpec
  CLI; this is what kept all seven changes structurally identical.
- **Hooks** — the Stop-event quality gate described above.
- GitHub Actions CI and CodeRabbit as independent checkers (see §3).

### 7. What I decided vs. what the agent decided

The split: **I own product scope, risk boundaries, and UX; the agent owns
engineering design within those boundaries and all execution.**

*Me — product & scope:* project plan; `PRD.md` before any code; initiating
each of the seven features; deciding what NOT to build (rolled back
`omnicloud`; `--cloud` stayed one-shot); per-provider Nerd Font icons.

*Me — risk boundaries:* started with "switching is kube-only, everything
else read-only"; after a risk discussion consciously extended writes to
GCP's `active_config` and Azure's `azureProfile.json`; kept AWS out on
principle — it has no persistent "current profile", so the tool prints an
`export AWS_PROFILE=` hint instead of faking state.

*Me — UX:* the explicit `use` verb; aliases live in the omnictx config file
(not env); a successful `use` immediately pins the displayed cloud.

*Me — quality control:* dogfooding on live data (both real bugs above);
requesting isolated fixtures; ordering the final secrets sweep.

*Agent — design & execution:* all code, tests, golden files, fixtures and
docs for the base phase and all seven changes; technical design within my
boundaries (single-line surgery + parse-before-write + atomic rename for
foreign files; JSON round-trip for the comment-free `azureProfile.json`;
reserved-word grammar `list|on|off|use`; lightweight `Check()` probes instead
of changing read-path signatures); root-cause diagnosis of both live
incidents; the security sweep itself.

## (Optional) Link to the code
<!-- If the project lives in a separate repository, put the link here -->
Not applicable — the project lives in this repository.

---

### Checklist
- [ ] Real name provided
- [ ] Video demo link added (1–2 min)
- [ ] Agentic Engineering practices described
- [ ] The result works and is finished end-to-end
