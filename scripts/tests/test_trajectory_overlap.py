#!/usr/bin/env python3
"""Gate self-tests for scripts/check-trajectory's cross-slice overlap policy.

These lock in the entry-point-vs-ownership distinction added to check-trajectory:
sharing an allowlisted entry-point/aggregation file is normal additive participation
(reported, not failed), while two slices co-editing the same business-logic module is a
real ownership conflict (a violation). The additive safeguard flags a pure-deletion edit
to a co-owned entry point. Pure stdlib (unittest) so CI runs it without extra deps.

Run: python -m unittest discover -s scripts/tests -p 'test_*.py'
"""

from __future__ import annotations

import importlib.machinery
import importlib.util
import unittest
from pathlib import Path

# Load the extension-less gate script as a module (SourceFileLoader handles the missing
# .py suffix; importing it does not run main(), which is guarded by __name__ == __main__).
_SCRIPT = Path(__file__).resolve().parent.parent / "check-trajectory"
_loader = importlib.machinery.SourceFileLoader("check_trajectory", str(_SCRIPT))
_spec = importlib.util.spec_from_loader("check_trajectory", _loader)
assert _spec is not None
ct = importlib.util.module_from_spec(_spec)
_loader.exec_module(ct)

AL = ct.ENTRY_POINT_ALLOWLIST


def model(slice_id: str, code_paths: list[str], line_delta: dict | None = None) -> dict:
    return {"id": slice_id, "code_paths": code_paths, "line_delta": line_delta or {}}


class AllowlistShapeTest(unittest.TestCase):
    def test_allowlist_is_the_four_documented_entry_points(self) -> None:
        # Guard against accidental broadening of the allowlist (it must stay small).
        self.assertEqual(
            AL,
            frozenset(
                {
                    "backend/app/main.py",
                    "backend/app/models/__init__.py",
                    "frontend/src/api.ts",
                    "frontend/src/App.tsx",
                }
            ),
        )


class ClassifyCrossSliceTest(unittest.TestCase):
    def test_entry_point_sharing_is_allowed_not_a_conflict(self) -> None:
        # The exact slice-001/002 case: both register a router in main.py, additively.
        a = model("001", ["backend/app/main.py", "backend/app/api/auth.py"],
                  {"backend/app/main.py": (10, 0)})
        b = model("002", ["backend/app/main.py", "backend/app/api/categories.py"],
                  {"backend/app/main.py": (3, 0)})
        conflicts, entry_shared, non_additive = ct.classify_cross_slice([a, b], AL)
        self.assertEqual(conflicts, [])
        self.assertEqual(entry_shared, [("001", "002", ["backend/app/main.py"])])
        self.assertEqual(non_additive, [])

    def test_business_logic_overlap_is_a_conflict(self) -> None:
        a = model("001", ["backend/app/services/timer.py"])
        b = model("002", ["backend/app/services/timer.py"])
        conflicts, entry_shared, non_additive = ct.classify_cross_slice([a, b], AL)
        self.assertEqual(conflicts, [("001", "002", ["backend/app/services/timer.py"])])
        self.assertEqual(entry_shared, [])
        self.assertEqual(non_additive, [])

    def test_mixed_sharing_separates_conflict_from_entry_point(self) -> None:
        shared_delta = {"backend/app/main.py": (5, 0)}
        a = model("001", ["backend/app/main.py", "backend/app/services/timer.py"], shared_delta)
        b = model("002", ["backend/app/main.py", "backend/app/services/timer.py"], shared_delta)
        conflicts, entry_shared, non_additive = ct.classify_cross_slice([a, b], AL)
        self.assertEqual(conflicts, [("001", "002", ["backend/app/services/timer.py"])])
        self.assertEqual(entry_shared, [("001", "002", ["backend/app/main.py"])])
        self.assertEqual(non_additive, [])

    def test_pure_deletion_on_co_owned_entry_point_is_flagged(self) -> None:
        a = model("001", ["frontend/src/api.ts"], {"frontend/src/api.ts": (40, 0)})
        # Slice 002 strips lines from api.ts without adding any -> not additive.
        b = model("002", ["frontend/src/api.ts"], {"frontend/src/api.ts": (0, 7)})
        conflicts, entry_shared, non_additive = ct.classify_cross_slice([a, b], AL)
        self.assertEqual(conflicts, [])
        self.assertEqual(entry_shared, [("001", "002", ["frontend/src/api.ts"])])
        self.assertIn(("002", "frontend/src/api.ts"), non_additive)

    def test_additive_modify_passes(self) -> None:
        # Extending an __all__ list is (added>=1, deleted>=1): additive, must pass.
        a = model("001", ["backend/app/models/__init__.py"],
                  {"backend/app/models/__init__.py": (8, 0)})
        b = model("002", ["backend/app/models/__init__.py"],
                  {"backend/app/models/__init__.py": (2, 1)})
        conflicts, entry_shared, non_additive = ct.classify_cross_slice([a, b], AL)
        self.assertEqual(non_additive, [])

    def test_single_slice_entry_point_is_never_flagged(self) -> None:
        # Additive safeguard only applies to files co-owned by >= 2 slices.
        a = model("001", ["backend/app/main.py"], {"backend/app/main.py": (0, 3)})
        conflicts, entry_shared, non_additive = ct.classify_cross_slice([a], AL)
        self.assertEqual((conflicts, entry_shared, non_additive), ([], [], []))

    def test_no_sharing_yields_nothing(self) -> None:
        a = model("001", ["backend/app/api/auth.py"])
        b = model("002", ["backend/app/api/categories.py"])
        self.assertEqual(ct.classify_cross_slice([a, b], AL), ([], [], []))


class ParseNumstatTest(unittest.TestCase):
    def test_parses_counts_and_treats_binary_as_zero(self) -> None:
        out = "12\t3\tbackend/app/main.py\n-\t-\tassets/logo.png\n"
        parsed = ct._parse_numstat(out)
        self.assertEqual(parsed["backend/app/main.py"], (12, 3))
        self.assertEqual(parsed["assets/logo.png"], (0, 0))

    def test_skips_renames_and_malformed_lines(self) -> None:
        out = "1\t1\t{a => b}/x.py\ngarbage line\n4\t0\tfrontend/src/api.ts\n"
        parsed = ct._parse_numstat(out)
        self.assertNotIn("{a => b}/x.py", parsed)
        self.assertEqual(parsed["frontend/src/api.ts"], (4, 0))


if __name__ == "__main__":
    unittest.main()
