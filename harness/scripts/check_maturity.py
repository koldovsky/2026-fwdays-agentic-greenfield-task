#!/usr/bin/env python3
"""Agentic-engineering maturity scorer for the Transon Visual Editor.

Scores the *harness* (not the product) on eight dimensions, each on a single
0-4 "enforcement ladder" — how far a capability has climbed from advisory to
binding:

  L0 absent · L1 documented/manual · L2 scripted/repeatable ·
  L3 enforced/binding (CI or git hook; red blocks merge) · L4 optimizing
  (tracked over time; ratchet/eval guards regression).

Each level is tied to a *detectable artifact* (a file, a CI job, a hook),
never a judgment call, so the score is reproducible: two runs on the same tree
agree exactly. This mirrors the project's other deterministic checkers
(``check_traceability.py``, ``check_engine_parity.py``) — the assessment obeys
the same "everything traceable / deterministic checks before judgment" rule the
contract demands of the code.

Dimensions and weights (weights reflect how load-bearing each is for a solo,
pre-code, embeddable-library project):

  D1 context engineering        1.0
  D2 spec & traceability        1.5
  D3 verification & gates       1.5
  D4 review / maker != checker  1.0
  D5 loop & orchestration       1.0
  D6 memory & knowledge         1.0
  D7 portability & tooling      1.0
  D8 proof & observability      0.5  (lifecycle-gated until UI/code lands)

  maturity % = sum(level_i * weight_i) / (4 * sum weight_i) * 100

Tiers: 0-20 L0 Vibe · 21-40 L1 Emerging · 41-60 L2 Repeatable ·
       61-80 L3 Enforced · 81-100 L4 Optimizing.

Usage:

  python harness/scripts/check_maturity.py                 # human summary + ratchet
  python harness/scripts/check_maturity.py --json          # machine-readable measure
  python harness/scripts/check_maturity.py --check         # CI: fail if below baseline
  python harness/scripts/check_maturity.py --update-baseline

The ratchet (``--check``) fails (exit 1) if any dimension regresses below the
committed ``docs/maturity-baseline.json`` (or the overall score drops). That is
the move that turns this audit from a one-off into a binding gate — the L3->L4
step for the harness itself.

Pure stdlib, Python 3.9+, no project imports.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BASELINE = PROJECT_ROOT / "docs" / "maturity-baseline.json"

ID_RE = re.compile(r"\b(FR|NFR|AC|UC|AD|OQ)-\d+\b")

TIERS = (
    (20, "L0 · Vibe"),
    (40, "L1 · Emerging"),
    (60, "L2 · Repeatable"),
    (80, "L3 · Enforced"),
    (100, "L4 · Optimizing"),
)


# --------------------------------------------------------------------------- #
# Filesystem signal helpers (deterministic; scan known locations only)
# --------------------------------------------------------------------------- #

def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore") if path.exists() else ""


def _exists(rel: str) -> bool:
    return (PROJECT_ROOT / rel).exists()


def _glob(pattern: str) -> List[Path]:
    return [p for p in PROJECT_ROOT.glob(pattern) if p.is_file()]


def _concat(paths: List[Path]) -> str:
    return "\n".join(_read(p) for p in paths)


def _any_of(*rels: str) -> bool:
    return any(_exists(r) for r in rels)


# Pre-computed signal bundles (cheap; the repo is small).

def _signals() -> Dict[str, object]:
    agent_dirs = _glob(".cursor/agents/*.md") + _glob(".claude/agents/*.md")
    rule_files = _glob(".cursor/rules/*.mdc") + _glob(".cursor/rules/*.md")
    skill_files = _glob(".cursor/skills/**/SKILL.md") + _glob(".claude/skills/**/SKILL.md")
    workflows = _glob(".github/workflows/*.yml") + _glob(".github/workflows/*.yaml")
    # Binding hooks run at the git layer (block the commit). Advisory editor
    # hooks (.cursor/hooks) only nudge — they never count as enforcement (L3).
    git_hooks = _glob("harness/githooks/*") + _glob(".husky/*")
    # Advisory editor hooks from BOTH tool adapters (Cursor + Claude Code) — they nudge, never block.
    advisory_hooks = (
        _glob(".cursor/hooks/*")
        + ([PROJECT_ROOT / ".cursor/hooks.json"] if _exists(".cursor/hooks.json") else [])
        + _glob(".claude/hooks/*")
        + ([PROJECT_ROOT / ".claude/settings.json"] if _exists(".claude/settings.json") else [])
    )
    # Always-on contract, per tool: Cursor `alwaysApply` rules; Claude CLAUDE.md + a SessionStart hook
    # that injects AGENTS.md (Claude does not auto-load AGENTS.md). Counted symmetrically.
    claude_skills_text = _concat(_glob(".claude/skills/**/SKILL.md"))
    claude_settings_text = _read(PROJECT_ROOT / ".claude/settings.json")
    cursor_always_on = "alwaysapply" in _concat(_glob(".cursor/rules/*.mdc")).lower()
    claude_always_on = _exists("CLAUDE.md") and (
        _exists(".claude/hooks/inject-rules.py") or "sessionstart" in claude_settings_text.lower()
    )
    always_on_surfaces = int(cursor_always_on) + int(claude_always_on)
    checkers = _glob("harness/scripts/check_*.py") + _glob("harness/scripts/check-*.mjs") + _glob("harness/scripts/check-*.js")
    contract = _glob("docs/*.md")
    tool_surfaces = sum(
        bool(x)
        for x in (
            _exists(".cursor"),
            _any_of(".claude/agents", ".claude/commands", ".claude/skills", "CLAUDE.md"),
            _any_of(".codex", ".codex/prompts"),
            _any_of(".github/copilot-instructions.md"),
            _exists(".agents"),
        )
    )
    return {
        "agents_text": _concat(agent_dirs),
        "agent_files": agent_dirs,
        "rule_files": rule_files,
        "rules_text": _concat(rule_files),
        "claude_skills_text": claude_skills_text,
        "cursor_always_on": cursor_always_on,
        "claude_always_on": claude_always_on,
        "always_on_surfaces": always_on_surfaces,
        "skill_files": skill_files,
        "workflows_text": _concat(workflows),
        "workflows": workflows,
        "git_hooks_text": _concat(git_hooks),
        "git_hooks": git_hooks,
        "advisory_hooks_text": _concat(advisory_hooks),
        "advisory_hooks": advisory_hooks,
        "checkers": checkers,
        "contract_text": _concat(contract),
        "contract_files": contract,
        "agents_md": _read(PROJECT_ROOT / "AGENTS.md"),
        "tool_surfaces": tool_surfaces,
        "has_code": _any_of("packages", "package.json", "src"),
        "has_evals": _any_of("harness/evals", "harness/evals/cases"),
        "has_current_state": _any_of("docs/current-state.md", "docs/CURRENT-STATE.md"),
        "has_snapshot": bool(_glob("**/*metadata*snapshot*") + _glob("snapshots/*") + _glob("docs/**/*snapshot*")),
        "has_adr": _any_of("docs/adr", "docs/ADR") or bool(re.search(r"\bAD-\d+\b", _concat(contract))),
        "mcp": _any_of(".cursor/mcp.json", ".mcp.json", ".cursor/mcp"),
        "coderabbit": _any_of(".coderabbit.yaml", ".coderabbit.yml"),
        "transcripts": _any_of("agent-transcripts", "agent-transcripts/"),
        "automations": _any_of("harness/automations", "automations", ".cursor/automations"),
    }


def _negative_rules(text: str) -> bool:
    return bool(re.search(r"\b(never|do not|don't|must not|forbidden|NEVER)\b", text, re.IGNORECASE))


def _runs_in_ci(s: Dict[str, object], *needles: str) -> bool:
    w = str(s["workflows_text"]).lower()
    return any(n.lower() in w for n in needles)


def _enforced_by_hook(s: Dict[str, object], *needles: str) -> bool:
    """True only for *binding* git-layer hooks — advisory editor hooks don't count."""
    h = str(s["git_hooks_text"]).lower()
    return any(n.lower() in h for n in needles)


