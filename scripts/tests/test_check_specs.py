#!/usr/bin/env python3
"""Gate self-tests for scripts/check-specs (spec hygiene + seam gate).

Lock in the three deterministic rules: an id has exactly one owning anchor, every
claimed id exists in the registry, and a ratified change carries no textually open
question (each numbered Open-questions item needs a Resolution marker). Pure stdlib
(unittest) so CI runs it without extra deps.

Run: python -m unittest discover -s scripts/tests -p 'test_*.py'
"""

from __future__ import annotations

import importlib.machinery
import importlib.util
import unittest
from pathlib import Path

_SCRIPT = Path(__file__).resolve().parent.parent / "check-specs"
_loader = importlib.machinery.SourceFileLoader("check_specs", str(_SCRIPT))
_spec = importlib.util.spec_from_loader("check_specs", _loader)
assert _spec is not None
cs = importlib.util.module_from_spec(_spec)
_loader.exec_module(cs)


class FakeSpec:
    """Duck-typed stand-in for _harness.Spec (only the fields check-specs reads)."""

    def __init__(self, slice_id: str, covered_ids: list[str]) -> None:
        self.slice_id = slice_id
        self.covered_ids = covered_ids


class DualClaimTest(unittest.TestCase):
    def test_disjoint_claims_are_clean(self) -> None:
        specs = [FakeSpec("001", ["FR-AUTH-01"]), FakeSpec("002", ["FR-CAT-01"])]
        self.assertEqual(cs.find_dual_claims(specs), {})

    def test_shared_id_is_a_dual_claim(self) -> None:
        # The real incident: 004's anchor listing FR-AUTH-07 inside Requirements
        # covered produced MULTI:001+004 in check-trajectory.
        specs = [
            FakeSpec("001", ["FR-AUTH-01", "FR-AUTH-07"]),
            FakeSpec("004", ["FR-METR-01", "FR-AUTH-07"]),
        ]
        self.assertEqual(cs.find_dual_claims(specs), {"FR-AUTH-07": ["001", "004"]})

    def test_three_way_claim_lists_all_owners(self) -> None:
        specs = [FakeSpec(s, ["NFR-SEC-01"]) for s in ("001", "002", "003")]
        self.assertEqual(
            cs.find_dual_claims(specs), {"NFR-SEC-01": ["001", "002", "003"]}
        )


class UnknownIdTest(unittest.TestCase):
    KNOWN = {"FR-AUTH-01", "FR-CAT-01"}

    def test_known_ids_are_clean(self) -> None:
        specs = [FakeSpec("001", ["FR-AUTH-01"]), FakeSpec("002", ["FR-CAT-01"])]
        self.assertEqual(cs.find_unknown_ids(specs, self.KNOWN), {})

    def test_a_typo_id_is_reported_for_its_slice(self) -> None:
        specs = [FakeSpec("002", ["FR-CAT-01", "FR-CATS-01"])]
        self.assertEqual(
            cs.find_unknown_ids(specs, self.KNOWN), {"002": ["FR-CATS-01"]}
        )


class OpenQuestionTest(unittest.TestCase):
    def test_no_open_questions_section_is_clean(self) -> None:
        self.assertEqual(cs.find_unresolved_open_questions("## Context\ntext\n"), [])

    def test_resolved_items_are_clean(self) -> None:
        text = (
            "## Open questions\n\n"
            "1. **Default period.**\n   **Resolution (2026-07-11):** month.\n"
            "2. **Cardinality.**\n   Resolved: top 5.\n"
        )
        self.assertEqual(cs.find_unresolved_open_questions(text), [])

    def test_an_item_without_resolution_is_reported_by_title(self) -> None:
        text = (
            "## Open questions\n\n"
            "1. **Default period.**\n   **Resolution:** month.\n"
            "2. **Stop while paused.** Does the trailing span become a row?\n"
        )
        unresolved = cs.find_unresolved_open_questions(text)
        self.assertEqual(len(unresolved), 1)
        self.assertIn("Stop while paused", unresolved[0])

    def test_section_boundary_stops_at_next_heading(self) -> None:
        # A "Resolution" mention in a LATER section must not excuse an open item.
        text = (
            "## Open questions\n\n"
            "1. **Orphaned seam.** Who writes the column?\n\n"
            "## Notes\nResolution lives elsewhere.\n"
        )
        unresolved = cs.find_unresolved_open_questions(text)
        self.assertEqual(len(unresolved), 1)
        self.assertIn("Orphaned seam", unresolved[0])


class AnchorParsingTest(unittest.TestCase):
    def test_status_and_change_link_are_extracted(self) -> None:
        text = (
            "# 004 - Metrics\n\n- **Status:** ratified (owner-approved)\n"
            "See [add-metrics](../../openspec/changes/add-metrics/proposal.md).\n"
        )
        self.assertEqual(cs.anchor_status_and_change(text), ("ratified", "add-metrics"))

    def test_missing_fields_degrade_to_unknown_none(self) -> None:
        self.assertEqual(cs.anchor_status_and_change("# bare\n"), ("unknown", None))


if __name__ == "__main__":
    unittest.main()
