#!/usr/bin/env python3
"""Engine-parity (anti-drift) checker for the Transon Visual Editor.

Asserts the rule / operator / function catalog declared in ``docs/SPEC.md`` §14 matches
the actual Transon engine, and that the engine's projection-ready editor-metadata export
(M0, ``metadata-contract.md`` §3) is internally consistent with the contract the editor
projections consume. The editor must never hand-maintain a catalog that drifts from the
engine (SPEC AD-012, NFR-004, §21.4).

It performs four checks (``traceability.md`` "Engine-parity checks"):

1. **Rule / operator / function name parity** — the SPEC §14 catalog == the engine catalog.
   ``switch``/``cond`` are first-class rules (SPEC §14.16), checked like any other.
2. **Metadata-export parity** — the export has the contract shape (``metadata_version``, a
   split ``catalog`` / ``docs`` payload, per-rule ``name``/``params``/``variants``, per-param
   ``kind``) — ``metadata-contract.md`` §3, §2.7.
3. **Variant-signature parity** — every rule carries well-formed pre-derived ``variants``
   (``metadata-contract.md`` §2.5): each variant has an ``id`` and ``params`` flagged
   ``required``, drawn from the rule's own params.
4. **Resolved-enum parity** — ``expr.op`` ``options`` == the engine operator tokens and
   ``call.name`` ``options`` == the engine function names (``metadata-contract.md`` §2.6).

Engine resolution order:
1. ``transon`` importable in the current environment;
2. a sibling checkout at ``../transon`` (or ``$TRANSON_REPO``).

If the engine cannot be imported, the check is **skipped** (exit 0) so the harness is
usable before the engine is wired in; make it required in CI once the engine is available.
It prefers the engine's ``get_editor_metadata()`` export (M0); if that export is absent it
falls back to ``Transformer.get_rules/get_operators/get_functions`` for name parity only
(the export-dependent checks 2-4 are skipped with a note).

Pure stdlib, Python 3.9+. Run:

  python harness/scripts/check_engine_parity.py
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
SPEC = PROJECT_ROOT / "docs" / "SPEC.md"
BACKTICK = re.compile(r"`([^`]+)`")

# Tokens that appear in §14 prose but are rule names, not operators/functions.
NON_OPERATOR_TOKENS = {"expr"}
NON_FUNCTION_TOKENS = {"call"}


def _section(text: str, start: str, end: str) -> str:
    start_idx = text.find(start)
    if start_idx == -1:
        return ""
    end_idx = text.find(end, start_idx + len(start))
    return text[start_idx: end_idx if end_idx != -1 else len(text)]


def spec_catalog() -> Tuple[Set[str], Set[str], Set[str], List[str]]:
    problems: List[str] = []
    text = SPEC.read_text(encoding="utf-8", errors="ignore")

    fr040 = re.search(r"\*\*FR-040\*\*(.*?)- \*\*FR-", text, re.DOTALL)
    rules = set(BACKTICK.findall(fr040.group(1))) if fr040 else set()
    if not rules:
        problems.append("could not parse the rule list from FR-040 in docs/SPEC.md")

    operators = set(BACKTICK.findall(_section(text, "### 14.14", "### 14.15"))) - NON_OPERATOR_TOKENS
    if not operators:
        problems.append("could not parse operators from docs/SPEC.md §14.14")

    functions = set(BACKTICK.findall(_section(text, "### 14.15", "### 14.16"))) - NON_FUNCTION_TOKENS
    if not functions:
        problems.append("could not parse functions from docs/SPEC.md §14.15")

    return rules, operators, functions, problems


def _ensure_engine_importable() -> bool:
    try:
        import transon  # noqa: F401
        return True
    except ImportError:
        pass
    candidates = [os.environ.get("TRANSON_REPO"), str(PROJECT_ROOT.parent / "transon")]
    for candidate in candidates:
        if candidate and (Path(candidate) / "transon" / "__init__.py").exists():
            sys.path.insert(0, candidate)
            try:
                import transon  # noqa: F401
                return True
            except ImportError:
                continue
    return False


def _load_export() -> Optional[dict]:
    """Return the projection-ready editor-metadata export, or ``None`` if unavailable.

    Lives in the ``transon.metadata`` module (mirroring ``transon.docs.get_all_docs``);
    it is intentionally not re-exported from the package root.
    """
    try:
        from transon.metadata import get_editor_metadata  # type: ignore
    except Exception:
        return None
    try:
        meta = get_editor_metadata()
    except Exception:
        return None
    return meta if isinstance(meta, dict) else None


def _operator_tokens(operators) -> Set[str]:
    tokens: Set[str] = set()
    for op in operators:
        if op.get("name"):
            tokens.add(op["name"])
        if op.get("alternative"):
            tokens.add(op["alternative"])
    return tokens


class EngineCatalog:
    """The engine's catalog, sourced from the export when present."""

    def __init__(self, rules, operators, functions, *, export: Optional[dict]):
        self.rules = rules            # list of rule dicts ({"name", "params", "variants", ...})
        self.operators = operators    # list of operator dicts
        self.functions = functions    # list of function dicts
        self.export = export          # full export dict, or None if from fallback

    @property
    def from_export(self) -> bool:
        return self.export is not None

    def rule_names(self) -> Set[str]:
        return {r["name"] for r in self.rules}

    def operator_tokens(self) -> Set[str]:
        return _operator_tokens(self.operators)

    def function_names(self) -> Set[str]:
        return {fn["name"] for fn in self.functions}


