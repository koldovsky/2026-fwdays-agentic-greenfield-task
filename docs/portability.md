# Portability — one harness, every agent tool

> **Status: non-authoritative** field-manual artifact (like the guides under `docs/guides/`). It
> documents how the harness stays tool-agnostic. The contract is `AGENTS.md` + `docs/`.

The harness is **single-source, multi-tool**: one portable core, plus a *thin adapter* per agent tool
that points back at that core. No prompt body, rule, or check is copied between tools — adapters
reference the single source and read it at runtime, so there is nothing to drift.

## The portable core (tool-agnostic — runs identically everywhere)

| Core | Files |
|---|---|
| Rules + subagent topology + per-requirement loop | `AGENTS.md` |
| **Canonical agent / command / skill bodies** | `harness/agents/` · `harness/commands/` · `harness/skills/` |
| Contract | `docs/SPEC.md` · `ARCHITECTURE.md` · `metadata-contract.md` · `ROADMAP.md` · `traceability.md` |
| Deterministic gates | `harness/scripts/check_*.py` · `harness/evals/run_evals.py` |
| Binding enforcement | `harness/githooks/` (pre-commit, commit-msg) · `.github/workflows/agentic-checks.yml` |

The agent/command/skill **bodies live once** in `harness/`. Both `.cursor/` and `.claude/` carry only a
thin adapter — tool-specific frontmatter plus "read `harness/...` and follow it". Neither tool
references the other, so neither is second-class.

The gates, git hooks, and CI are plain Python + git + GitHub Actions — they bind on `git commit` and on
PRs **regardless of which agent tool authored the change**. They need no per-tool adapter.

## Per-tool adapters (thin — point at the core, never copy it)

| Mechanism | Canonical source | Cursor adapter (`.cursor/`) | Claude adapter (`.claude/`, `.mcp.json`) |
|---|---|---|---|
| Always-on rules | `AGENTS.md` | `rules/*.mdc` (`alwaysApply`) | `CLAUDE.md` + `SessionStart` hook injects `AGENTS.md` (Claude does not auto-load it) |
| Glob-scoped rules | — | `rules/editor-core.mdc` … (`globs:`) | `paths:`-scoped skills / nested `CLAUDE.md` — dormant in **both** until `packages/` (M0) |
| Subagents | `harness/agents/*.md` | `agents/*.md` (`model`, `readonly`) | `agents/*.md` (`tools:` = capability, `model:` = tier) |
| Commands | `harness/commands/*.md` | `commands/*.md` | `commands/*.md` (`/run-milestone`, `/implement-requirement`) |
| Skills | `harness/skills/*.md` | `skills/*/SKILL.md` (`disable-model-invocation`) | `skills/*/SKILL.md` (`disable-model-invocation`) |
| Workflows | `harness/workflows/*.md` | `workflows/*.md` (e.g. `review-gate`) | `workflows/*.md` (e.g. `review-gate`) |
| Advisory hooks | `harness/scripts/check_traceability.check()`, `update_memory.handoff_nudge()` | `hooks.json` → `check-docs-consistency` + `handoff-memory` (stop), `advance-requirement-loop` (subagentStop) | `settings.json` → `SessionStart`, `Stop` (`stop-traceability` + `handoff-memory`), `SubagentStop` |
| Working memory / snapshot | `harness/scripts/update_memory.py` → `docs/current-state.md` + `docs/metadata-snapshot.json` | `hooks/handoff-memory.py` (stop nudge) | `hooks/handoff-memory.py` (Stop nudge) — both call `handoff_nudge()` |
| MCP | — | `mcp.json` | `.mcp.json` |

Each adapter cell is *thin*: tool-specific frontmatter + "read the canonical source and follow it". The
advisory hooks share the check **logic** (`check_traceability.check()`); only the per-tool I/O glue
differs.

## Invariant: parity is gated, not hoped for

`harness/evals/run_evals.py` (`eval_cross_tool_parity`) runs in the pre-commit hook and CI, and fails if:

- a command / skill / subagent / **workflow** exists on one tool but not the other (**bidirectional**);
- a read-only Claude subagent carries `Write`/`Edit` in `tools`;
- **either adapter references the other tool's directory** (both must point at `harness/` — no
  second-class tool);
- `harness/{agents,commands,skills,workflows}/` has no canonical bodies.

The maturity scorer is likewise tool-symmetric: D1 (context) credits the always-on contract for *each*
tool that has it (Cursor `alwaysApply` **or** Claude `CLAUDE.md` + SessionStart), and the advisory-hook
signal reads both `.cursor/hooks` and `.claude/hooks`.

## Adding new tooling (policy)

The governing rule is the harness charter — [`harness/README.md`](../harness/README.md) → *Harness
governance*. In short: new tooling lands in `harness/` (or shared `harness/scripts/`) **and both** adapters, or
carries an explicit exclusion documented here. The parity eval enforces the default; exclusions must be
reasoned about, not silent.

**Current exclusions:**
- **Glob-scoped rules** — dormant in both tools until `packages/` land at M0 (see *Known boundary*).
- **`harness/automations/`** (outer-loop, propose-only watchers + the `drift-watch` scheduled workflow)
  — harness-*core* infrastructure like `scripts/` / `evals/` / `githooks/`, driven by a scheduler or a
  human, **not** by either agent tool. So it is not a per-tool adapter and is not duplicated into
  `.cursor/` / `.claude/`.

## Known boundary

- **Glob-scoped rules** map to Claude `paths:`-scoped skills or nested `CLAUDE.md`, but both are added
  when `packages/` land (M0). Today they are dormant in both tools (their globs match nothing), so the
  tools are *equally effective* now and parity-ready for then.
- **GitHub Copilot / Codex** are not yet adapted; the portable core already works for them via
  `AGENTS.md`. Adding `.github/copilot-instructions.md` / `.codex/prompts/` is the same thin-adapter
  pattern when needed.
