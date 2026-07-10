# Feature Spec: Deferred Enhancements Slice

Last updated: 2026-07-10

## 1) Context

- Problem: The reliability slice intentionally deferred lazy previews, stable node IDs, template maintainability, and production serving.
- For whom: Web and CLI users working with medium/large STEP assemblies.
- Current behavior before this slice:
  - Web compared uploads eagerly generated STL/PNG for every node.
  - Compare matched children by display `name` only.
  - Upload page localization used fragile string replacement in Python.
  - Production guidance still pointed at Flask's built-in development server.

## 2) Requirements

### Functional

- [x] Web previews are generated lazily on first STL/PNG request.
- [x] Nodes expose stable hierarchical `path_id` values used by compare.
- [x] Upload and error pages use Jinja2 templates.
- [x] Production entry point uses Waitress via `wsgi.py`.

### Non-functional

- [x] Performance: initial `/compare` avoids tessellation/render for all nodes.
- [x] Security/privacy: asset route validates session, side, and extension.
- [x] Localization: unchanged `uk` / `en` / `da` coverage via templates.
- [x] DX/maintainability: templates separated from route code.

## 3) Scope

- In scope:
  - `src/step_tree.py`, `src/compare.py`, `src/report.py`, `app.py`
  - `templates/`, `wsgi.py`, `run_app.ps1`, tests, docs
- Out of scope:
  - Background job queue for previews
  - Cross-session persistent asset storage
  - Reverse proxy / TLS configuration

## 4) Acceptance Criteria

- [x] AC-1: Web `/compare` stores shape holders and does not eagerly export all STL/PNG files.
- [x] AC-2: `GET /asset/<sid>/<side>/<encoded>.png` returns an image for a valid node path.
- [x] AC-3: Compare matches children by `path_id`.
- [x] AC-4: Upload page renders from `templates/upload.html` for all supported languages.
- [x] AC-5: `python wsgi.py` serves the app through Waitress.

## 5) Test Plan

- Unit:
  - unique `path_id` assignment
  - encode/decode roundtrip
  - compare still passes on identical trees
- Integration:
  - lazy PNG endpoint smoke test
  - cached report flow still avoids re-parse
- Smoke/manual:
  - `python wsgi.py`
  - upload two fixtures, open node preview, switch language

## 6) Implementation Plan (small slice)

- Slice name: deferred-enhancements
- Files touched:
  - geometry/compare/report core modules
  - Flask app, templates, WSGI entry point
  - tests and docs
- Risks:
  - In-memory OCP shape cache increases session memory use.
  - Waitress thread pool still blocks on heavy preview generation.
- Rollback strategy:
  - Re-enable eager export in `/compare` and revert compare matching to `name`.

## 7) Checker Plan (Maker != Checker)

- Maker agent: implementation and docs.
- Checker agent(s): independent human or agent review is required before acceptance.
- Automated checks: pytest, smoke `wsgi.py`, manual preview click-through.
- External review tooling (for example PR review bots): optional and does not replace the required independent review.

## 8) Result Summary

- What was done:
  - Lazy asset route, `path_id` matching, Jinja2 templates, Waitress WSGI entry point.
- Which checks passed:
  - `pytest tests/ -v`
- What was intentionally deferred:
  - Preview job queue
  - Path-id based rename inference
  - nginx/IIS deployment recipes