# --------------------------------------------------------------------------- #
# Per-dimension detectors -> (level, evidence)
# --------------------------------------------------------------------------- #

def d1_context(s) -> Tuple[int, str]:
    """Tool-symmetric: the static always-on layer counts for *each* tool that has it
    (Cursor alwaysApply rules; Claude CLAUDE.md + SessionStart-injected AGENTS.md)."""
    if not (s["agents_md"] or _exists("CLAUDE.md")):
        return 0, "no AGENTS.md / CLAUDE.md"
    surfaces = int(s["always_on_surfaces"])
    static = surfaces >= 1
    dynamic = len(s["skill_files"]) >= 1
    if not (static and dynamic):
        return 1, "AGENTS.md present; no layered static/dynamic context"
    scoped = (
        "globs:" in str(s["rules_text"]).lower()
        or "glob" in str(s["rules_text"]).lower()
        or "paths:" in str(s["claude_skills_text"]).lower()
    )
    negative = _negative_rules(s["agents_md"]) or _negative_rules(str(s["rules_text"]))
    if scoped and negative:
        # L4 only if a documented rule-feedback loop is wired (rare to auto-detect).
        return 3, (
            f"always-on contract in {surfaces} tool(s) (Cursor rules + Claude CLAUDE.md/SessionStart) "
            f"+ {len(s['skill_files'])} skills + scoped rules; negative rules present"
        )
    return 2, f"always-on in {surfaces} tool(s) + {len(s['skill_files'])} skills"


