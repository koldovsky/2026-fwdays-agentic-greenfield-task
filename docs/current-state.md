# Current State

Last updated: 2026-07-10

## Product Snapshot

- Project: STEP tree comparison (volume, center of mass, diff statuses).
- Main interfaces:
  - CLI: compare two STEP files and generate HTML (optional `--assets-dir` for eager STL/PNG previews).
  - Web: upload 2 STEP files, render tree A/B plus diff.
  - Production web: `python wsgi.py` via Waitress.
- Visualization:
  - Lazy PNG previews and STL export in the web app (`/asset/<sid>/<side>/<path>.png|.stl`).
  - Eager PNG/STL export for CLI via `--assets-dir`.
  - Embedded STL viewer for the currently selected element with rotate/pan/zoom.
  - Report light/dark theme toggle with localStorage persistence (`reportTheme`).

## Architecture State

- `cli.py`: CLI execution, volume/com tolerances, HTML/JSON output, optional local asset export.
- `app.py`: Flask UI, upload, compare, in-memory session cache, lazy asset route.
- `wsgi.py`: Waitress production entry point.
- `templates/`: Jinja2 upload and error pages.
- `src/step_tree.py`: STEP -> Node with `path_id`, shape holder cache, lazy/eager asset export.
- `src/compare.py`: Node -> DiffNode, child matching by `path_id`, tolerance helpers.
- `src/report.py`: three panels (A | diff | B), lazy or eager preview URLs, inline STL viewer, theme toggle, robust element activation.

## Verified Behaviors

- Instance COM regression: `test_cylinder_center_of_mass_reflects_assembly_location`.
- Compare edge cases: added, removed, tolerance bands, missing volume/COM on both sides.
- Web session cache: `/compare` parses once; `/report/<sid>` re-renders HTML only.
- Lazy assets: first preview request generates and caches STL/PNG on disk.
- Path IDs: unique per node; compare matches children by `path_id`.
- Report activation: both node name and preview thumbnail select an element and load STL/PNG.
- PNG fallback: viewer thumbnail falls back to placeholder when preview loading fails.
- Tests: `pytest tests/ -v` -> 30 passed.

Verification snapshot command:

- `.venv\Scripts\python.exe -m pytest tests/ -v`

## Dependencies

Explicit runtime pins in `requirements.txt`:

- `cadquery`, `numpy`, `matplotlib` for geometry + previews
- `flask`, `werkzeug`, `waitress` for the web UI
- `pytest` for verification

## Risks / Open Points

- Renamed parts still appear as removed plus added because `path_id` includes the display name segment.
- Lazy preview generation can still block a Waitress worker thread on first click for heavy solids.
- The session cache is limited (FIFO, max 10) and stores OCP shape references in memory until eviction.
- TLS, auth, and reverse-proxy setup remain deployment concerns outside this repository.

## Next Slice Ideas

1. Background preview queue with progress UI.
2. Optional rename-tolerant matching in addition to `path_id`.
3. Export full report bundles (HTML + assets) to a user-selected directory.
4. nginx/IIS deployment examples in docs.
