# Agentic development harness — a user guide

> **Status: non-authoritative.** This is a *user guide / field manual*, not part of the contract.
> It introduces **no** requirements and is **not** checked by any gate. The authoritative documents
> remain `docs/SPEC.md` (the *what*), `docs/ARCHITECTURE.md` (the *how*), `docs/metadata-contract.md`
> (the metadata *shape*), `docs/ROADMAP.md` (sequencing), `docs/traceability.md` (coverage), and
> `AGENTS.md` / `.cursor/rules/` (always-on agent rules). Where this guide and those disagree, **they
> win**.
>
> **Purpose:** this is a *description of the current state* of the agentic-engineering implementation —
> a map of what exists and how it fits together, for a human to understand the project. It is **not** an
> operating manual the agent follows: the operating contract is `AGENTS.md` + `.cursor/` (and the
> `commands/`), and this file does **not** restate it. The gap backlog and maturity tracking live in
> [maturity-plan.md](maturity-plan.md) (see §5).

This repo (`transon-blockly`) is, at the time of writing, a **docs + AI-harness repository**: there
is no `packages/`, no `package.json`, and no `pnpm-workspace.yaml` yet (M0 hasn't landed). What it
*does* have is two enforcement layers around the contract: **advisory** editor hooks that nudge, and
**binding** git hooks + a CI workflow that block. That makes the harness unusually important — for now
it is most of what governs how code *will* arrive. This guide explains what the harness is, how to
drive it, why it is shaped the way it is, and where it is thin. Its companion,
[maturity-plan.md](maturity-plan.md), scores the harness and tracks what is left to harden.

---

## 1. What the harness is

The harness lives under a tool-neutral `harness/` core (canonical command/skill/agent-role bodies) with
`.cursor/` and `.claude/` as thin adapters, the `harness/scripts/` checkers and `harness/evals/`, and a **binding**
enforcement layer — git hooks plus a CI workflow. It is built around one idea: **the
contract docs are the source of truth, and every layer of automation exists to keep generated code
pinned to that contract.** The diagram reads top-to-bottom — contract feeds the harness, the harness
produces code, and the deterministic gates check code (and the contract) before two enforcement tiers
decide what may land.

```mermaid
flowchart TB
    C["1 · Contract<br/>docs/"]
    H["2 · Harness<br/>.cursor/ + .claude/"]
    K["3 · Code<br/>packages/ @transon/*"]
    G["4 · Gates<br/>harness/scripts/ + harness/evals/"]
    E["5 · Enforcement<br/>git hooks + CI"]
    EN(["transon engine<br/>get_editor_metadata()"])

    C --> H --> K --> G --> E
    C -->|also checked| G
    EN -->|parity| G
    E -.->|on red: re-prompt or reject| H

    classDef con fill:#E6F1FB,stroke:#185FA5,color:#042C53;
    classDef har fill:#EEEDFE,stroke:#534AB7,color:#26215C;
    classDef cod fill:#F1EFE8,stroke:#5F5E5A,color:#2C2C2A;
    classDef gat fill:#E1F5EE,stroke:#0F6E56,color:#04342C;
    classDef enf fill:#FAEEDA,stroke:#854F0B,color:#412402;
    classDef eng fill:#FBEAF0,stroke:#993556,color:#4B1528;
    class C con;
    class H har;
    class K cod;
    class G gat;
    class E enf;
    class EN eng;
```

Each numbered stage expands in the table below.

### What each stage contains

| Stage | Component | Files | Role |
|---|---|---|---|
| **1 · Contract** | Contract docs | `SPEC.md` · `ARCHITECTURE.md` · `metadata-contract.md` · `ROADMAP.md` · `traceability.md` | Authoritative source of truth: the *what* (FR/NFR/AC/UC), *how* (AD-xxx), metadata shape, sequencing (M0–M5), ID→test coverage. |
| **2 · Harness** | Rules — always-on | `rules/project-overview.mdc` · `spec-discipline.mdc` | Invariants injected every turn: JSON-canonical, engine-free, strict round-trip, variants-over-modes, metadata-driven, UI≠semantics + SPEC-first / ID-stability. |
| | Rules — glob | `rules/editor-core.mdc` · `editor-blockly.mdc` · `testing.mdc` · `monorepo-build.mdc` | Activate only when matching files are touched — context stays lean until relevant. |
| | Subagents | `agents/milestone-planner` (opus, ro) · `requirement-implementer` (composer, rw) · `round-trip-reviewer` (opus, ro) | plan → implement → review, deliberately cost-tiered; only the implementer can write. |
| | Commands | `commands/run-milestone` · `implement-requirement` | Human entry points (`/run-milestone M2`, `/implement-requirement FR-035`). |
| | Skills | `skills/transon-authoring` · `blockly-authoring` · `round-trip-review` · `spec-traceability` | On-demand procedures; all explicit-invocation (`disable-model-invocation: true`). |
| | MCP | `mcp.json` | Playwright (UI / a11y) + Context7 (live Blockly/React/Vite docs — **not** Transon). |
| **3 · Code** | Editor packages | `packages/@transon/*` *(future)* | What the harness produces, pinned to the contract; semantic core in `editor-core` (no Blockly/React/engine deps). |
| **4 · Gates** | Deterministic checks | `harness/scripts/check_traceability` · `check_links` · `check_engine_parity` · `check_maturity` · `harness/evals/run_evals` | Model-independent truth checks: ID consistency, markdown links, editor↔engine parity, harness maturity (+ratchet), agent golden-paths. |
| **5 · Enforcement** | Advisory | `.cursor/hooks.json` → `check-docs-consistency` (stop) · `advance-requirement-loop` (subagentStop) | Nudge mid-session (re-prompt on drift, self-advance the loop); **never block**. |
| | Binding | `harness/githooks/pre-commit` · `commit-msg` · `.github/workflows/agentic-checks.yml` | Make the gates **mandatory**: red blocks the commit (pre-commit) or merge (CI); `Refs:`/`Slice:` trailer required on code commits. |

Stages 1–2 are model-facing context; stages 4–5 are the model-independent backstop. The detail of the
advisory-vs-binding split in stage 5 is in [§4](#two-enforcement-layers-advisory-and-binding).

**Single-source, multi-tool (M-03 + M-07 + M-16).** The portable core is tool-agnostic: `AGENTS.md`
(rules + topology), the **`harness/` canonical bodies** (commands, skills, agent roles), the contract
docs, and the stage-4/5 gates, hooks, and CI. `.cursor/` and `.claude/` are each a *thin adapter that
points at that core, never a copy* — and crucially **neither references the other**, so neither tool is
second-class. Equal effectiveness comes from mechanisms that duplicate nothing:

- **Adapter bodies read the canonical `harness/` source at runtime.** A subagent/command/skill body in
  either tool is one screen — tool-specific frontmatter + "read `harness/...` / `AGENTS.md` and follow
  it" — and the model fetches it with the Read tool, so the prompt body lives in exactly one place. (The
  transclusion the earlier M-03 note said didn't exist at *definition* time works at *agent-runtime*.)
- **Always-on rules reach Claude via a `SessionStart` hook** that injects `AGENTS.md` (Claude does not
  auto-load it the way Cursor injects `alwaysApply` rules). Same source, made always-on per tool.
- **Capability and cost-tiering map to native fields:** read-only roles drop `Write`/`Edit` from the
  Claude `tools:` list (vs Cursor's `readonly`); `model: opus|sonnet` mirrors the opus/composer split.

The full cross-tool map is [`docs/portability.md`](../portability.md). Parity is **gated**, not hoped
for: `harness/evals/run_evals.py` fails if a command/skill/subagent is missing on *either* side (bidirectional),
if a read-only Claude subagent gains write tools, or if either adapter references the other tool. The
maturity scorer is likewise **tool-symmetric** (D1 credits the always-on contract per tool). New tooling
must land in `harness/` + both adapters, or carry an explicit exclusion (policy in `AGENTS.md`). The one
boundary that remains: glob-scoped rules map to Claude `paths:`-scoped skills / nested `CLAUDE.md`, added
with `packages/` at M0 — dormant in *both* tools until then.

---

## 2. How it operates

> Descriptive, not prescriptive — the imperative recipe an executor follows lives in `AGENTS.md` and
> `commands/`; this section describes the *shape* of that operation, not the steps to run.

### 2.1 The two entry points

Everything funnels through two `/`-commands, sized to two different scopes:

- **`/run-milestone M2`** — drives a whole roadmap milestone end-to-end in one focused pass.
- **`/implement-requirement FR-035`** — implements exactly one requirement, test-first.

The intended subagent topology (the commands and `AGENTS.md` describe it; the planner/implementer/
reviewer subagents make it concrete):

```mermaid
sequenceDiagram
    actor You
    participant Planner as planner (opus · readonly)
    participant Impl as implementer (composer · write)
    participant Gates as gates (trace · parity · evals · maturity)
    participant Hook as subagentStop hook (advisory)
    participant Reviewer as reviewer (opus · readonly)

    You->>Planner: /run-milestone M2
    Planner-->>You: locked design + ordered per-FR task list
    loop one FR per run
        You->>Impl: implement next FR (test-first)
        Impl->>Gates: run the deterministic checks
        Gates-->>Impl: green / problems
        Impl-->>Hook: subagent completes
        Hook-->>Impl: nudge — stay on this FR (if red) or advance (if green)
    end
    You->>Reviewer: review codec / round-trip / safety slices
    Reviewer-->>You: red/amber/green findings + merge verdict
    Note over Impl,Gates: pre-commit + CI run the same gates — binding, not advisory
```

### 2.2 The per-requirement loop

The operating recipe is defined **once** in `AGENTS.md` ("Development loop") and
`commands/implement-requirement.md`; it is not restated here. Its *shape*: one requirement per run,
test-first (citing the ID), minimal code in the right package, traceability row updated in the same
change, gates green, commit carrying a `Refs:`/`Slice:` trailer. The agent need not *remember* the
last two: `pre-commit` re-runs the gates and `commit-msg` enforces the trailer, so a drifting change is
rejected at commit time and CI re-checks on the PR — the recipe is the happy path, the hooks are the
backstop (see [§4](#two-enforcement-layers-advisory-and-binding)). The hard-stops (STOP-and-propose on
ambiguity, never renumber IDs, never report a template valid the engine would reject) are likewise
contract, defined in `AGENTS.md` / `spec-discipline` and enforced by the gates.

### 2.3 Bootstrapping (do this first)

**Enable the binding git hooks** — they are committed under `harness/githooks/` but git only runs them once
you point it there (one command per clone):

```bash
git config core.hooksPath harness/githooks
```

After this, `pre-commit` runs the gates and `commit-msg` requires a `Refs:`/`Slice:` trailer on
code-touching commits. Bypass in an emergency with `git commit --no-verify` (CI still enforces them).

**Wire the engine** so parity actually checks something. Today `transon` is not pip-installed here; the
parity check only passes because a sibling checkout exists at `../transon` (its `get_editor_metadata()`
export is used). To make it deterministic:

```bash
pip install transon                 # or: export TRANSON_REPO=/path/to/transon
python harness/scripts/check_traceability.py
python harness/scripts/check_engine_parity.py   # add --require-engine to fail (not skip) if absent
python harness/evals/run_evals.py
python harness/scripts/check_maturity.py         # see the per-dimension maturity levels
```

If neither the package nor `TRANSON_REPO`/sibling is present, plain `check_engine_parity.py` **skips
with exit 0** — it does nothing. Pass `--require-engine` to turn that skip into a hard failure; CI flips
this on once M0 makes the engine installable. See Gap **G-02** / plan item **M-09**.

### 2.4 Tool-for-job map

The canonical "which skill/MCP for which job" mapping is the **Tooling notes** in `AGENTS.md`; the
skills and MCP servers themselves are listed in the stage-2 rows of [§1](#what-each-stage-contains). It
is not duplicated here.

---

## 3. How it helps (why it is shaped this way)

- **A cost-tiered division of labour.** Expensive, *read-only* models do the judgement-heavy,
  irreversible-in-spirit work (planning a milestone, reviewing round-trip safety); a cheap, *write*
  model does the bounded, well-specified implementation. The expensive models can't accidentally
  mangle the tree (readonly); the cheap model can't drift far because the task is one FR with a
  test-first recipe and objective gates.
- **Determinism where it matters.** The checkers are pure-stdlib Python with no model in the loop.
  They answer questions a model cannot rationalize away: *does the editor's catalog match the engine?*
  (`check_engine_parity`), *is every cited/"done" requirement ID real and tested?* (`check_traceability`),
  *do the agents still obey maker≠checker and cost-tiered routing?* (`harness/evals/run_evals`), and *has the
  harness regressed?* (`check_maturity --check`).
- **Binding, not advisory.** Those gates run in a `pre-commit` git hook and in CI — a red check blocks
  the commit or the merge, it does not merely nudge. The editor hooks still nudge mid-session, but
  *landing* a change requires green. This advisory→binding line is the harness's main maturity lever
  (see [maturity-plan.md](maturity-plan.md)).
- **Context economy.** Always-on rules carry only the invariants; everything deeper (Blockly API,
  round-trip checklist, engine-query procedure) is a glob-scoped rule or an explicitly-invoked skill,
  so the model isn't drowning in context it doesn't need this turn.
- **Single source of truth, enforced by citation.** Requirement IDs (`FR/NFR/AC/UC/AD/OQ`) are the
  spine. Tests cite them, traceability rows track them, the checker rejects dead/deprecated IDs. The
  catalog is *derived from the engine export*, never hand-listed, so it can't quietly diverge.
- **Small tasks a weaker executor can't get lost in.** The whole harness is explicitly designed (see
  `AGENTS.md`) so a less-capable executor model can work safely: per-ID tasks, test-first, and gates
  it cannot bypass.

---

## 4. Stable development & drift mitigation

"Drift" has several distinct flavours. The harness has a specific control for most of them — and a
visible hole for a couple. This table is the heart of the guide.

| Drift type | What it looks like here | Control in the harness | Strength |
|---|---|---|---|
| **Engine/spec drift** | Editor supports a rule/operator/function the engine doesn't (or vice-versa); variant signatures or enum domains diverge | `check_engine_parity.py` compares `SPEC.md` §14 + the editor's derived catalog against the engine `get_editor_metadata()` export (names, variant signatures, resolved enums, export shape) | **Strong — when the engine is present** (see G-02) |
| **Intent / requirement drift** | Code does something the SPEC never sanctioned; a "done" feature has no test; tests cite IDs that don't exist | SPEC-first rule (§21.2), ID-stability rule (§21.1), `check_traceability.py` (no dead/deprecated IDs; "done" FR/AC must have a citing test), the `commit-msg` `Refs:`/`Slice:` trailer, STOP-and-escalate hard rules | **Strong now binding** — runs in pre-commit + CI; citation is still a proxy for coverage, not proof (G-04 / M-13) |
| **Harness / agent drift** | A subagent loses `readonly`, the cost tier collapses (writer == judge model), a skill becomes auto-invoked, the loop recipe is edited away | `harness/evals/run_evals.py` golden-path checks (maker≠checker · model routing · skill determinism · loop hooks/recipe), run in CI + pre-commit | **Strong** — deterministic, binding (M-02) |
| **Maturity regression** | A later change quietly drops a gate or weakens enforcement | `check_maturity.py --check` ratchets the per-dimension levels against `docs/maturity-baseline.json`; CI fails on any drop | **Strong** — binding in CI |
| **Semantic / round-trip drift** | Import→export silently changes meaning; a variant matches zero/many; ordering or marker-escape regresses | `round-trip-review` skill + `round-trip-reviewer` subagent; **`.coderabbit.yaml` structurally triggers an external reviewer on every PR** (M-05); **`review-gate` workflow fans review across dimensions and adversarially refutes each finding pre-merge** (M-06); execution-based round-trip corpus (AD-011); editor-core invariants rule | **Strong (design)** — review fires structurally (G-05 trigger) *and* findings are adversarially verified (G-05 adversarial half); the residual gap is execution-based corpus *enforcement*, which lands with code (M1) |
| **Tech-debt drift** | Hand-written per-rule codec/IR/block code creeps back; UI metadata leaks into templates; core grows engine/DOM deps | "Projections, not hand-written mappings" (§21.15, AD-026), UI≠semantics (§21.12), one-way package dependency rule, ROADMAP DoD line "no hand-written codec/IR/per-rule block code reintroduced" | **Medium** — these are prose rules + review, not automated checks yet |
| **Continuity drift** (context/session) | A new chat forgets the locked decisions; an executor re-litigates settled ADs; status trackers lag reality | Always-on rules re-inject invariants every turn; "locked decisions / do not relitigate" lists in ROADMAP and skills; **`docs/current-state.md` working handoff + committed metadata snapshot** (M-04), nudged by a stop hook; **`drift-watch` outer-loop watcher** flags accumulated drift on a schedule (M-08); transcripts archived under `agent-transcripts/` | **Strong** — handoff + snapshot carry state across sessions and the outer loop catches drift with no PR open (G-06 closed); residual is human re-pointing for genuinely new chats |
| **Catalog drift** | A parallel hand-maintained rule list grows beside the engine | "metadata-driven, no parallel hand-list" rule + parity check | **Strong** |
| **Toolchain drift** | Versions float; "works on my machine" | Version pins recorded in ROADMAP (AD-021); `monorepo-build.mdc` stub to be filled at M0 | **Pending** — no `package.json`/lockfile exists yet |

### Two enforcement layers: advisory and binding

The key to reading the harness is that nudging and blocking are *different layers*. Editor hooks live
inside the session and only **nudge**; git hooks and CI sit at the commit/merge boundary and **block**.
A change must pass the binding layer to land — the advisory layer just helps it get there faster.

```mermaid
flowchart LR
    EDIT["agent edits<br/>a file"] --> AH{"editor hook<br/>(advisory)"}
    AH -- "drift" --> NUDGE["follow-up nudge<br/>≤ loop_limit"]
    NUDGE --> EDIT
    AH -- "ok" --> COMMIT["git commit"]
    COMMIT --> PRE{"pre-commit + commit-msg<br/>(binding)"}
    PRE -- "gate red / no Refs:" --> R1["commit rejected"]
    PRE -- "green" --> PUSH["push / open PR"]
    PUSH --> CI{"agentic-checks CI<br/>(binding)"}
    CI -- "any gate red" --> R2["merge blocked"]
    CI -- "all green" --> MERGE["merge"]

    classDef adv fill:#FAEEDA,stroke:#854F0B,color:#412402;
    classDef bind fill:#E1F5EE,stroke:#0F6E56,color:#04342C;
    classDef stop fill:#FCEBEB,stroke:#A32D2D,color:#501313;
    class AH,NUDGE adv;
    class PRE,CI bind;
    class R1,R2 stop;
```

**Advisory layer (mid-session).** A `stop`/`subagentStop` hook injects a follow-up message up to
`loop_limit` times (`stop` = 3, `subagentStop` = 12) — it re-prompts on traceability drift and
self-advances the per-requirement loop, but it cannot stop a commit.

**Binding layer (commit + merge).** `harness/githooks/pre-commit` re-runs the gates and `harness/githooks/commit-msg`
demands the trailer, so a drifting change is **rejected locally**; `.github/workflows/agentic-checks.yml`
re-runs the same gates on every PR, so it is **blocked at merge** even if the local hooks were bypassed.
The one remaining soft spot is engine parity, which still self-skips until M0 makes `transon`
installable and CI flips on `--require-engine` (G-02 / M-09).

---

## 5. Gaps & improvement tracking

The harness gaps once catalogued here (G-01 … G-12), the practice scorecard, and the recommended next
steps now live in one trackable, score-driven backlog — so they have a single owner instead of being
restated across docs:

- **[maturity-plan.md](maturity-plan.md)** — the gap backlog (G-01 … G-12) merged with the improvement
  proposals into a checklist; each item carries a criticality = its maturity-score delta, a
  machine-detectable acceptance criterion, and a status checkbox.
- **[`harness/scripts/check_maturity.py`](../../harness/scripts/check_maturity.py)** +
  **[`docs/maturity-baseline.json`](../maturity-baseline.json)** — the deterministic scorecard (eight
  dimensions on a 0-4 enforcement ladder) and its committed baseline; the CI ratchet fails on regression.

Run `python harness/scripts/check_maturity.py` for the current per-dimension levels and the evidence behind each.

---

## 6. Quick reference

```text
AGENTS.md                    portable cross-tool source: rules + subagent topology (single source)
CLAUDE.md                    thin Claude Code adapter → points at AGENTS.md (no copied rules)
.mcp.json                    Claude project MCP (playwright · context7); Cursor reads .cursor/mcp.json
docs/                        contract (SPEC · ARCHITECTURE · …) + portability.md + guides/
harness/ (the whole tool-agnostic harness — edit canonical bodies AND gates here)
  agents/       milestone-planner · requirement-implementer · round-trip-reviewer   (role bodies)
  commands/     run-milestone · implement-requirement   (procedures)
  skills/       transon-authoring · blockly-authoring · round-trip-review · spec-traceability
  workflows/    review-gate   (adversarial pre-merge review-gate procedure)
  scripts/      check_traceability · check_links · check_engine_parity · check_maturity · update_memory   (deterministic gates)
  evals/        run_evals.py + cases/   (maker≠checker · routing · skill determinism · cross-tool parity incl. workflows)
  githooks/     pre-commit · commit-msg   (binding; enable: git config core.hooksPath harness/githooks)
  automations/  drift_watch · ci_triage · worktrees.md   (outer-loop, propose-only; harness-core)
  README.md     harness governance (single-source · both tools equally · gated)
.cursor/ (Cursor adapter — thin; rules + frontmatter, bodies → harness/)
  rules/ (always + glob) · agents/ · commands/ · skills/ · workflows/ · hooks/ (advisory nudges) · mcp.json
.claude/ (Claude Code adapter — thin; bodies read harness/ + AGENTS.md at runtime)
  agents/ (read-only via tools:) · commands/ · skills/ · workflows/ · settings.json
  hooks/ — inject-rules (SessionStart: injects AGENTS.md) · stop-traceability · advance-loop · handoff-memory
.github/workflows/
  agentic-checks.yml         re-runs trace + evals + parity + maturity on every PR/push (binding)
  drift-watch.yml            scheduled outer loop — runs the read-only gates, opens an issue on drift (propose-only)
```

One-time setup (per clone): `git config core.hooksPath harness/githooks`.

Run before finishing any change that touches `docs/`, code, or tests (the hooks run these for you):

```bash
python harness/scripts/check_traceability.py
python harness/scripts/check_links.py             # relative markdown file + anchor links resolve
python harness/evals/run_evals.py
python harness/scripts/check_engine_parity.py    # needs transon installed or TRANSON_REPO set; --require-engine to enforce
python harness/scripts/check_maturity.py --check  # ratchet vs docs/maturity-baseline.json
```
