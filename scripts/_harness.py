"""Shared helpers for the deterministic verification harness.

Pure Python standard library, no third-party imports, no LLM calls. Every helper
here is deterministic: identical repo state yields identical output (no timestamps,
no wall-clock, sorted collections, POSIX-style relative paths). The gate scripts in
this directory (``gate-slice``, ``check-traceability``, ``check-trajectory``,
``check-eval-ratchet``) import this module; keep it dependency-free so the scripts
run on a bare Python install in CI.

Exit-code convention shared by every gate script:
    0  ok / green
    1  a check failed (coverage drop, traceability gap, process violation, ...)
    2  usage or environment error (bad args, missing input file, tool absent)
    3  staleness: a committed generated artifact does not match a fresh regenerate
"""

from __future__ import annotations

import ast
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

# Exit codes (see module docstring).
EXIT_OK = 0
EXIT_CHECK_FAILED = 1
EXIT_USAGE = 2
EXIT_STALE = 3

# A requirement id: FR-AUTH-01, NFR-SEC-02, TC-STACK-01, BC-COURSE-01.
REQ_ID_RE = re.compile(r"\b((?:FR|NFR|TC|BC)-[A-Z]+-\d{2})\b")
REQ_ID_PARTS_RE = re.compile(r"^(FR|NFR|TC|BC)-([A-Z]+)-(\d{2})$")
# A @trace annotation inside a test docstring / comment: "@trace FR-AUTH-01".
TRACE_RE = re.compile(r"@trace\s+((?:FR|NFR|TC|BC)-[A-Z]+-\d{2})")
# A NNN-slug spec filename, e.g. 001-auth-email.md.
SPEC_FILE_RE = re.compile(r"^(\d{3})-[a-z0-9-]+\.md$")


def repo_root() -> Path:
    """Repo root = the directory that holds AGENTS.md (this file lives in scripts/)."""
    here = Path(__file__).resolve().parent
    for candidate in (here.parent, *here.parents):
        if (candidate / "AGENTS.md").is_file():
            return candidate
    # Fallback: parent of scripts/.
    return here.parent


def rel(path: Path, root: Path | None = None) -> str:
    """POSIX-style path relative to the repo root (stable across OSes for diffs)."""
    root = root or repo_root()
    try:
        return path.resolve().relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def venv_python(root: Path | None = None) -> str:
    """Path to the backend venv interpreter, or the current one as a fallback.

    The harness prefers ``backend/.venv`` because that is where ruff, mypy, pytest,
    and coverage are installed by ``scripts/verify.*``; falls back to ``sys.executable``
    so a caller that already runs inside the right environment still works.
    """
    root = root or repo_root()
    candidates = [
        root / "backend" / ".venv" / "Scripts" / "python.exe",  # Windows
        root / "backend" / ".venv" / "bin" / "python",          # POSIX
    ]
    for c in candidates:
        if c.is_file():
            return str(c)
    return sys.executable


# --------------------------------------------------------------------------- #
# Subprocess helpers
# --------------------------------------------------------------------------- #

@dataclass
class Proc:
    code: int
    out: str
    err: str


def capture(cmd: list[str], cwd: Path | None = None, env: dict[str, str] | None = None) -> Proc:
    """Run ``cmd`` capturing stdout/stderr. Never raises on non-zero exit."""
    full_env = {**os.environ, **(env or {})}
    p = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        env=full_env,
        capture_output=True,
        text=True,
    )
    return Proc(p.returncode, p.stdout, p.stderr)


def stream(cmd: list[str], cwd: Path | None = None, env: dict[str, str] | None = None) -> int:
    """Run ``cmd`` inheriting stdio (live output). Returns the exit code."""
    full_env = {**os.environ, **(env or {})}
    return subprocess.run(cmd, cwd=str(cwd) if cwd else None, env=full_env).returncode


def git(root: Path, *args: str) -> Proc:
    return capture(["git", "-C", str(root), *args])


# --------------------------------------------------------------------------- #
# Advisory DB-test lock (serializes test runs on the shared Postgres)
# --------------------------------------------------------------------------- #
# Process coordination, not artifact generation - exempt from the module's
# determinism rule. Multiple sessions/worktrees share one Postgres on :5432, and
# the autouse test cleanups are not concurrency-safe (see the slice-002 trace,
# STAGE 2 incident). Holders: gate-slice (blocking wait) and the stop-verify
# hook (non-blocking; skips politely when busy).

