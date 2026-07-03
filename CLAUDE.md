# CLAUDE.md

> **No rules live here — this is a pointer, not a copy.** The single source of always-on agent rules
> is **[AGENTS.md](AGENTS.md)**; read it first. Do not restate rules in this file — change `AGENTS.md`
> instead. This file exists only so Claude Code loads the same contract every other tool uses.

This harness is **single-source, multi-tool** by design — nothing is duplicated per tool:

- **Portable core** (tool-agnostic, the real harness): [AGENTS.md](AGENTS.md) (rules + subagent
  topology + the per-requirement loop), the contract docs in [`docs/`](docs/), the deterministic gates
  (`harness/scripts/check_*.py`, `harness/evals/run_evals.py`), the git hooks (`harness/githooks/`), and CI
  (`.github/workflows/agentic-checks.yml`). These run identically regardless of which agent tool drives them.
- **Thin tool adapters** (no copied bodies): `.cursor/` is the Cursor adapter; `.claude/` is the Claude
  Code adapter — subagents (`agents/`), commands (`commands/`), skills (`skills/`), `SessionStart` /
  `Stop` / `SubagentStop` hooks (`settings.json` + `hooks/`), and `.mcp.json`. Each Claude adapter is
  *thin*: its body reads the single-source `.cursor/`/`AGENTS.md` file at runtime, so no prompt body,
  rule, or check is duplicated. The cross-tool map is [`docs/portability.md`](docs/portability.md), and
  parity is **gated** by `harness/evals/run_evals.py` (every `.cursor` adapter must have a `.claude` counterpart).

To **drive** the harness, follow [AGENTS.md](AGENTS.md) (rules + per-requirement loop) and the
commands/skills under `.cursor/`. For an **overview of the current implementation** (what exists and
how mature it is — not an operating manual), see
[docs/guides/agentic-development.md](docs/guides/agentic-development.md) and its companion
[docs/guides/maturity-plan.md](docs/guides/maturity-plan.md).
Enable the binding git hooks in your clone: `git config core.hooksPath harness/githooks`.
