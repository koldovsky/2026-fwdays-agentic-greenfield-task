#!/usr/bin/env python3
"""Working memory + committed snapshot tooling (M-04, gaps G-06/G-07).

The harness keeps two distinct kinds of memory, regenerated from one source here:

  * **Committed snapshot** — ``docs/metadata-snapshot.json`` is the engine's
    ``get_editor_metadata()`` export, pinned to the exact engine commit it came
    from (recorded in the ``docs/metadata-snapshot.md`` sidecar). It is the
    deterministic metadata contract M1's codec work is built against, so the work
    can't silently float against a moving engine (G-07).
  * **Working handoff** — ``docs/current-state.md`` carries last-action / status /
    next-steps across sessions (G-06). Its factual *At a glance* header is
    regenerated from git + the snapshot; the narrative below is hand-written.

Usage::

    update_memory.py                 # regenerate snapshot + sidecar + state header
    update_memory.py --snapshot      # snapshot + sidecar only
    update_memory.py --state         # state header only
    update_memory.py --check         # gate: snapshot present + not drifted (skip-safe)
    update_memory.py --check --require-engine   # turn the skip into a hard failure

The ``--check`` gate mirrors ``check_engine_parity.py``'s M-09 posture: with no
engine importable it self-skips (exit 0) unless ``--require-engine``. Pure stdlib;
reuses ``check_engine_parity``'s engine-import path so there is one way to the engine.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import List, Optional, Tuple

SCRIPTS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPTS_DIR.parent.parent
DOCS = PROJECT_ROOT / "docs"
SNAPSHOT_JSON = DOCS / "metadata-snapshot.json"
SNAPSHOT_SIDECAR = DOCS / "metadata-snapshot.md"
CURRENT_STATE = DOCS / "current-state.md"

WATCHED_PREFIXES = ("docs/", "packages/", "src/", "test/", "tests/", "examples/", "apps/")

STATE_BEGIN = "<!-- BEGIN generated: at-a-glance · python harness/scripts/update_memory.py --state -->"
STATE_END = "<!-- END generated: at-a-glance -->"

sys.path.insert(0, str(SCRIPTS_DIR))
import check_engine_parity as parity  # noqa: E402  (reuse the one engine-import path)


# --------------------------------------------------------------------------- git
def _git(*args: str) -> Optional[str]:
    try:
        r = subprocess.run(
            ["git", *args], cwd=PROJECT_ROOT,
            capture_output=True, text=True, timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.strip() if r.returncode == 0 else None


def _git_in(repo: Path, *args: str) -> Optional[str]:
    try:
        r = subprocess.run(
            ["git", "-C", str(repo), *args],
            capture_output=True, text=True, timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.strip() if r.returncode == 0 else None


def _changed_paths() -> List[str]:
    out = _git("status", "--porcelain")
    if not out:
        return []
    paths = []
    for line in out.splitlines():
        path = line[3:].strip().strip('"')
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        paths.append(path)
    return paths


# ----------------------------------------------------------------------- engine
def _engine_repo_root() -> Optional[Path]:
    """Filesystem root of the importable engine (for git provenance)."""
    try:
        import transon  # type: ignore
    except Exception:
        return None
    init = Path(transon.__file__).resolve()       # .../transon/__init__.py
    return init.parent.parent


def _engine_provenance() -> dict:
    """{commit, describe, importable} for the engine the snapshot came from."""
    root = _engine_repo_root()
    if root is None:
        return {"importable": False}
    return {
        "importable": True,
        "commit": _git_in(root, "rev-parse", "HEAD"),
        "describe": _git_in(root, "describe", "--tags", "--always"),
        "root": str(root),
    }


def _dump(export: dict) -> str:
    """Deterministic serialization so committed == a fresh re-run (AD-030 spirit)."""
    return json.dumps(export, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


# --------------------------------------------------------------------- snapshot
def write_snapshot() -> Tuple[bool, str]:
    if not parity._ensure_engine_importable():
        return False, "engine not importable — snapshot left unchanged (set TRANSON_REPO=../transon)"
    export = parity._load_export()
    if export is None:
        return False, "engine present but get_editor_metadata() unavailable — snapshot left unchanged"

    SNAPSHOT_JSON.write_text(_dump(export), encoding="utf-8")

    prov = _engine_provenance()
    commit = prov.get("commit") or "unknown"
    describe = prov.get("describe") or "unknown"
    catalog = export.get("catalog") or {}
    rules = catalog.get("rules") if isinstance(catalog, dict) else None
    rule_count = len(rules) if isinstance(rules, list) else "?"

    sidecar = f"""# Metadata snapshot — provenance