def db_lock_path() -> Path:
    """Machine-wide advisory lock file for DB-touching test runs."""
    import tempfile
    return Path(tempfile.gettempdir()) / "cadence-dbtests-5432.lock"


def try_acquire_db_lock(stale_after_s: int = 1800) -> bool:
    """Non-blocking best-effort acquire. True = acquired (caller must release).

    A lock file older than ``stale_after_s`` is treated as leaked by a dead
    process and reclaimed; a fresh one means another test run is active.
    """
    import time
    path = db_lock_path()
    for _ in range(2):  # second pass only after reclaiming a stale lock
        try:
            fd = os.open(str(path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            with os.fdopen(fd, "w") as fh:
                fh.write(str(os.getpid()))
            return True
        except FileExistsError:
            try:
                if time.time() - path.stat().st_mtime > stale_after_s:
                    path.unlink()
                    continue
            except OSError:
                pass
            return False
    return False


def release_db_lock() -> None:
    try:
        db_lock_path().unlink()
    except OSError:
        pass


# --------------------------------------------------------------------------- #
# Requirement / spec / trace parsing
# --------------------------------------------------------------------------- #

@dataclass
class Requirement:
    id: str
    prefix: str        # FR | NFR | TC | BC
    capability: str    # AUTH, SEC, TIMER, ...
    number: int
    status: str        # proposed | accepted | shipped | dropped
    order: int         # document order in requirements.md (stable sort key)


def parse_requirements(root: Path | None = None) -> dict[str, Requirement]:
    """Parse the FR/NFR/TC/BC tables in docs/requirements.md.

    Returns id -> Requirement, ordered by first appearance in the document so that
    generated matrices diff cleanly against the source of truth.
    """
    root = root or repo_root()
    doc = root / "docs" / "requirements.md"
    reqs: dict[str, Requirement] = {}
    if not doc.is_file():
        return reqs
    order = 0
    row_re = re.compile(
        r"^\|\s*((?:FR|NFR|TC|BC)-[A-Z]+-\d{2})\s*\|.*\|\s*([A-Za-z]+)\s*\|\s*$"
    )
    for line in doc.read_text(encoding="utf-8").splitlines():
        m = row_re.match(line)
        if not m:
            continue
        rid, status = m.group(1), m.group(2).strip().lower()
        parts = REQ_ID_PARTS_RE.match(rid)
        if not parts:
            continue
        if rid in reqs:
            continue
        reqs[rid] = Requirement(
            id=rid,
            prefix=parts.group(1),
            capability=parts.group(2),
            number=int(parts.group(3)),
            status=status,
            order=order,
        )
        order += 1
    return reqs


def _section_body(text: str, heading_substr: str) -> str:
    """Return the body of the first ``##``/``###`` section whose heading contains
    ``heading_substr`` (case-insensitive), up to the next same-or-higher heading."""
    lines = text.splitlines()
    start = None
    start_level = 0
    for i, line in enumerate(lines):
        hm = re.match(r"^(#{2,6})\s+(.*)$", line)
        if hm and heading_substr.lower() in hm.group(2).lower():
            start = i + 1
            start_level = len(hm.group(1))
            break
    if start is None:
        return ""
    body: list[str] = []
    for line in lines[start:]:
        hm = re.match(r"^(#{1,6})\s+", line)
        if hm and len(hm.group(1)) <= start_level:
            break
        body.append(line)
    return "\n".join(body)


@dataclass
class Spec:
    slice_id: str            # "001"
    path: Path
    covered_ids: list[str]   # ids under "Requirements covered"
    out_of_scope_ids: list[str]


def parse_specs(root: Path | None = None) -> list[Spec]:
    """Parse docs/specs/NNN-*.md files.

    "Covered" ids are taken only from a *Requirements covered* section (falling back
    to the whole document minus the *Out of scope* section if that heading is absent),
    with any id that appears under *Out of scope* removed. This keeps a slice from
    claiming coverage of requirements it explicitly defers (e.g. spec 001 defers the
    OAuth FR-AUTH-04/05 to slice 009).
    """
    root = root or repo_root()
    specs_dir = root / "docs" / "specs"
    specs: list[Spec] = []
    if not specs_dir.is_dir():
        return specs
    for path in sorted(specs_dir.glob("*.md")):
        m = SPEC_FILE_RE.match(path.name)
        if not m:
            continue  # TEMPLATE.md, README.md, etc. are not slices
        text = path.read_text(encoding="utf-8")
        oos_body = _section_body(text, "Out of scope")
        out_ids = _ordered_unique(REQ_ID_RE.findall(oos_body))

        covered_body = _section_body(text, "Requirements covered")
        if not covered_body:
            # No explicit section: treat the doc (minus Out of scope) as the claim set.
            covered_body = text.replace(oos_body, "")
        covered = [rid for rid in _ordered_unique(REQ_ID_RE.findall(covered_body))
                   if rid not in out_ids]
        specs.append(
            Spec(slice_id=m.group(1), path=path, covered_ids=covered, out_of_scope_ids=out_ids)
        )
    return specs


def _ordered_unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for it in items:
        if it not in seen:
            seen.add(it)
            result.append(it)
    return result


@dataclass
class TraceIndex:
    # requirement id -> sorted list of "relpath::testname" that carry @trace <id>
    by_id: dict[str, list[str]] = field(default_factory=dict)


def parse_trace_tests(root: Path | None = None) -> TraceIndex:
    """Scan test files for ``@trace <ID>`` annotations.

    Prefers an AST walk so each annotation is attributed to the enclosing ``test_*``
    function (module docstrings map to ``<module>``). Falls back to a raw-text scan so
    a ``@trace`` in a plain comment is still counted (attributed to the file).
    """
    root = root or repo_root()
    idx: dict[str, set[str]] = {}
    test_files: list[Path] = []
    backend_tests = root / "backend" / "tests"
    if backend_tests.is_dir():
        test_files += sorted(backend_tests.rglob("*.py"))
    frontend_src = root / "frontend" / "src"
    if frontend_src.is_dir():
        # Future-proofing: pick up @trace in frontend test/comment files if any appear.
        for pat in ("*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx"):
            test_files += sorted(frontend_src.rglob(pat))

    for path in test_files:
        relpath = rel(path, root)
        text = path.read_text(encoding="utf-8")
        attributed: set[str] = set()

        if path.suffix == ".py":
            try:
                tree = ast.parse(text)
            except SyntaxError:
                tree = None
            if tree is not None:
                mod_doc = ast.get_docstring(tree) or ""
                for rid in TRACE_RE.findall(mod_doc):
                    idx.setdefault(rid, set()).add(f"{relpath}::<module>")
                    attributed.add(f"{rid}@{relpath}::<module>")
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        doc = ast.get_docstring(node) or ""
                        for rid in TRACE_RE.findall(doc):
                            key = f"{relpath}::{node.name}"
                            idx.setdefault(rid, set()).add(key)
                            attributed.add(f"{rid}@{key}")

        # Raw fallback: any @trace not already attributed to a function -> the file.
        for rid in TRACE_RE.findall(text):
            if not any(a.startswith(f"{rid}@") for a in attributed):
                idx.setdefault(rid, set()).add(relpath)

    return TraceIndex(by_id={rid: sorted(v) for rid, v in idx.items()})


# --------------------------------------------------------------------------- #
# Deterministic sorting + generated-file I/O
# --------------------------------------------------------------------------- #

def sort_key(rid: str, reqs: dict[str, Requirement]) -> tuple[int, int, str]:
    """Stable sort: document order when known, else prefix/id fallback."""
    r = reqs.get(rid)
    if r is not None:
        return (0, r.order, rid)
    prefix_rank = {"FR": 0, "NFR": 1, "TC": 2, "BC": 3}
    parts = REQ_ID_PARTS_RE.match(rid)
    rank = prefix_rank.get(parts.group(1), 9) if parts else 9
    return (1, rank, rid)


def write_generated(path: Path, content: str) -> None:
    """Write a generated artifact with LF endings (matches .gitattributes eol=lf)."""
    if not content.endswith("\n"):
        content += "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def check_fresh(path: Path, content: str) -> tuple[bool, str]:
    """Compare committed ``path`` against freshly generated ``content``.

    Returns (is_fresh, diff_text). Line-based comparison so it is robust to CRLF/LF
    differences introduced by git checkout on Windows.
    """
    import difflib

    if not content.endswith("\n"):
        content += "\n"
    if not path.is_file():
        return False, f"missing generated artifact: {rel(path)}"
    committed = path.read_text(encoding="utf-8")
    if committed.splitlines() == content.splitlines():
        return True, ""
    diff = difflib.unified_diff(
        committed.splitlines(),
        content.splitlines(),
        fromfile=f"{rel(path)} (committed)",
        tofile=f"{rel(path)} (regenerated)",
        lineterm="",
    )
    return False, "\n".join(diff)
