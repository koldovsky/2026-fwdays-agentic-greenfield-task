import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from loopledger.cli import main
from loopledger.core import (
    add_check,
    add_cycle,
    add_decision,
    add_practice,
    audit_project,
    new_project,
    render_markdown_report,
)


class LoopLedgerTests(unittest.TestCase):
    def test_new_project_contains_empty_evidence_lists(self):
        project = new_project("Demo", problem="Track a tiny build", owner="Yaroslav Tanko")

        self.assertEqual(project["schema"], "loopledger.v1")
        self.assertEqual(project["project"]["name"], "Demo")
        self.assertEqual(project["practices"], [])
        self.assertEqual(project["cycles"], [])
        self.assertEqual(project["checks"], [])
        self.assertEqual(project["decisions"], [])

    def test_audit_reports_missing_evidence(self):
        project = new_project("Demo")

        audit = audit_project(project)

        self.assertFalse(audit["complete"])
        self.assertEqual(audit["score"], 0)
        self.assertEqual(len(audit["missing"]), 5)

    def test_audit_passes_when_all_required_evidence_is_present(self):
        project = new_project("Demo")
        add_practice(project, "context", "AGENTS.md documents static and dynamic context.")
        add_practice(project, "loop", "Spec -> make -> verify -> check loop recorded.")
        add_practice(project, "verification", "Unit tests and evals run locally.")
        add_practice(project, "checker", "Separate checker review documented.")
        add_decision(project, "Spec-first scope", "Small CLI is enough for the homework.", "Avoided UI.")
        add_cycle(
            project,
            goal="Create audit command",
            maker="Codex implementation pass",
            checker="Separate review pass",
            verification="python -m unittest discover -s tests",
        )
        add_check(project, "unit tests", "python -m unittest discover -s tests", "pass", "All tests pass.")

        audit = audit_project(project)

        self.assertTrue(audit["complete"])
        self.assertEqual(audit["score"], 5)
        self.assertEqual(audit["failed_checks"], [])

    def test_failed_check_keeps_audit_incomplete(self):
        project = new_project("Demo")
        add_practice(project, "context", "AGENTS.md")
        add_practice(project, "loop", "Loop recorded.")
        add_practice(project, "verification", "Tests run.")
        add_practice(project, "checker", "Review run.")
        add_practice(project, "sdd", "Spec written.")
        add_check(project, "eval", "python evals/evaluate.py", "fail", "Fixture missing.")

        audit = audit_project(project)

        self.assertFalse(audit["complete"])
        self.assertEqual(len(audit["failed_checks"]), 1)

    def test_markdown_report_contains_evidence_tables(self):
        project = new_project("Demo", problem="Show process.")
        add_practice(project, "context", "AGENTS.md", "Static rules.")
        add_cycle(project, "Build CLI", "maker", "checker", "unit tests")

        report = render_markdown_report(project)

        self.assertIn("# Demo Evidence Report", report)
        self.assertIn("| context | AGENTS.md | Static rules. |", report)
        self.assertIn("| Build CLI | maker | checker | unit tests | done |", report)

    def test_cli_creates_and_reports_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ledger.json"
            report_path = Path(tmp) / "report.md"

            with redirect_stdout(io.StringIO()):
                self.assertEqual(main(["new", str(path), "--name", "CLI Demo"]), 0)
                self.assertEqual(
                    main(
                        [
                            "practice",
                            str(path),
                            "--kind",
                            "context",
                            "--evidence",
                            "AGENTS.md",
                        ]
                    ),
                    0,
                )
                self.assertEqual(main(["report", str(path), "--output", str(report_path)]), 0)

            data = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(data["project"]["name"], "CLI Demo")
            self.assertIn("AGENTS.md", report_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