> Generated by `python harness/scripts/update_memory.py --snapshot`. **Do not hand-edit**
> [`metadata-snapshot.json`](metadata-snapshot.json) — re-run the generator instead.

The committed [`metadata-snapshot.json`](metadata-snapshot.json) is the engine's
`get_editor_metadata()` export (`metadata-contract.md` §2), pinned so M1's codec work is
built against a fixed, reproducible metadata contract rather than a moving engine (G-07).

| Field | Value |
|---|---|
| Engine commit | `{commit}` |
| Engine describe | `{describe}` |
| `metadata_version` | `{export.get('metadata_version') or '?'}` |
| `engine_version` | `{export.get('engine_version') or '—'}` |
| Catalog rules | {rule_count} |

**Regenerate** (requires the engine importable — `pip install transon` or
`export TRANSON_REPO=../transon`):

```bash
python harness/scripts/update_memory.py --snapshot
```

**Drift check** (CI + pre-commit; self-skips when the engine is absent, fails with
`--require-engine`):

```bash
python harness/scripts/update_memory.py --check
```
"""
    SNAPSHOT_SIDECAR.write_text(sidecar, encoding="utf-8")
    return True, f"snapshot written ({rule_count} rules) @ engine {describe}"


def _snapshot_engine_pin() -> str:
    """Engine pin line for the state header — prefer the committed sidecar, fall back live."""
    if SNAPSHOT_SIDECAR.exists():
        text = SNAPSHOT_SIDECAR.read_text(encoding="utf-8")
        commit = describe = None
        for line in text.splitlines():
            if line.startswith("| Engine commit |"):
                commit = line.split("`")[1] if "`" in line else None
            elif line.startswith("| Engine describe |"):
                describe = line.split("`")[1] if "`" in line else None
        if commit and describe:
            return f"transon `{describe}` @ `{commit[:12]}` (see [metadata-snapshot.md](metadata-snapshot.md))"
    prov = _engine_provenance()
    if prov.get("commit"):
        return f"transon `{prov.get('describe')}` @ `{prov['commit'][:12]}`"
    return "_none committed — run `update_memory.py --snapshot`_"


# ------------------------------------------------------------------- state file
def _state_block() -> str:
    head = _git("rev-parse", "--short", "HEAD") or "unknown"
    subject = _git("log", "-1", "--pretty=%s") or "unknown"
    branch = _git("rev-parse", "--abbrev-ref", "HEAD") or "unknown"
    snapshot = "committed" if SNAPSHOT_JSON.exists() else "_absent_"
    return (
        f"{STATE_BEGIN}\n"
        f"| | |\n|---|---|\n"
        f"| Repo HEAD | `{head}` — {subject} |\n"
        f"| Branch | `{branch}` |\n"
        f"| Engine pin | {_snapshot_engine_pin()} |\n"
        f"| Metadata snapshot | {snapshot} ([metadata-snapshot.json](metadata-snapshot.json)) |\n"
        f"{STATE_END}"
    )


STATE_TEMPLATE = """# Current state — working handoff

> **Non-authoritative working memory** (G-06). A session-to-session handoff, not part of the
> contract. Where this and the contract docs (`SPEC.md`, `ARCHITECTURE.md`, `ROADMAP.md`,
> `AGENTS.md`) disagree, **they win**. Update the narrative below at the end of a work session;
> regenerate the header with `python harness/scripts/update_memory.py --state`.

{block}

## Last action

_M-04 landed: working-memory + committed-snapshot harness. Documenting state here for the first time._

## Status by milestone