def d2_spec_trace(s) -> Tuple[int, str]:
    has_ids = bool(ID_RE.search(str(s["contract_text"])))
    if not has_ids:
        return 0, "no numbered requirement IDs in docs/"
    has_checker = _exists("harness/scripts/check_traceability.py")
    if not has_checker:
        return 1, "numbered IDs present; no traceability checker"
    in_ci = _runs_in_ci(s, "check_traceability")
    by_hook = _enforced_by_hook(s, "check_traceability", "check-traceability")
    if not (in_ci or by_hook):
        return 2, "numbered IDs + check_traceability.py, but run voluntarily (no CI/hook)"
    trailer = _enforced_by_hook(s, "refs:", "slice:") or bool(_glob("harness/githooks/commit-msg*") + _glob(".husky/commit-msg*"))
    if in_ci and trailer:
        return 4, "traceability gated in CI + commit-trailer convention enforced"
    return 3, "traceability checker runs in CI/hook (blocking)"


def d3_verify_gates(s) -> Tuple[int, str]:
    if not s["checkers"] and not _exists("package.json"):
        return 0, "no deterministic checkers or test runner"
    if not s["checkers"]:
        return 1, "test runner only; no deterministic gate scripts"
    in_ci = _runs_in_ci(s, "check_traceability", "check_engine_parity", "check_maturity", "vitest", "pnpm test")
    by_hook = _enforced_by_hook(s, "check", "test", "lint")
    if not (in_ci or by_hook):
        return 2, f"{len(s['checkers'])} deterministic checker(s), run voluntarily (no CI/hook)"
    # L4 needs a real coverage/eval ratchet, not the (self-referential) maturity ratchet.
    if s["has_evals"] or _exists("harness/scripts/check-coverage-ratchet.mjs") or _runs_in_ci(s, "coverage"):
        return 4, "gates run in CI + coverage/eval ratchet guards regression"
    return 3, "deterministic gates run in CI/hook (blocking)"


