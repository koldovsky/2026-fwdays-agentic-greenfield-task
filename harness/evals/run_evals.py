#!/usr/bin/env python3
"""Golden-path evals for the agent harness itself (M-02, closes G-12).

The product is deterministic JSON⇄JSON, so output/LM-judge evals barely apply to
it — but the *agents* are non-deterministic, and their prompts/config can silently
regress. These are the regression guards for the harness: cheap, deterministic
assertions over `.cursor/agents`, `.cursor/skills`, `.cursor/commands`, and
`hooks.json` that fail loudly if the maker≠checker separation, the cost-tiered
model routing, the skill-determinism flag, or the per-requirement loop recipe
quietly breaks.

This tier runs in CI and in the pre-commit hook. The model-judged behavioral
cases (planner emits one task per FR, implementer refuses an ambiguous SPEC, the
round-trip corpus catches a seeded meaning change) live in `harness/evals/cases/*.md` and
are run by a human / LM-judge — they need a model in the loop and, for the
round-trip case, code that does not exist yet (see `harness/evals/README.md`).

Pure stdlib, Python 3.9+. Run:

  python harness/evals/run_evals.py            # exit 0 if all golden-path evals pass

Also importable: ``check()`` returns the list of failures.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Dict, List

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
CURSOR = PROJECT_ROOT / ".cursor"

# The expected maker≠checker topology (the harness's central invariant).
WRITER = "requirement-implementer"
READERS = {"milestone-planner", "round-trip-reviewer"}


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore") if path.exists() else ""


def _frontmatter(path: Path) -> Dict[str, str]:
    """Parse the leading ``--- ... ---`` block into a flat dict (no yaml dep)."""
    text = _read(path)
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    fields: Dict[str, str] = {}
    for line in text[3:end].splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()
    return fields


def _agents() -> Dict[str, Dict[str, str]]:
    return {
        p.stem: _frontmatter(p)
        for p in sorted((CURSOR / "agents").glob("*.md"))
    }


# --------------------------------------------------------------------------- #
# Eval cases — each returns a list of failure strings (empty == pass)
# --------------------------------------------------------------------------- #

def eval_maker_ne_checker(agents: Dict[str, Dict[str, str]]) -> List[str]:
    """Exactly one agent may write; planner and reviewer are read-only."""
    out: List[str] = []
    writers = {name for name, fm in agents.items() if fm.get("readonly") == "false"}
    if writers != {WRITER}:
        out.append(f"maker≠checker: expected only '{WRITER}' to be writable, got writers={sorted(writers) or 'none'}")
    for reader in READERS:
        if reader not in agents:
            out.append(f"maker≠checker: expected read-only agent '{reader}' is missing")
        elif agents[reader].get("readonly") != "true":
            out.append(f"maker≠checker: '{reader}' must be readonly:true (got {agents[reader].get('readonly')!r})")
    return out


def eval_cost_tiered_routing(agents: Dict[str, Dict[str, str]]) -> List[str]:
    """Every agent declares a model, and the writer's tier differs from the judges'."""
    out: List[str] = []
    for name, fm in agents.items():
        if not fm.get("model"):
            out.append(f"model-routing: agent '{name}' declares no model (cost-tiered routing relies on it)")
    impl = agents.get(WRITER, {}).get("model")
    for judge in sorted(READERS):
        judge_model = agents.get(judge, {}).get("model")
        if impl and judge_model and impl == judge_model:
            out.append(f"model-routing: writer and judge '{judge}' share model {impl!r} — the cost tier collapsed")
    return out


def eval_skills_deterministic() -> List[str]:
    """Every skill is explicit-invocation (disable-model-invocation: true)."""
    out: List[str] = []
    skills = sorted((CURSOR / "skills").glob("*/SKILL.md"))
    if not skills:
        out.append("skills: no SKILL.md files found under .cursor/skills/")
    for skill in skills:
        if _frontmatter(skill).get("disable-model-invocation") != "true":
            out.append(f"skills: '{skill.parent.name}' must set disable-model-invocation: true (determinism)")
    return out


def eval_loop_hooks() -> List[str]:
    """hooks.json wires both post-turn loops with bounded loop_limits."""
    out: List[str] = []
    try:
        hooks = json.loads(_read(CURSOR / "hooks.json")).get("hooks", {})
    except json.JSONDecodeError as exc:
        return [f"hooks: hooks.json is unreadable ({exc})"]
    for event in ("stop", "subagentStop"):
        entries = hooks.get(event) or []
        if not entries:
            out.append(f"hooks: no '{event}' hook configured")
            continue
        # bool is a subclass of int — `loop_limit: true` must not count as a bounded loop.
        if not any(isinstance(e.get("loop_limit"), int) and not isinstance(e.get("loop_limit"), bool)
                   for e in entries):
            out.append(f"hooks: '{event}' hook has no integer loop_limit (unbounded nudging)")
    return out


def eval_loop_recipe() -> List[str]:
    """The implement-requirement command (the tool-neutral canonical body) still encodes
    the test-first + trace recipe."""
    out: List[str] = []
    cmd = _read(PROJECT_ROOT / "harness" / "commands" / "implement-requirement.md").lower()
    if not cmd:
        return ["loop-recipe: harness/commands/implement-requirement.md is missing"]
    # Require the adjacent positive phrase ("test first" / "test-first" / "test **first**"), not
    # merely the two words somewhere in the file (which negated/incidental mentions would satisfy).
    if not re.search(r"test\W{1,3}first", cmd):
        out.append("loop-recipe: implement-requirement.md no longer states the test-first rule")
    if "traceability" not in cmd:
        out.append("loop-recipe: implement-requirement.md no longer updates docs/traceability.md")
    return out


def eval_cross_tool_parity() -> List[str]:
    """Cursor and Claude adapters stay symmetric: every command/skill/agent exists on
    *both* sides, both reference the tool-neutral ``harness/`` core (neither references the
    other — no second-class tool), and read-only roles stay read-only. This is the gate
    behind the "new tooling lands in both tools" policy (see docs/portability.md)."""
    claude = PROJECT_ROOT / ".claude"
    harness = PROJECT_ROOT / "harness"
    if not claude.exists():
        return ["parity: no .claude/ adapters — Claude Code is not at parity with Cursor"]
    out: List[str] = []

    # 1. Bidirectional existence parity for agents, commands, skills, workflows.
    kinds = (
        ("agents", "*.md", lambda p: p.stem),
        ("commands", "*.md", lambda p: p.stem),
        ("skills", "*/SKILL.md", lambda p: p.parent.name),
        ("workflows", "*.md", lambda p: p.stem),
    )
    for kind, pattern, key in kinds:
        cur = {key(p) for p in (CURSOR / kind).glob(pattern)}
        cl = {key(p) for p in (claude / kind).glob(pattern)}
        for missing in sorted(cur - cl):
            out.append(f"parity: .claude/{kind}/{missing} missing (Cursor has it)")
        for missing in sorted(cl - cur):
            out.append(f"parity: .cursor/{kind}/{missing} missing (Claude has it)")

    # 2. Read-only Claude roles must not gain write tools.
    for name in READERS:
        tools = _frontmatter(claude / "agents" / f"{name}.md").get("tools", "")
        if "Write" in tools or "Edit" in tools:
            out.append(f"parity: .claude agent '{name}' must be read-only (no Write/Edit in tools)")

    # 3. No second-class tool: neither adapter may reference the other's dir — both point at harness/.
    for tool_dir, other in ((CURSOR, ".claude/"), (claude, ".cursor/")):
        for sub in ("agents", "commands", "skills", "workflows"):
            for path in (tool_dir / sub).rglob("*.md"):
                if other in _read(path):
                    out.append(f"parity: {path.relative_to(PROJECT_ROOT)} references {other} — "
                               "adapters must point at harness/, not each other")

    # 4. Canonical bodies live in the tool-neutral harness/ core. (workflows only once one exists)
    canonical_kinds = ["agents", "commands", "skills"]
    if (claude / "workflows").exists() or (CURSOR / "workflows").exists():
        canonical_kinds.append("workflows")
    for sub in canonical_kinds:
        if not list((harness / sub).glob("*.md")):
            out.append(f"parity: harness/{sub}/ has no canonical bodies")

    return out


def check() -> List[str]:
    agents = _agents()
    if not agents:
        return ["harness: no agents found under .cursor/agents/ — is the harness present?"]
    failures: List[str] = []
    failures += eval_maker_ne_checker(agents)
    failures += eval_cost_tiered_routing(agents)
    failures += eval_skills_deterministic()
    failures += eval_loop_hooks()
    failures += eval_loop_recipe()
    failures += eval_cross_tool_parity()
    return failures


def main() -> int:
    failures = check()
    if failures:
        print(f"evals: {len(failures)} golden-path failure(s):")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("evals: harness golden-path checks pass "
          "(maker≠checker · cost-tiered routing · skill determinism · loop hooks · loop recipe · cross-tool parity).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