The authoritative milestone tracker is [`ROADMAP.md`](ROADMAP.md#milestone-tracker); this is the
living read of it.

- **M0 — engine `switch`/`cond` + projection-ready export + Node adapter** — ◐ in progress. The
  **engine half is done**: the sibling `../transon` checkout exports `get_editor_metadata()`
  (`switch`/`cond` rules + projection-ready split catalog/docs, `metadata_version 2.0`) — captured in
  [`metadata-snapshot.json`](metadata-snapshot.json). **Editor-side pending**: the Node→Python
  `EngineProvider` test adapter and the monorepo scaffolding + version pins (AD-021).
- **M1–M5** — ☐ not started.

## Next steps (ordered)

1. Stand up the M0 editor-side Node→Python `transon` `EngineProvider` test adapter
   (`test/engine-node-adapter`) able to run markers `@` and `$` (ROADMAP M0 deliverables).
2. Scaffold the pnpm/Turborepo monorepo + record the locked version pins (AD-021).
3. Pin the engine in CI and flip `check_engine_parity.py --require-engine` + `update_memory.py
   --check --require-engine` on (closes M-09).

## Open blockers / waiting-on

- None blocking M0 — it depends only on owner-controlled inputs (ROADMAP §"Remaining inputs").

## Do-not-relitigate (pointers, not copies)

- Locked decisions → [`ROADMAP.md` §Locked decisions](ROADMAP.md#locked-decisions).
- Architecture decisions `AD-001…AD-031` → [`ARCHITECTURE.md`](ARCHITECTURE.md).
- Golden rules / always-on invariants → [`AGENTS.md`](../AGENTS.md).
"""


def write_state() -> Tuple[bool, str]:
    block = _state_block()
    if not CURRENT_STATE.exists():
        CURRENT_STATE.write_text(STATE_TEMPLATE.format(block=block), encoding="utf-8")
        return True, "current-state.md created"
    text = CURRENT_STATE.read_text(encoding="utf-8")
    if STATE_BEGIN in text and STATE_END in text:
        pre = text.split(STATE_BEGIN, 1)[0]
        post = text.split(STATE_END, 1)[1]
        CURRENT_STATE.write_text(pre + block + post, encoding="utf-8")
        return True, "current-state.md header refreshed"
    # No markers (hand-rewritten without them) — leave the narrative alone, just report.
    return False, "current-state.md present but has no generated-header markers — left unchanged"


# ------------------------------------------------------------------------ gate
def check(require_engine: bool = False) -> Tuple[List[str], List[str]]:
    """Return (problems, skips). Snapshot must exist + carry provenance; if the engine is
    importable it must not have drifted. Skip-safe unless ``require_engine``."""
    problems: List[str] = []
    skips: List[str] = []

    if not SNAPSHOT_JSON.exists():
        problems.append("docs/metadata-snapshot.json missing — run `update_memory.py --snapshot`")
    if not SNAPSHOT_SIDECAR.exists():
        problems.append("docs/metadata-snapshot.md (provenance) missing — run `update_memory.py --snapshot`")
    elif "Engine commit" not in SNAPSHOT_SIDECAR.read_text(encoding="utf-8"):
        problems.append("docs/metadata-snapshot.md records no engine commit — snapshot provenance incomplete")

    importable = parity._ensure_engine_importable()
    if not importable:
        msg = "engine not importable — snapshot drift not verified (set TRANSON_REPO or pip install transon)"
        if require_engine:
            problems.append(msg)
        else:
            skips.append(msg)
        return problems, skips

    export = parity._load_export()
    if export is None:
        msg = "engine present but get_editor_metadata() unavailable — drift not verified"
        (problems if require_engine else skips).append(msg)
        return problems, skips

    if SNAPSHOT_JSON.exists() and SNAPSHOT_JSON.read_text(encoding="utf-8") != _dump(export):
        problems.append(
            "docs/metadata-snapshot.json has drifted from the engine export — "
            "re-run `python harness/scripts/update_memory.py --snapshot`"
        )
    return problems, skips


def handoff_nudge() -> Optional[str]:
    """Stop-hook signal: the agent changed watched files but didn't touch the working handoff."""
    changed = _changed_paths()
    watched = [p for p in changed if p.startswith(WATCHED_PREFIXES)]
    if not watched:
        return None
    if "docs/current-state.md" in changed:
        return None
    return (
        "You changed tracked files but didn't update the working handoff. Before finishing, refresh "
        "`docs/current-state.md` so the next session resumes cleanly: run "
        "`python harness/scripts/update_memory.py --state` for the header, then update **Last action** "
        "and **Next steps**. (Non-blocking; skip if this was a throwaway edit.)"
    )


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Working memory + committed snapshot (M-04).")
    ap.add_argument("--snapshot", action="store_true", help="write metadata snapshot + sidecar only")
    ap.add_argument("--state", action="store_true", help="refresh current-state.md header only")
    ap.add_argument("--check", action="store_true", help="gate: snapshot present + not drifted (skip-safe)")
    ap.add_argument("--require-engine", action="store_true", help="with --check, fail instead of skip when engine absent")
    args = ap.parse_args(argv)

    if args.check:
        problems, skips = check(require_engine=args.require_engine)
        for s in skips:
            print(f"SKIP (memory snapshot): {s}")
        if problems:
            print("Memory snapshot problems:")
            for p in problems:
                print(f"  - {p}")
            return 1
        print("OK: metadata snapshot present and consistent." if not skips else "OK (snapshot drift check skipped).")
        return 0

    do_snapshot = args.snapshot or not args.state
    do_state = args.state or not args.snapshot
    rc = 0
    if do_snapshot:
        ok, msg = write_snapshot()
        print(("OK: " if ok else "WARN: ") + msg)
        rc = rc or (0 if ok else 1)
    if do_state:
        ok, msg = write_state()
        print(("OK: " if ok else "WARN: ") + msg)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
