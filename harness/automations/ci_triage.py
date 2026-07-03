#!/usr/bin/env python3
"""CI-triage helper (M-08) — propose-only.

Given a failing gate name (or a CI log on stdin), print the likely cause and the **exact** command to
reproduce/fix it locally. It does not read the repo state or change anything — it is a static lookup
from gate → remedy, so it is safe to run anywhere (a CI failure step, a chat, a hook).

Usage::

    python harness/automations/ci_triage.py engine-parity
    gh run view --log | python harness/automations/ci_triage.py        # sniff the log for known gates
"""
import sys
from typing import List, Optional, Tuple

# (match-substrings, title, cause, fix-command)
REMEDIES: List[Tuple[Tuple[str, ...], str, str, str]] = [
    (("traceab",), "Traceability drift",
     "An ID cited in code/tests or docs/traceability.md isn't defined in the contract, or a 'done' "
     "FR/AC has no citing test.",
     "python harness/scripts/check_traceability.py"),
    (("link",), "Broken markdown link",
     "A relative file or #anchor link no longer resolves (often a moved/renamed doc or a changed heading).",
     "python harness/scripts/check_links.py"),
    (("parity", "engine"), "Engine/spec drift",
     "The editor catalog (SPEC §14 + derived) diverged from the engine get_editor_metadata() export, "
     "or the export shape changed.",
     "TRANSON_REPO=../transon python harness/scripts/check_engine_parity.py"),
    (("snapshot", "metadata", "update_memory", "update-memory"), "Stale metadata snapshot",
     "docs/metadata-snapshot.json drifted from the engine export (the engine moved since it was pinned).",
     "TRANSON_REPO=../transon python harness/scripts/update_memory.py --snapshot   # then review the diff"),
    (("matur", "ratchet"), "Maturity regression",
     "A dimension dropped below docs/maturity-baseline.json — a gate/adapter/hook was weakened or removed.",
     "python harness/scripts/check_maturity.py        # see which dimension fell, then restore it"),
    (("eval", "parity:", "maker", "checker"), "Harness golden-path / cross-tool parity failure",
     "An agent/command/skill/workflow exists on one tool but not the other, a read-only role gained "
     "write tools, the cost tier collapsed, or an adapter referenced the other tool.",
     "python harness/evals/run_evals.py"),
    (("commit-msg", "refs:", "slice:", "trailer"), "Missing commit trailer",
     "A code-touching commit lacks a Refs:/Slice: trailer.",
     "git commit --amend   # add e.g. 'Refs: FR-035' or 'Slice: <name>'"),
]


def triage(text: str) -> List[str]:
    t = text.lower()
    hits = []
    for needles, title, cause, fix in REMEDIES:
        if any(n in t for n in needles):
            hits.append(f"## {title}\n\n**Cause.** {cause}\n\n**Reproduce / fix.**\n\n```bash\n{fix}\n```")
    return hits


def main(argv: Optional[List[str]] = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    source = " ".join(argv) if argv else sys.stdin.read()
    if not source.strip():
        print("ci_triage: pass a gate name (e.g. `engine-parity`) or pipe a CI log on stdin.", file=sys.stderr)
        return 1
    hits = triage(source)
    if not hits:
        print("ci_triage: no known gate matched. Run the full suite locally:\n"
              "  python harness/scripts/check_traceability.py && python harness/scripts/check_links.py && \\\n"
              "  python harness/evals/run_evals.py && python harness/scripts/check_maturity.py --check")
        return 0
    print("# CI triage — proposed remedies\n\n" + "\n\n".join(hits))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
