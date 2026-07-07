"""A tiny deterministic eval for LoopLedger report quality."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from loopledger.core import audit_project, load_project, render_markdown_report


def main() -> int:
    fixture = ROOT / "examples" / "agentic-homework.loopledger.json"
    project = load_project(fixture)
    audit = audit_project(project)
    report = render_markdown_report(project)

    expectations = [
        (audit["complete"], "example ledger should contain all required evidence"),
        ("AGENTS.md" in report, "report should mention context evidence"),
        ("maker/checker" in report.lower(), "report should mention maker/checker evidence"),
        ("python -m unittest discover -s tests" in report, "report should include test command"),
        ("Evidence score: 5/5" in report, "report should show a perfect evidence score"),
    ]
    failures = [message for ok, message in expectations if not ok]
    if failures:
        print("LoopLedger eval failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print("LoopLedger eval passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
