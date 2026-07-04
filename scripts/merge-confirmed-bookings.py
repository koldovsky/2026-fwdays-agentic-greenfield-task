#!/usr/bin/env python3
"""Merge confirmed booking records into a store file (upsert by runId)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def load(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise SystemExit(f"{path}: expected JSON array")
    return [x for x in data if isinstance(x, dict)]


def upsert(into: list[dict[str, Any]], items: list[dict[str, Any]]) -> None:
    by_run: dict[str, dict[str, Any]] = {
        b["runId"]: b for b in into if isinstance(b.get("runId"), str)
    }
    for item in items:
        run_id = item.get("runId")
        if not run_id:
            continue
        by_run[run_id] = item
    into.clear()
    into.extend(sorted(by_run.values(), key=lambda b: (b.get("date", ""), b.get("slot", ""))))


def main() -> None:
    if len(sys.argv) < 3:
        print("usage: merge-confirmed-bookings.py <target.json> <merge.json> [merge.json ...]", file=sys.stderr)
        raise SystemExit(2)

    target = Path(sys.argv[1])
    merged = load(target)
    for arg in sys.argv[2:]:
        upsert(merged, load(Path(arg)))

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(merged)} confirmed booking(s) to {target}")


if __name__ == "__main__":
    main()
