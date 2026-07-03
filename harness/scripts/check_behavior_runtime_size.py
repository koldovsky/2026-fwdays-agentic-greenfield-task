#!/usr/bin/env python3
"""NFR-046 / AD-031 gate: the Blockly behavior runtime stays finite and rule-agnostic.

The editor renders block *structure* from metadata projections (G_palette/G_toolbox, AD-026);
only block *behavior* JSON cannot express — a custom field + the dynamic-arity / raw-preserving
structural blocks — is code, in @transon/editor-blockly. AD-031/NFR-046 require this runtime to
**not grow per rule**: a new rule rides entirely on metadata + projections and touches NOTHING
here; only a genuinely new interaction primitive may. This gate makes that binding with two
checks (``traceability.md``):

1. **Rule-agnostic** — no rule name appears as a **dispatch literal** (``case 'attr'``,
   ``=== 'map'``) in the runtime source. (A rule name as an ordinary identifier substring — e.g.
   ``getValue``, ``'value' in options`` — is fine; only dispatch on a rule name is a per-rule
   branch.)
2. **Finite** — the number of registered interaction primitives (custom fields + mutators +
   extensions) is bounded by a ceiling and equals the declared ``BEHAVIOR_PRIMITIVES`` list, so
   the runtime cannot silently accrete per-rule handlers.

Pure stdlib, Python 3.9+. Run::

  python harness/scripts/check_behavior_runtime_size.py
  python harness/scripts/check_behavior_runtime_size.py --selftest

Exit 0 when clean, 1 otherwise.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path
from typing import List

REPO = Path(__file__).resolve().parents[2]
RUNTIME_DIR = REPO / "packages" / "editor-blockly" / "src"
SNAPSHOT = REPO / "docs" / "metadata-snapshot.json"

# Only a genuinely new interaction primitive may raise this — never a per-rule handler. Bump
# deliberately (with review) if a new structural widget is added; the runtime is rule-agnostic,
# so it must never grow with the catalog.
PRIMITIVE_CEILING = 8

_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
_REGISTER = re.compile(r"\b(?:registerMutator|registerExtension)\s*\(|fieldRegistry\.register\s*\(")


def _strip_comments(text: str) -> str:
    text = _BLOCK_COMMENT.sub(lambda m: "\n" * m.group(0).count("\n"), text)
    return "\n".join(re.sub(r"//.*", "", line) for line in text.splitlines())


def _ts_sources(root: Path) -> List[Path]:
    return sorted(root.rglob("*.ts")) if root.exists() else []


def _dispatch_patterns(rule: str) -> List["re.Pattern[str]"]:
    q = re.escape(rule)
    return [
        re.compile(rf"case\s+['\"]{q}['\"]"),
        re.compile(rf"['\"]{q}['\"]\s*[=!]==?"),
        re.compile(rf"[=!]==?\s*['\"]{q}['\"]"),
    ]


def scan_rule_dispatch(root: Path, rules: List[str]) -> List[str]:
    """Flag a rule name used as a dispatch literal (the fingerprint of a per-rule branch)."""
    problems: List[str] = []
    pats = {r: _dispatch_patterns(r) for r in rules}
    for path in _ts_sources(root):
        text = _strip_comments(path.read_text(encoding="utf-8"))
        for lineno, line in enumerate(text.splitlines(), 1):
            for rule, patterns in pats.items():
                if any(p.search(line) for p in patterns):
                    try:
                        rel = path.relative_to(REPO)
                    except ValueError:
                        rel = path.name
                    problems.append(f"{rel}:{lineno}: rule '{rule}' used as a dispatch literal — "
                                    f"the behavior runtime must stay rule-agnostic (NFR-046): {line.strip()}")
    return problems


def count_primitives(root: Path) -> int:
    return sum(len(_REGISTER.findall(_strip_comments(p.read_text(encoding="utf-8")))) for p in _ts_sources(root))


def declared_primitives(root: Path) -> int:
    """Length of the BEHAVIOR_PRIMITIVES array (the runtime's honest self-declaration)."""
    for path in _ts_sources(root):
        text = path.read_text(encoding="utf-8")
        m = re.search(r"BEHAVIOR_PRIMITIVES\s*=\s*\[(.*?)\]", text, re.DOTALL)
        if m:
            return len(re.findall(r"['\"][^'\"]+['\"]", m.group(1)))
    return -1


def check() -> List[str]:
    rules = [r["name"] for r in json.loads(SNAPSHOT.read_text(encoding="utf-8"))["catalog"]["rules"]]
    problems = scan_rule_dispatch(RUNTIME_DIR, rules)
    registered = count_primitives(RUNTIME_DIR)
    declared = declared_primitives(RUNTIME_DIR)
    if registered > PRIMITIVE_CEILING:
        problems.append(f"behavior runtime registers {registered} interaction primitives, over the "
                        f"ceiling {PRIMITIVE_CEILING} (NFR-046 — the runtime must not grow per rule)")
    if declared != -1 and registered != declared:
        problems.append(f"BEHAVIOR_PRIMITIVES declares {declared} primitives but {registered} are "
                        f"registered — the declared list must be honest (NFR-046)")
    return problems


def _selftest() -> int:
    rules = ["attr", "map", "value"]
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        root.mkdir(exist_ok=True)
        (root / "ok.ts").write_text(
            "const v = options['value'];\nblock.appendValueInput('ITEM0');\n"
            "fieldRegistry.register('f', F);\nregisterMutator('m', M);\n"
            "export const BEHAVIOR_PRIMITIVES = ['f', 'm'];\n",
            encoding="utf-8",
        )
        assert not scan_rule_dispatch(root, rules), "false-positived an ordinary identifier/value-key use"
        assert count_primitives(root) == 2, count_primitives(root)
        assert declared_primitives(root) == 2, declared_primitives(root)
        (root / "bad.ts").write_text("switch (rule) { case 'attr': return 1; }\nif (t === 'map') {}\n", encoding="utf-8")
        probs = scan_rule_dispatch(root, rules)
        assert any("attr" in p for p in probs) and any("map" in p for p in probs), probs
    print("check_behavior_runtime_size selftest: OK")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        return _selftest()
    problems = check()
    if problems:
        print("check_behavior_runtime_size: FAIL", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1
    print(f"check_behavior_runtime_size: clean (rule-agnostic; {count_primitives(RUNTIME_DIR)} fixed primitives).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