def engine_catalog() -> Optional[EngineCatalog]:
    if not _ensure_engine_importable():
        return None
    export = _load_export()
    if export is not None and isinstance(export.get("catalog"), dict):
        catalog = export["catalog"]
        return EngineCatalog(
            catalog.get("rules", []),
            catalog.get("operators", []),
            catalog.get("functions", []),
            export=export,
        )
    # Fallback: no projection-ready export — name parity only (checks 2-4 skipped).
    from transon import Transformer
    rules = [{"name": r.__rule_name__} for r in Transformer.get_rules()]
    return EngineCatalog(
        rules,
        list(Transformer.get_operators()),
        list(Transformer.get_functions()),
        export=None,
    )


def _diff(label: str, spec: Set[str], engine: Set[str]) -> List[str]:
    problems: List[str] = []
    for missing in sorted(engine - spec):
        problems.append(f"{label}: `{missing}` exists in the engine but is missing from docs/SPEC.md")
    for extra in sorted(spec - engine):
        problems.append(f"{label}: `{extra}` is in docs/SPEC.md but not in the engine")
    return problems


def check_export_shape(export: dict) -> List[str]:
    """Metadata-export parity: the export matches the contract shape (§3, §2.7)."""
    problems: List[str] = []
    if not export.get("metadata_version"):
        problems.append("export: missing `metadata_version` (metadata-contract §5)")
    catalog = export.get("catalog")
    if not isinstance(catalog, dict):
        problems.append("export: missing split `catalog` payload (metadata-contract §2.7)")
        return problems
    if not isinstance(export.get("docs"), dict):
        problems.append("export: missing split `docs` payload (metadata-contract §2.7)")
    for key in ("rules", "operators", "functions"):
        if not isinstance(catalog.get(key), list):
            problems.append(f"export: `catalog.{key}` is missing or not a list")
    for rule in catalog.get("rules", []):
        name = rule.get("name", "<unnamed>")
        for field in ("name", "params", "variants"):
            if field not in rule:
                problems.append(f"export: rule `{name}` is missing `{field}` (metadata-contract §2.1)")
        for param in rule.get("params", []):
            if param.get("kind") not in ("dynamic", "constant"):
                problems.append(
                    f"export: rule `{name}` param `{param.get('name')}` has invalid `kind`"
                    f" {param.get('kind')!r} (metadata-contract §2.2)"
                )
    return problems


