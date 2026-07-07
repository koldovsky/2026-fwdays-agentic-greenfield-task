"""Command-line interface for LoopLedger."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable, Optional

from .core import (
    PRACTICE_KINDS,
    add_check,
    add_cycle,
    add_decision,
    add_practice,
    audit_project,
    load_project,
    new_project,
    render_markdown_report,
    save_project,
)


def main(argv: Optional[Iterable[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    try:
        return args.func(args)
    except (OSError, ValueError) as exc:
        print(f"loopledger: {exc}", file=sys.stderr)
        return 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Track agentic engineering evidence.")
    subcommands = parser.add_subparsers(required=True)

    new_cmd = subcommands.add_parser("new", help="Create a new evidence ledger.")
    new_cmd.add_argument("path", help="Path to the JSON ledger.")
    new_cmd.add_argument("--name", required=True, help="Project name.")
    new_cmd.add_argument("--problem", default="", help="Problem the project solves.")
    new_cmd.add_argument("--owner", default="", help="Project owner.")
    new_cmd.set_defaults(func=cmd_new)

    practice_cmd = subcommands.add_parser("practice", help="Record an agentic practice.")
    add_path_arg(practice_cmd)
    practice_cmd.add_argument("--kind", required=True, choices=PRACTICE_KINDS)
    practice_cmd.add_argument("--evidence", required=True)
    practice_cmd.add_argument("--note", default="")
    practice_cmd.set_defaults(func=cmd_practice)

    cycle_cmd = subcommands.add_parser("cycle", help="Record a make/check loop.")
    add_path_arg(cycle_cmd)
    cycle_cmd.add_argument("--goal", required=True)
    cycle_cmd.add_argument("--maker", required=True)
    cycle_cmd.add_argument("--checker", required=True)
    cycle_cmd.add_argument("--verification", required=True)
    cycle_cmd.add_argument("--status", default="done")
    cycle_cmd.set_defaults(func=cmd_cycle)

    check_cmd = subcommands.add_parser("check", help="Record a verification check.")
    add_path_arg(check_cmd)
    check_cmd.add_argument("--name", required=True)
    check_cmd.add_argument("--command", required=True)
    check_cmd.add_argument("--status", required=True, choices=("pass", "fail", "skipped"))
    check_cmd.add_argument("--evidence", default="")
    check_cmd.set_defaults(func=cmd_check)

    decision_cmd = subcommands.add_parser("decision", help="Record an SDD-style decision.")
    add_path_arg(decision_cmd)
    decision_cmd.add_argument("--title", required=True)
    decision_cmd.add_argument("--reason", required=True)
    decision_cmd.add_argument("--consequence", default="")
    decision_cmd.set_defaults(func=cmd_decision)

    report_cmd = subcommands.add_parser("report", help="Render a Markdown report.")
    add_path_arg(report_cmd)
    report_cmd.add_argument("--output", "-o", help="Write report to this path.")
    report_cmd.set_defaults(func=cmd_report)

    audit_cmd = subcommands.add_parser("audit", help="Audit required evidence.")
    add_path_arg(audit_cmd)
    audit_cmd.add_argument("--strict", action="store_true", help="Exit non-zero when evidence is incomplete.")
    audit_cmd.set_defaults(func=cmd_audit)
    return parser


def add_path_arg(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("path", help="Path to the JSON ledger.")


def cmd_new(args: argparse.Namespace) -> int:
    project = new_project(name=args.name, problem=args.problem, owner=args.owner)
    save_project(project, args.path)
    print(f"Created {args.path}")
    return 0


def cmd_practice(args: argparse.Namespace) -> int:
    project = load_project(args.path)
    add_practice(project, args.kind, args.evidence, args.note)
    save_project(project, args.path)
    print(f"Recorded {args.kind} practice")
    return 0


def cmd_cycle(args: argparse.Namespace) -> int:
    project = load_project(args.path)
    add_cycle(project, args.goal, args.maker, args.checker, args.verification, args.status)
    save_project(project, args.path)
    print("Recorded cycle")
    return 0


def cmd_check(args: argparse.Namespace) -> int:
    project = load_project(args.path)
    add_check(project, args.name, args.command, args.status, args.evidence)
    save_project(project, args.path)
    print(f"Recorded {args.status} check")
    return 0


def cmd_decision(args: argparse.Namespace) -> int:
    project = load_project(args.path)
    add_decision(project, args.title, args.reason, args.consequence)
    save_project(project, args.path)
    print("Recorded decision")
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    project = load_project(args.path)
    report = render_markdown_report(project)
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(report, encoding="utf-8")
        print(f"Wrote {args.output}")
    else:
        print(report, end="")
    return 0


def cmd_audit(args: argparse.Namespace) -> int:
    project = load_project(args.path)
    audit = audit_project(project)
    print(f"Evidence score: {audit['score']}/{audit['max_score']}")
    if audit["complete"]:
        print("Status: complete")
        return 0
    print("Status: needs attention")
    for missing in audit["missing"]:
        print(f"- {missing}")
    for check in audit["failed_checks"]:
        print(f"- Failed check: {check['name']}")
    return 1 if args.strict else 0


if __name__ == "__main__":
    raise SystemExit(main())