def d4_review(s) -> Tuple[int, str]:
    text = str(s["agents_text"]).lower()
    reviewer = any("review" in p.name.lower() for p in s["agent_files"]) or "review" in text
    if not reviewer:
        return 0 if not s["agent_files"] else 1, "no distinct reviewer agent"
    maker = any(
        k in (p.name.lower() + text) for p in s["agent_files"]
        for k in ("implement", "builder", "test-engineer")
    )
    triggered = (
        s["coderabbit"]
        or _exists(".github/CODEOWNERS")
        or _runs_in_ci(s, "review")
        or _enforced_by_hook(s, "review")
    )
    workflow = bool(_glob(".claude/workflows/*review*") + _glob(".cursor/workflows/*review*"))
    if workflow and triggered:
        return 4, "adversarial review workflow + structurally triggered"
    if triggered:
        return 3, "maker != checker agents + review structurally triggered"
    if maker:
        return 2, "distinct maker + checker agents, but review is advisory (not triggered)"
    return 1, "a reviewer agent exists; no maker/checker separation"


def d5_loop(s) -> Tuple[int, str]:
    commands = _glob(".cursor/commands/*.md") + _glob(".claude/commands/**/*.md")
    if not commands:
        return 0, "no orchestration commands"
    has_hooks = bool(str(s["advisory_hooks_text"]).strip()) or bool(s["git_hooks"])
    if not has_hooks:
        return 1, f"{len(commands)} command(s); no loop hooks"
    if s["automations"]:
        return 4, "loops + scheduled automations / worktrees"
    # L3 needs a binding git hook (green-before-commit), not just advisory nudges.
    if _enforced_by_hook(s, "exit 1", "exit(1)", "check", "test"):
        return 3, "binding git hook gates the loop (green before commit)"
    return 2, f"{len(commands)} command(s) + advisory hooks (nudge, not block)"


def d6_memory(s) -> Tuple[int, str]:
    if not s["contract_files"]:
        return 0, "no contract docs"
    if len(s["contract_files"]) < 2:
        return 1, "single doc; not a structured source of truth"
    if not s["has_adr"]:
        return 2, "structured contract docs; no explicit intent/decision ledger"
    if s["has_current_state"] and s["has_snapshot"]:
        return 4, "intent ledger + working handoff + committed snapshot"
    return 3, "structured contract + AD/OQ intent ledger (no working handoff/snapshot)"


def d7_portability(s) -> Tuple[int, str]:
    if not (s["agents_md"] or _exists("CLAUDE.md")):
        return 0, "no portable AGENTS.md"
    if not (s["mcp"] or s["skill_files"]):
        return 1, "AGENTS.md present; no MCP/skills"
    surfaces = int(s["tool_surfaces"])
    if surfaces >= 2 and _any_of("docs/portability.md"):
        return 4, f"{surfaces} agent-tool surfaces + documented portability"
    if surfaces >= 2:
        return 3, f"harness present for {surfaces} agent tools"
    return 2, "AGENTS.md + MCP + skills, but single agent-tool surface"


def d8_proof(s) -> Tuple[int, str]:
    a11y_mcp = "playwright" in (
        _read(PROJECT_ROOT / ".cursor/mcp.json").lower() + _read(PROJECT_ROOT / ".mcp.json").lower()
    )
    recordings = bool(_glob("harness/scripts/record-*.mjs") + _glob("harness/scripts/*record*.py"))
    if not (a11y_mcp or s["transcripts"] or recordings):
        return 0, "no UI-test MCP, recordings, or transcripts"
    if not recordings:
        return 1, "UI-test MCP / transcripts configured; no asserted proof yet"
    if _runs_in_ci(s, "record", "a11y", "recordings"):
        if _glob(".claude/workflows/*vision*"):
            return 4, "recordings asserted in CI + vision-judge"
        return 3, "proof recordings asserted in CI"
    return 2, "proof/recording scripts present, run voluntarily"


DIMENSIONS: List[Tuple[str, str, float, Callable]] = [
    ("D1", "context engineering", 1.0, d1_context),
    ("D2", "spec & traceability", 1.5, d2_spec_trace),
    ("D3", "verification & gates", 1.5, d3_verify_gates),
    ("D4", "review / maker != checker", 1.0, d4_review),
    ("D5", "loop & orchestration", 1.0, d5_loop),
    ("D6", "memory & knowledge", 1.0, d6_memory),
    ("D7", "portability & tooling", 1.0, d7_portability),
    ("D8", "proof & observability", 0.5, d8_proof),
]
LIFECYCLE_GATED = {"D3", "D8"}  # capped until UI/code lands