def check_variant_signatures(catalog_rules: List[dict]) -> List[str]:
    """Variant-signature parity: well-formed pre-derived variants (§2.5)."""
    problems: List[str] = []
    for rule in catalog_rules:
        name = rule.get("name", "<unnamed>")
        param_names = {p.get("name") for p in rule.get("params", [])}
        variants = rule.get("variants")
        if not variants:
            problems.append(f"variants: rule `{name}` has no pre-derived variant signatures (§2.5)")
            continue
        for variant in variants:
            if "id" not in variant:
                problems.append(f"variants: rule `{name}` has a variant with no `id` (§2.5)")
            for vp in variant.get("params", []):
                if vp.get("name") not in param_names:
                    problems.append(
                        f"variants: rule `{name}` variant `{variant.get('id')}` references unknown"
                        f" param `{vp.get('name')}` (§2.5)"
                    )
                if not isinstance(vp.get("required"), bool):
                    problems.append(
                        f"variants: rule `{name}` variant `{variant.get('id')}` param"
                        f" `{vp.get('name')}` is missing a boolean `required` flag (§2.5)"
                    )
    return problems


def check_resolved_enums(catalog: EngineCatalog) -> List[str]:
    """Resolved-enum parity: expr.op / call.name options == engine catalogs (§2.6)."""
    problems: List[str] = []
    expected = {
        ("expr", "op"): catalog.operator_tokens(),
        ("call", "name"): catalog.function_names(),
    }
    seen: Set[Tuple[str, str]] = set()
    for rule in catalog.rules:
        rule_name = rule.get("name")
        for param in rule.get("params", []):
            key = (rule_name, param.get("name"))
            if key not in expected:
                continue
            seen.add(key)
            options = set(param.get("options") or [])
            if options != expected[key]:
                missing = sorted(expected[key] - options)
                extra = sorted(options - expected[key])
                detail = []
                if missing:
                    detail.append(f"missing {missing}")
                if extra:
                    detail.append(f"extra {extra}")
                problems.append(
                    f"resolved-enum: `{rule_name}.{param.get('name')}` options drift ("
                    + "; ".join(detail) + ") (§2.6)"
                )
    for key in expected:
        if key not in seen:
            problems.append(
                f"resolved-enum: expected a resolved `options` domain on `{key[0]}.{key[1]}`"
                " but none was emitted (§2.6)"
            )
    return problems


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Check editor↔engine catalog parity.")
    parser.add_argument(
        "--require-engine",
        action="store_true",
        help="fail (exit 1) instead of skipping when the transon engine is not importable (M-09). "
        "CI flips this on once M0 makes the engine installable, so parity can never silently no-op.",
    )
    args = parser.parse_args(argv)

    spec_rules, spec_operators, spec_functions, parse_problems = spec_catalog()
    if parse_problems:
        print("engine-parity: spec parsing problems:")
        for problem in parse_problems:
            print(f"  - {problem}")
        return 1

    catalog = engine_catalog()
    if catalog is None:
        message = (
            "transon engine not importable "
            "(install a pinned transon or set TRANSON_REPO=../transon)."
        )
        if args.require_engine:
            print(f"engine-parity: FAILED — {message} --require-engine is set, so this is an error.")
            return 1
        print(f"engine-parity: skipped — {message} Run with --require-engine to make it binding.")
        return 0

    problems = (
        _diff("rule", spec_rules, catalog.rule_names())
        + _diff("operator", spec_operators, catalog.operator_tokens())
        + _diff("function", spec_functions, catalog.function_names())
    )

    notes: List[str] = []
    if catalog.from_export:
        problems += check_export_shape(catalog.export)
        problems += check_variant_signatures(catalog.rules)
        problems += check_resolved_enums(catalog)
    else:
        notes.append(
            "engine has no get_editor_metadata() export — export/variant/enum checks skipped "
            "(name parity only). Make the export required once M0 lands."
        )

    if problems:
        print(f"engine-parity: {len(problems)} drift(s) between docs/SPEC.md / the contract and the engine:")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    for note in notes:
        print(f"engine-parity: note — {note}")
    source = "export" if catalog.from_export else "introspection (no export)"
    print(
        "engine-parity: consistent "
        f"({len(catalog.rule_names())} rules, {len(catalog.operator_tokens())} operator "
        f"tokens, {len(catalog.function_names())} functions; source: {source})."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
