#!/usr/bin/env python3
"""Broken-link checker for the repo's Markdown.

Validates every *relative* Markdown link `[text](target)` in `.md` / `.mdc`
files — the kind a path-moving refactor silently breaks:

1. **File targets** — `[x](../docs/foo.md)` must resolve to an existing file or
   directory (relative to the linking file).
2. **Anchors** — `[x](#heading)` or `[x](foo.md#heading)` must match a heading in
   the target file, using GitHub's slug algorithm (lowercase, drop punctuation,
   spaces → hyphens, de-duplicate with `-1`, `-2`, …).

External links (`http(s)://`, `mailto:`) are skipped — checking those needs the
network and is non-deterministic. Pure stdlib, Python 3.9+. Run:

  python harness/scripts/check_links.py

Exit 0 when all links resolve, 1 otherwise. Also importable: `check()` returns
the list of problems (used by the pre-commit hook / CI).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Dict, List, Set

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
SKIP_DIRS = {".git", "__pycache__", "node_modules", ".turbo", "dist"}
MD_GLOBS = ("*.md", "*.mdc")
LINK_RE = re.compile(r"\[[^\]]*\]\(\s*([^)]+?)\s*\)")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
EXTERNAL = ("http://", "https://", "mailto:", "tel:")


def _markdown_files() -> List[Path]:
    files: List[Path] = []
    for pattern in MD_GLOBS:
        for path in PROJECT_ROOT.rglob(pattern):
            if not any(part in SKIP_DIRS for part in path.parts):
                files.append(path)
    return files


def _slug(heading: str) -> str:
    """GitHub-style anchor slug for a heading's visible text."""
    text = re.sub(r"`[^`]*`", lambda m: m.group(0).strip("`"), heading)  # keep code text
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)                  # link text only
    text = re.sub(r"[*_~]", "", text)                                    # strip emphasis
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)               # drop punctuation
    text = text.replace(" ", "-")
    return text


def _anchors(text: str) -> Set[str]:
    seen: Dict[str, int] = {}
    out: Set[str] = set()
    for line in text.splitlines():
        m = HEADING_RE.match(line)
        if not m:
            continue
        base = _slug(m.group(2))
        if base in seen:
            seen[base] += 1
            out.add(f"{base}-{seen[base]}")
        else:
            seen[base] = 0
            out.add(base)
    return out


def _clean_target(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("<") and raw.endswith(">"):
        raw = raw[1:-1]
    # drop an optional link title:  path "Title"
    if " " in raw and ('"' in raw or "'" in raw):
        raw = raw.split(" ", 1)[0]
    return raw


def check() -> List[str]:
    problems: List[str] = []
    files = _markdown_files()
    if not files:
        return ["no markdown files found — is the repo intact?"]
    anchor_cache: Dict[Path, Set[str]] = {}

    for f in files:
        text = f.read_text(encoding="utf-8", errors="ignore")
        rel = f.relative_to(PROJECT_ROOT)
        for m in LINK_RE.finditer(text):
            target = _clean_target(m.group(1))
            if not target or target.startswith(EXTERNAL):
                continue

            path_part, _, anchor = target.partition("#")

            # Resolve the target file (or the linking file itself for in-page anchors).
            if path_part:
                dest = (f.parent / path_part).resolve()
                if not dest.exists():
                    problems.append(f"{rel}: broken link → {target} (no such file)")
                    continue
            else:
                dest = f  # in-page anchor

            # Validate the anchor against the destination's headings (markdown only).
            if anchor and dest.is_file() and dest.suffix in (".md", ".mdc"):
                if dest not in anchor_cache:
                    anchor_cache[dest] = _anchors(
                        dest.read_text(encoding="utf-8", errors="ignore")
                    )
                if anchor.lower() not in anchor_cache[dest]:
                    problems.append(f"{rel}: broken anchor → {target} (no heading '#{anchor}')")

    return sorted(problems)


def main() -> int:
    problems = check()
    if problems:
        print(f"links: {len(problems)} broken link(s):")
        for problem in problems:
            print(f"  - {problem}")
        return 1
    print(f"links: all relative markdown links resolve ({len(_markdown_files())} files scanned).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
