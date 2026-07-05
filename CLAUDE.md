# CLAUDE.md

> **No rules live here — this is a pointer, not a copy.** The single source of always-on agent rules
> is **[AGENTS.md](AGENTS.md)**; read it first. Do not restate rules in this file — change `AGENTS.md`
> instead. This file exists only so Claude Code loads the same contract every other tool uses.

- **Drive the harness** with [AGENTS.md](AGENTS.md) (rules + per-requirement loop); the Claude Code
  adapters live under `.claude/` and read the single-source bodies at runtime.
- **How the single-source, multi-tool harness works** (portable core, thin adapters, parity gate):
  [`harness/README.md`](harness/README.md) and [`docs/portability.md`](docs/portability.md).
- **Implementation overview** (what exists, how mature):
  [docs/guides/agentic-development.md](docs/guides/agentic-development.md) and
  [docs/guides/maturity-plan.md](docs/guides/maturity-plan.md).
- Enable the binding git hooks in your clone: `git config core.hooksPath harness/githooks`.
