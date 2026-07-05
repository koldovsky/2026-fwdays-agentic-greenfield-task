#!/usr/bin/env python3
"""Outer-loop drift watcher (M-08) — propose-only.

Runs the repo's **read-only** deterministic gates on a schedule (or on demand) and emits a Markdown
*proposal* of any drift it finds. It catches the drift the inner loop (pre-commit / PR CI) cannot see,
because it accumulates with **no change open**: the engine moves out from under the committed metadata
snapshot, a cross-doc link rots, the maturity ratchet slips.

**Propose-only — it never writes the repo, commits, or merges.** It reads, runs the gates, and prints a
report. Exit code: ``0`` clean, ``2`` drift found (a *proposal*, not a build break), ``1`` watcher error.
The scheduled workflow turns a ``2`` into an opened/updated issue; locally it just prints.

Usage::

    python harness/automations/drift_watch.py            # print report to stdout
    python harness/automations/drift_watch.py --out r.md # also write the report to a file (still no repo writes)
"""
import argparse
import subprocess
import sys
from pathlib import Path
from typing import List, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# (label, argv) — every command is read-only; none mutates the repo.
GATES: List[Tuple[str, List[str]]] = [
    ("traceability", ["harness/scripts/check_traceability.py"]),
    ("markdown links", ["harness/scripts/check_links.py"]),
    ("engine parity", ["harness/scripts/check_engine_parity.py"]),
    ("metadata snapshot", ["harness/scripts/update_memory.py", "--check"]),
    ("maturity ratchet", ["harness/scripts/check_maturity.py", "--check"]),
]


# Sentinel returncode for "the watcher itself failed to run the gate" — distinct from any
# gate exit code, so build_report() can keep watcher errors (exit 1) apart from drift (exit 2).
WATCHER_ERROR = -1


def _run(argv: List[str]) -> Tuple[int, str]:
    try:
        r = subprocess.run(
            [sys.executable, *argv], cwd=PROJECT_ROOT,
            capture_output=True, text=True, timeout=180,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return WATCHER_ERROR, f"watcher could not run {argv[0]}: {exc}"
    return r.returncode, (r.stdout + r.stderr).strip()


def _tail(text: str, n: int = 6) -> str:
    lines = [ln for ln in text.splitlines() if ln.strip()]
    return "\n".join(lines[-n:])


def build_report() -> Tuple[int, str]:
    """Return (exit_code, markdown_report)."""
    drift: List[str] = []
    watcher_errors: List[str] = []
    rows: List[str] = []
    for label, argv in GATES:
        code, out = _run(argv)
        if code == WATCHER_ERROR:
            status = "❌ watcher error"
            watcher_errors.append(label)
        elif code != 0:
            status = "⚠️ drift"
            drift.append(label)
        else:
            status = "✅ clean"
        rows.append(f"### {status} — {label}\n\n```\n{_tail(out) or '(no output)'}\n```")

    if not drift and not watcher_errors:
        header = "# Drift watch — clean ✅\n\nAll read-only gates pass; no accumulated drift detected."
        return 0, header + "\n\n" + "\n\n".join(rows)

    if not drift:
        header = (
            "# Drift watch — watcher error ❌\n\n"
            f"**{len(watcher_errors)} gate(s) could not run:** {', '.join(watcher_errors)}. "
            "This is a watcher problem (missing interpreter/script/timeout), not repo drift — "
            "no gate reported drift among those that did run."
        )
        return 1, header + "\n\n" + "\n\n".join(rows)

    header = (
        "# Drift watch — proposal ⚠️\n\n"
        f"**{len(drift)} gate(s) report drift:** {', '.join(drift)}. This is a *proposal* for a human "
        "to reconcile — the watcher changes nothing. Likely fixes:\n\n"
        "- **engine parity / metadata snapshot** → the engine moved: re-pin with "
        "`python harness/scripts/update_memory.py --snapshot` and review the diff.\n"
        "- **traceability** → an ID/citation/“done” row is inconsistent (`check_traceability.py`).\n"
        "- **markdown links** → a relative link/anchor broke (`check_links.py`).\n"
        "- **maturity ratchet** → a dimension regressed vs `docs/maturity-baseline.json`.\n\n"
        "Pipe a gate name to `harness/automations/ci_triage.py` for the targeted remedy."
    )
    if watcher_errors:
        header += f"\n\n**Also {len(watcher_errors)} gate(s) could not run (watcher error):** {', '.join(watcher_errors)}."
    return 2, header + "\n\n" + "\n\n".join(rows)


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Propose-only outer-loop drift watcher (M-08).")
    ap.add_argument("--out", type=Path, help="also write the report here (no repo content is touched)")
    args = ap.parse_args(argv)

    code, report = build_report()
    print(report)
    if args.out:
        args.out.write_text(report + "\n", encoding="utf-8")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