def _tier(pct: float) -> str:
    for ceiling, name in TIERS:
        if pct <= ceiling:
            return name
    return TIERS[-1][1]


def measure() -> Dict[str, object]:
    s = _signals()
    dims: Dict[str, Dict[str, object]] = {}
    weighted = 0.0
    max_weighted = 0.0
    for key, name, weight, detector in DIMENSIONS:
        level, evidence = detector(s)
        weighted += level * weight
        max_weighted += 4 * weight
        dims[key] = {
            "name": name,
            "weight": weight,
            "level": level,
            "evidence": evidence,
            "lifecycle_gated": key in LIFECYCLE_GATED,
        }
    pct = round(weighted / max_weighted * 100) if max_weighted else 0
    return {
        "generated_by": "harness/scripts/check_maturity.py",
        "scale": "0-4 enforcement ladder (L0 absent .. L4 optimizing)",
        "pre_code": not bool(s["has_code"]),
        "score_pct": pct,
        "tier": _tier(pct),
        "weighted": round(weighted, 2),
        "weighted_max": round(max_weighted, 2),
        "dimensions": dims,
    }


def check() -> List[str]:
    """Ratchet: list regressions vs the committed baseline (empty == OK)."""
    current = measure()
    if not BASELINE.exists():
        return []  # nothing to ratchet against yet
    try:
        base = json.loads(_read(BASELINE))
    except json.JSONDecodeError as exc:
        return [f"baseline is unreadable: {exc}"]
    problems: List[str] = []
    base_dims = base.get("dimensions", {})
    for key, dim in current["dimensions"].items():
        was = base_dims.get(key, {}).get("level")
        now = dim["level"]
        if isinstance(was, int) and now < was:
            problems.append(
                f"{key} {dim['name']}: regressed L{was} -> L{now} ({dim['evidence']})"
            )
    if current["score_pct"] < base.get("score_pct", 0):
        problems.append(
            f"overall maturity dropped {base.get('score_pct')}% -> {current['score_pct']}%"
        )
    return problems


def _print_summary(m: Dict[str, object]) -> None:
    print(f"agentic maturity: {m['score_pct']}%  [{m['tier']}]"
          f"  ({m['weighted']}/{m['weighted_max']} weighted)")
    if m["pre_code"]:
        print("  note: pre-code repo — D3/D8 are lifecycle-gated (cannot reach L3 until UI/tests land)")
    for key, dim in m["dimensions"].items():  # type: ignore[union-attr]
        gate = " · gated" if dim["lifecycle_gated"] else ""
        print(f"  {key} L{dim['level']}  {dim['name']}{gate}")
        print(f"       {dim['evidence']}")


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Score agentic-engineering harness maturity.")
    parser.add_argument("--json", action="store_true", help="emit the measurement as JSON")
    parser.add_argument("--check", action="store_true", help="CI ratchet: fail if below baseline")
    parser.add_argument("--update-baseline", action="store_true", help="write the current measurement to the baseline")
    args = parser.parse_args(argv)

    m = measure()

    if args.update_baseline:
        BASELINE.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"maturity: baseline written to {BASELINE.relative_to(PROJECT_ROOT)} "
              f"({m['score_pct']}% [{m['tier']}]).")
        return 0

    if args.json:
        print(json.dumps(m, indent=2, ensure_ascii=False))
        return 0

    if args.check:
        problems = check()
        _print_summary(m)
        if not BASELINE.exists():
            print("maturity: no baseline yet — run with --update-baseline to create one.")
            return 0
        if problems:
            print(f"\nmaturity: {len(problems)} regression(s) vs baseline:")
            for problem in problems:
                print(f"  - {problem}")
            return 1
        print("\nmaturity: no regression vs baseline.")
        return 0

    _print_summary(m)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
