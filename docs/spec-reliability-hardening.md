# Feature Spec: Reliability and Performance Hardening

Last updated: 2026-07-10

## 1) Context

- Problem: The first review pass found avoidable web performance issues, missing explicit dependencies, weak compare edge-case handling, and thin Windows service setup.
- For whom: Users comparing STEP assemblies via CLI and the Flask web UI.
- Current behavior before this slice:
  - `/report/<sid>` re-parsed both STEP files on every language switch.
  - CLI HTML reports had no STL/PNG assets unless users manually wired paths.
  - `compare.py` marked nodes `changed` when both volume and COM were absent.
  - `numpy` / `matplotlib` were only transitive dependencies.
- Domain/API constraints:
  - Volume/COM must still be computed from component instance shapes (`TopLoc_Location`).
  - `volume_tol_pct` and `com_tol_mm` remain the public tolerance contract.

## 2) Requirements

### Functional

- [x] Web compare parses STEP files once per session and caches `tree_a`, `tree_b`, `diff`.
- [x] Language switching re-renders HTML from cached session data only.
- [x] CLI accepts `--assets-dir` to emit STL/PNG assets for the HTML viewer.
- [x] Compare treats missing volume/COM on both sides as matching measurements.
- [x] Windows installer verifies `.venv` before registering the scheduled task.

### Non-functional

- [x] Performance: no duplicate STL/PNG generation on report refresh.
- [x] Security/privacy: unchanged upload limits and filename sanitization.
- [x] Localization: unchanged `uk` / `en` / `da` behavior.
- [x] DX/maintainability: explicit deps, logging on preview export failures, docs updated.

## 3) Scope

- In scope:
  - `app.py`, `cli.py`, `compare.py`, `step_tree.py`
  - `requirements.txt`, Windows scripts
  - tests and docs
- Out of scope:
  - Lazy STL generation
  - Stable path-based node IDs
  - Production WSGI deployment

## 4) Acceptance Criteria

- [x] AC-1: `GET /report/<sid>?lang=...` does not call `parse_step`.
- [x] AC-2: `pytest tests/ -v` passes, including removed-node and Flask smoke tests.
- [x] AC-3: `python cli.py ... --assets-dir <dir> -o report.html` writes preview assets beside the report.
- [x] AC-4: `requirements.txt` lists `numpy` and `matplotlib` explicitly.
- [x] AC-5: `install_service.ps1` fails fast when `.venv` is missing.

## 5) Test Plan

- Unit:
  - `_volume_within_tolerance`, `_com_within_tolerance`
  - `test_compare_removed_node`
- Integration:
  - `tests/test_app.py` upload + cached report flow
- Smoke/manual:
  - `python cli.py tests/fixtures/sample_a.stp tests/fixtures/sample_b.stp -o report.html`
  - `python app.py` then upload two fixtures and switch language

## 6) Implementation Plan (small slice)

- Slice name: reliability-and-performance-hardening
- Files touched:
  - `app.py`, `cli.py`, `src/compare.py`, `src/step_tree.py`
  - `requirements.txt`, `install_service.ps1`, `run_app.ps1`
  - `tests/test_geometry.py`, `tests/test_app.py`
  - `docs/current-state.md`, `docs/spec-reliability-hardening.md`, `README.md`, `AGENTS.md`
- Risks:
  - In-memory session size grows with cached trees.
  - Pinned `numpy` / `matplotlib` versions may need refresh with future `cadquery` releases.
- Rollback strategy:
  - Revert session-cache fields in `app.py` and compare tolerance helpers.

## 7) Checker Plan (Maker != Checker)

- Maker agent: implementation in code and docs.
- Checker agent(s):
  - Code quality: pytest + smoke CLI
  - Security/privacy: unchanged attack surface review
  - Spec compliance: verify AC-1..AC-5
- External review: optional PR review tooling

## 8) Result Summary

- What was done:
  - Session cache for parsed trees and diff in the web app.
  - CLI asset export, compare tolerance fixes, preview logging, Windows service checks, explicit dependencies, expanded tests, updated docs.
- Which checks passed:
  - `pytest tests/ -v`
- What was intentionally deferred:
  - Lazy STL/PNG generation
  - Path-based node matching
  - Jinja2 upload templates
