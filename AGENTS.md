# AGENTS.md

Context document for any AI agent (Claude Code, Copilot, Cursor, etc.) working in this repository. The goal is to make the project understandable enough that the agent can change and verify it independently, not just generate code blindly.

## What This Project Is

STEP file comparison service (CAD, .stp/.step) at the assembly-tree level. For each part/subassembly, the volume and center of mass are computed. Two files are compared node-to-node by stable hierarchical `path_id`, and the result is a color-coded HTML report (green/yellow/blue/red = match/changed/added/removed).

## Architecture

```
cli.py                 - CLI entry point, command-line arguments
app.py                 - Flask web app with cached sessions and lazy assets
wsgi.py                - Waitress production entry point
templates/             - Jinja2 upload/error pages
src/step_tree.py       - STEP -> tree (Node): parsing via OCP (OpenCASCADE) XCAF
src/compare.py         - Node + Node -> DiffNode: compare two trees by path_id
src/report.py          - DiffNode -> HTML (3-panel view, STL/PNG viewer, theme toggle)
tests/test_geometry.py - unit tests with analytical geometry references
tests/test_app.py      - Flask upload/report/lazy asset smoke tests
```

Critical detail every agent MUST know before changing `step_tree.py`: volume and center of mass must be computed from the component instance shape, not the referred part label. Otherwise the assembly placement transform (`TopLoc_Location`) is not applied and every part reports a center of mass as if it were at the origin. This was already found and fixed once (see regression test `test_cylinder_center_of_mass_reflects_assembly_location`). Do not revert that logic without updating the test.

## Agentic Practices Used Here

### 0. Working Cycle (mandatory for every slice)

For each small increment, follow the same loop:

1. context
2. requirements
3. specification
4. small work slice
5. tests
6. implementation
7. verification
8. separate review
9. summary

This is NOT a single large prompt. It is a sequence of small controlled iterations.

Cycle artifacts in the repository:

- current state / context: `docs/current-state.md`
- pre-code specification: `docs/spec-template.md` (copy for each feature)
- latest completed slice spec: `docs/spec-ui-theme-activation.md`
- technical rules and traps: this file `AGENTS.md`

### 1. Context Engineering (this file)

Instead of re-explaining the project structure and OpenCASCADE geometry pitfalls every time, they are recorded here once.

### 2. Write -> Run -> Check -> Fix, Not One-Shot Prompting

Development here is iterative. The first version of `step_tree.py` produced a wrong center of mass because the component placement was not applied. That was discovered by comparing against the expected result, then fixed, and a regression test was added for the exact bug.

### 3. Verification With an Independent Reference (aka evals)

`tests/test_geometry.py` does not merely check that code runs. It verifies the volume of primitive solids (box, cylinder) against analytical formulas computed independently from the parser code:

- `V_box = a·b·c`
- `V_cyl = π·r²·h`

This is the checker, and it must not trust the generator output on faith.

Run: `pytest tests/ -v`

### 4. Maker ≠ Checker

- Maker: the agent that writes code (`step_tree.py`, `compare.py`, `report.py`)
- Checker: (a) unit tests with analytical references, (b) CodeRabbit on the PR, (c) a separate human/agent review pass before merge
- Maker must not certify its own change. A separate step must do that.

Review practice for each slice:

- maker (implementation): the agent/developer writing code
- checker (acceptance): a separate agent/human in another role
- external checker: CodeRabbit + complexity / duplication checks (for example, fallow)

If a review remark cannot be fixed, leave a short justification for why the risk is accepted.

### 5. Comparison Tolerances as an Explicit Contract

`compare.py` accepts `volume_tol_pct` and `com_tol_mm` as tolerances under which a difference is considered measurement/export noise rather than a real geometry change. This is a documented contract, not a magic constant. Keep it stable during refactors.

Missing volume or center-of-mass on **both** sides is treated as a match for that measurement. Missing data on only one side is treated as a real difference.

### 6. Web Session Cache and Lazy Assets

`app.py` parses uploaded STEP files once in `/compare` and stores `tree_a`, `tree_b`, `diff`, plus OCP shape holders in the in-memory session. `/report/<sid>` must re-render HTML only.

Web previews are lazy: `/asset/<sid>/<side>/<encoded_path>.{stl,png}` generates files on first request. Do not eagerly export all node assets during `/compare`.

CLI reports need `--assets-dir` for eager local STL/PNG output in standalone HTML.

### 7. Compare Matching Uses `path_id`

Child nodes are matched by stable hierarchical `path_id`, not by display name alone. Renaming a part still produces removed+added because the path segment changes.

### 8. Production Serving

Use `python wsgi.py` (Waitress) for non-development serving. `python app.py` remains acceptable for local debugging only.

### 9. Report UI Behavior Contract

- Report page supports light/dark theme toggle.
- Theme preference is stored in browser localStorage (`reportTheme`).
- Both node name and node preview thumbnail activate the selected element in viewer.
- Viewer metadata must display STL URL and render PNG fallback when preview load fails.

## How to Verify a Change Before Commit

```bash
pip install -r requirements.txt --break-system-packages
pytest tests/ -v
python3 cli.py tests/fixtures/sample_a.stp tests/fixtures/sample_b.stp -o /tmp/report.html
python3 cli.py tests/fixtures/sample_a.stp tests/fixtures/sample_b.stp -o /tmp/report.html --assets-dir /tmp/report_assets
python wsgi.py
```

If the tests fail, the change is not ready, regardless of how logically correct it seems.
