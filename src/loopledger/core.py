"""Core data operations for LoopLedger."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, MutableMapping, Union

Project = Dict[str, Any]
PRACTICE_KINDS = ("context", "loop", "verification", "checker", "sdd")
REQUIRED_EVIDENCE = {
    "context": "Add context-engineering evidence, such as AGENTS.md or rules.",
    "loop": "Record at least one build loop or loop-engineering practice.",
    "verification": "Record tests, evals, or another verification check.",
    "checker": "Record maker/checker separation or an explicit review pass.",
    "sdd": "Record spec-first evidence or a decision explaining why SDD is small.",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def new_project(name: str, problem: str = "", owner: str = "") -> Project:
    if not name.strip():
        raise ValueError("Project name is required.")
    return {
        "schema": "loopledger.v1",
        "project": {
            "name": name.strip(),
            "problem": problem.strip(),
            "owner": owner.strip(),
            "created_at": utc_now(),
        },
        "practices": [],
        "cycles": [],
        "checks": [],
        "decisions": [],
    }


PathLike = Union[str, Path]


def load_project(path: PathLike) -> Project:
    with Path(path).open("r", encoding="utf-8") as handle:
        project = json.load(handle)
    if project.get("schema") != "loopledger.v1":
        raise ValueError("Unsupported or missing LoopLedger schema.")
    _ensure_lists(project)
    return project


def save_project(project: Project, path: PathLike) -> None:
    _ensure_lists(project)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with Path(path).open("w", encoding="utf-8") as handle:
        json.dump(project, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def add_practice(project: MutableMapping[str, Any], kind: str, evidence: str, note: str = "") -> None:
    if kind not in PRACTICE_KINDS:
        allowed = ", ".join(PRACTICE_KINDS)
        raise ValueError(f"Unknown practice kind '{kind}'. Expected one of: {allowed}.")
    if not evidence.strip():
        raise ValueError("Practice evidence is required.")
    project.setdefault("practices", []).append(
        {
            "kind": kind,
            "evidence": evidence.strip(),
            "note": note.strip(),
            "recorded_at": utc_now(),
        }
    )


def add_cycle(
    project: MutableMapping[str, Any],
    goal: str,
    maker: str,
    checker: str,
    verification: str,
    status: str = "done",
) -> None:
    required = {"goal": goal, "maker": maker, "checker": checker, "verification": verification}
    missing = [name for name, value in required.items() if not value.strip()]
    if missing:
        raise ValueError(f"Missing cycle fields: {', '.join(missing)}.")
    project.setdefault("cycles", []).append(
        {
            "goal": goal.strip(),
            "maker": maker.strip(),
            "checker": checker.strip(),
            "verification": verification.strip(),
            "status": status.strip() or "done",
            "recorded_at": utc_now(),
        }
    )


def add_check(
    project: MutableMapping[str, Any],
    name: str,
    command: str,
    status: str,
    evidence: str = "",
) -> None:
    if not name.strip() or not command.strip() or not status.strip():
        raise ValueError("Check name, command, and status are required.")
    normalized_status = status.strip().lower()
    if normalized_status not in {"pass", "fail", "skipped"}:
        raise ValueError("Check status must be pass, fail, or skipped.")
    project.setdefault("checks", []).append(
        {
            "name": name.strip(),
            "command": command.strip(),
            "status": normalized_status,
            "evidence": evidence.strip(),
            "recorded_at": utc_now(),
        }
    )


def add_decision(project: MutableMapping[str, Any], title: str, reason: str, consequence: str) -> None:
    if not title.strip() or not reason.strip():
        raise ValueError("Decision title and reason are required.")
    project.setdefault("decisions", []).append(
        {
            "title": title.strip(),
            "reason": reason.strip(),
            "consequence": consequence.strip(),
            "recorded_at": utc_now(),
        }
    )


def audit_project(project: MutableMapping[str, Any]) -> Dict[str, Any]:
    _ensure_lists(project)
    practice_kinds = {practice.get("kind") for practice in project["practices"]}
    has_context = "context" in practice_kinds
    has_loop = "loop" in practice_kinds or bool(project["cycles"])
    has_verification = "verification" in practice_kinds or bool(project["checks"])
    has_checker = "checker" in practice_kinds or any(cycle.get("checker") for cycle in project["cycles"])
    has_sdd = "sdd" in practice_kinds or bool(project["decisions"])
    evidence = {
        "context": has_context,
        "loop": has_loop,
        "verification": has_verification,
        "checker": has_checker,
        "sdd": has_sdd,
    }
    missing = [message for key, message in REQUIRED_EVIDENCE.items() if not evidence[key]]
    failed_checks = [check for check in project["checks"] if check.get("status") == "fail"]
    passed_checks = [check for check in project["checks"] if check.get("status") == "pass"]
    return {
        "complete": not missing and not failed_checks,
        "score": sum(1 for present in evidence.values() if present),
        "max_score": len(evidence),
        "evidence": evidence,
        "missing": missing,
        "passed_checks": passed_checks,
        "failed_checks": failed_checks,
    }


def render_markdown_report(project: MutableMapping[str, Any]) -> str:
    _ensure_lists(project)
    audit = audit_project(project)
    meta = project.get("project", {})
    lines: List[str] = [
        f"# {meta.get('name', 'LoopLedger Project')} Evidence Report",
        "",
        f"- Owner: {meta.get('owner') or 'not recorded'}",
        f"- Problem: {meta.get('problem') or 'not recorded'}",
        f"- Evidence score: {audit['score']}/{audit['max_score']}",
        f"- Status: {'complete' if audit['complete'] else 'needs attention'}",
        "",
    ]
    _append_table(
        lines,
        "Practices",
        ["Kind", "Evidence", "Note"],
        ((p.get("kind", ""), p.get("evidence", ""), p.get("note", "")) for p in project["practices"]),
    )
    _append_table(
        lines,
        "Cycles",
        ["Goal", "Maker", "Checker", "Verification", "Status"],
        (
            (
                c.get("goal", ""),
                c.get("maker", ""),
                c.get("checker", ""),
                c.get("verification", ""),
                c.get("status", ""),
            )
            for c in project["cycles"]
        ),
    )
    _append_table(
        lines,
        "Checks",
        ["Name", "Command", "Status", "Evidence"],
        (
            (c.get("name", ""), c.get("command", ""), c.get("status", ""), c.get("evidence", ""))
            for c in project["checks"]
        ),
    )
    _append_table(
        lines,
        "Decisions",
        ["Title", "Reason", "Consequence"],
        (
            (d.get("title", ""), d.get("reason", ""), d.get("consequence", ""))
            for d in project["decisions"]
        ),
    )
    if audit["missing"]:
        lines.extend(["## Missing Evidence", ""])
        lines.extend(f"- {item}" for item in audit["missing"])
        lines.append("")
    if audit["failed_checks"]:
        lines.extend(["## Failed Checks", ""])
        lines.extend(f"- {check['name']}: {check['evidence']}" for check in audit["failed_checks"])
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def _append_table(lines: List[str], title: str, headers: List[str], rows: Iterable[Iterable[str]]) -> None:
    row_list = [tuple(_clean_cell(cell) for cell in row) for row in rows]
    lines.extend([f"## {title}", ""])
    if not row_list:
        lines.extend(["No records yet.", ""])
        return
    lines.append("| " + " | ".join(headers) + " |")
    lines.append("| " + " | ".join("---" for _ in headers) + " |")
    for row in row_list:
        lines.append("| " + " | ".join(row) + " |")
    lines.append("")


def _clean_cell(value: Any) -> str:
    return str(value).replace("\n", " ").replace("|", "\\|").strip()


def _ensure_lists(project: MutableMapping[str, Any]) -> None:
    for key in ("practices", "cycles", "checks", "decisions"):
        project.setdefault(key, [])
