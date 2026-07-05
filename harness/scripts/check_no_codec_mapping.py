#!/usr/bin/env python3
"""FR-126 / AD-032 repo-scan: no hand-written codec↔workspace mapping layer.

The codec emits/consumes Blockly workspace-serialization JSON **directly**, via the
metadata-projected, engine-executed artifacts — there is no editor-defined intermediate
representation and no TypeScript module that maps codec artifacts to/from a
``{type, inputs, fields}`` block structure (SPEC FR-126, ARCHITECTURE AD-032).

The signature of the forbidden mapping is a module that **walks workspace blocks in
TypeScript** — i.e. reads the block-structure members ``.inputs`` / ``.fields`` /
``.extraState`` (or ``.block`` off an input) to translate them. The sanctioned projection
(``codegen.ts``, AD-026) only *constructs* generator templates as data (``inputs:`` /
``fields:`` object keys) and runs them through the host engine; it never reads those members
off codec data. The runtime (``run.ts``) only hands artifacts to the engine. So the scan flags
**member access**, not object-literal keys.

Pure stdlib, Python 3.9+, no project imports. Run:

  python harness/scripts/check_no_codec_mapping.py          # scan packages/*/src
  python harness/scripts/check_no_codec_mapping.py --selftest  # prove it catches a violation

Exit 0 when clean, 1 otherwise. Also importable: ``scan(root)`` returns the list of problems.
"""
from __future__ import annotations

import re
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

# Reads of the workspace block-structure fields — the fingerprint of a module that walks blocks
# to translate them. Object-literal keys (`inputs:`) are NOT reads, so they don't match. Covers
# dot access (`b.inputs`), bracket access (`b['inputs']` / `b["inputs"]`), and destructuring
# (`const { inputs, fields } = b`) so the gate can't be evaded by access style.
_FIELDS = r"inputs|extraState|fields"
MAPPING_ACCESS = re.compile(
    rf"\.(?:{_FIELDS})\b"                         # b.inputs
    rf"|\[\s*['\"](?:{_FIELDS})['\"]\s*\]"         # b['inputs'] / b["inputs"]
    rf"|(?:const|let|var)\s*\{{[^}}]*\b(?:{_FIELDS})\b[^}}]*\}}\s*="  # const { inputs } = b
)
# A line-comment prefix to ignore (the scan is intentionally simple; comments may mention them).
COMMENT = re.compile(r"^\s*(//|\*|/\*)")


def scan(root: Path) -> list[str]:
    """Return a list of FR-126 violations (member access of block-structure fields in src)."""
    problems: list[str] = []
    for pkg_src in sorted(root.glob("packages/*/src")):
        for ts in sorted(pkg_src.rglob("*.ts")):
            for lineno, line in enumerate(ts.read_text(encoding="utf-8").splitlines(), 1):
                if COMMENT.match(line):
                    continue
                if MAPPING_ACCESS.search(line):
                    rel = ts.relative_to(root)
                    problems.append(f"{rel}:{lineno}: codec↔workspace mapping access — {line.strip()}")
    return problems


def _selftest() -> int:
    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        src = root / "packages" / "demo" / "src"
        src.mkdir(parents=True)
        # Planted hand-written codecs in three access styles — all must be flagged.
        (src / "bad_dot.ts").write_text(
            "export function f(b) { return b.fields.VALUE ?? b.inputs.NAME.block; }\n", encoding="utf-8")
        (src / "bad_bracket.ts").write_text(
            "export function g(b) { return b['inputs'].NAME ?? b[\"fields\"].VALUE; }\n", encoding="utf-8")
        (src / "bad_destructure.ts").write_text(
            "export function h(b) { const { inputs, fields } = b; return inputs ?? fields; }\n", encoding="utf-8")
        bad = scan(root)
        if not (any("bad_dot" in p for p in bad) and any("bad_bracket" in p for p in bad)
                and any("bad_destructure" in p for p in bad)):
            print(f"selftest FAILED: not all access styles caught: {bad}")
            return 1
        # A clean projection-style file — must NOT be flagged (keys, not member access).
        (src / "ok.ts").write_text(
            "export const thenBlock = { type: 'x', inputs: { NAME: {} }, fields: { VALUE: 1 } };\n",
            encoding="utf-8",
        )
        clean_after = [p for p in scan(root) if "ok.ts" in p]
        if not bad:
            print("selftest FAILED: planted violation not caught")
            return 1
        if clean_after:
            print(f"selftest FAILED: projection-style construction wrongly flagged: {clean_after}")
            return 1
    print("selftest OK: scanner flags a hand-written codec, ignores projection construction.")
    return 0


def main(argv: list[str]) -> int:
    if "--selftest" in argv:
        return _selftest()
    problems = scan(REPO)
    if problems:
        print("FR-126 violation — hand-written codec↔workspace mapping found in packages/*/src:")
        for p in problems:
            print(f"  - {p}")
        print("The codec must emit/consume workspace JSON via the projected artifacts (AD-032).")
        return 1
    print("no-codec-mapping: clean (no codec↔workspace mapping layer under packages/*/src).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
