# stp-tree-diff

STEP assembly comparison tool built for the Fwdays Agentic Engineering greenfield assignment.

The project compares two STEP files at the assembly-tree level, computes volume and center of mass for each node, and produces a visual diff with per-part previews and a 3D STL viewer.

## Assignment Checklist

- Author: Roman Lazurko
- Pull request: https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/46
- Demo video (1-2 min): https://youtu.be/_G7HxOYDoVc
- Agentic process context: `AGENTS.md`
- Current system snapshot: `docs/current-state.md`
- Slice specs: `docs/spec-template.md`, `docs/spec-reliability-hardening.md`, `docs/spec-deferred-enhancements.md`
- Slice specs: `docs/spec-template.md`, `docs/spec-reliability-hardening.md`, `docs/spec-deferred-enhancements.md`, `docs/spec-ui-theme-activation.md`
- Release checklist: `docs/release-checklist.md`

## What Is Implemented

- CLI comparison of two `.stp` / `.step` files.
- Web interface for uploading file A and file B.
- Three-column result view: tree A, diff, tree B.
- Diff statuses: `match`, `changed`, `added`, `removed`.
- Per-node STL export and PNG preview generation.
- Interactive 3D viewer for the selected element.
- Report light/dark theme toggle with persisted preference.
- Element activation from both node name and node thumbnail.
- Multilingual UI: Ukrainian, English, Danish.
- Regression tests for geometry and assembly placement.

## Why This Exists

When a CAD assembly changes, the useful question is not only whether the file changed, but which exact part changed, which part moved, and which part was added or removed. This tool makes that visible without opening both revisions manually in a CAD system.

## Install

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

On Linux/macOS:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt --break-system-packages
```

Python 3.10+ is required. Geometry parsing uses OpenCASCADE bindings from `cadquery` / `cadquery-ocp`. Preview rendering also requires explicit `numpy` and `matplotlib` pins listed in `requirements.txt`.

## CLI Usage

```bash
python cli.py file_a.stp file_b.stp -o report.html
```

Useful options:

- `--volume-tol 0.5` sets the allowed volume delta percentage.
- `--com-tol 0.1` sets the allowed center-of-mass delta in mm.
- `--lang en` switches report language to `uk`, `en`, or `da`.
- `--json` also prints the diff tree as JSON.
- `--assets-dir report_assets` writes STL/PNG previews next to the HTML report and enables the embedded 3D viewer.

Example:

```bash
python cli.py tests/fixtures/sample_a.stp tests/fixtures/sample_b.stp -o report.html --lang en
python cli.py tests/fixtures/sample_a.stp tests/fixtures/sample_b.stp -o report.html --assets-dir report_assets
```

Without `--assets-dir`, the CLI report still shows trees and diff values, but STL/PNG previews and the 3D viewer are not populated.

## Web Usage

Production / background serving:

```bash
python wsgi.py
```

Local development:

```bash
python app.py
```

Then open `http://127.0.0.1:5000` locally, or `http://<server-ip>:5000` from another machine if port 5000 is forwarded and allowed by the firewall.

The Flask app binds to `0.0.0.0:5000` by default so it can be reached through NAT/router forwarding.

The web UI lets the user:

- upload two STEP files,
- tune geometry tolerances,
- switch UI language,
- switch report light/dark theme,
- inspect both trees side by side,
- click any element name or thumbnail to open its STL and PNG preview.

The web app parses each uploaded pair once per session, caches parsed trees plus diff, and generates STL/PNG previews lazily on first request. Switching report language re-renders HTML only.

Environment variables for serving:

- `APP_HOST` (default `0.0.0.0`)
- `APP_PORT` (default `5000`)
- `APP_THREADS` for Waitress (default `4`)

Health endpoint:

- `GET /healthz` returns `ok` with HTTP 200.

## Run As Service-Like Task On Windows

Create the virtual environment first, then install the scheduled task:

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
powershell -ExecutionPolicy Bypass -File .\install_service.ps1
```

If you want remote access, allow TCP port 5000 through Windows Firewall.

This registers the task `STPTreeDiffWebApp`, which launches the app through `wsgi.py` and the project `.venv`, writing logs to `logs\app.log`.

To remove it later:

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall_service.ps1
```

Quick operations:

```powershell
# restart service-like task
schtasks /End /TN STPTreeDiffWebApp
schtasks /Run /TN STPTreeDiffWebApp

# inspect status
schtasks /Query /TN STPTreeDiffWebApp /V /FO LIST
```

Runtime logs are written to `logs\app.log`.

Note: this is a Windows Scheduled Task, not a native Windows Service wrapper. For this Python/Flask app it is the most reliable built-in option without adding extra service-manager dependencies.

Troubleshooting notes:

- If task state is `Running` but the app is not reachable, check `logs\app.log` first.
- `Last Result` can temporarily show a non-zero value while the restart loop in `run_app.ps1` recovers from failures.
- If `\.venv\Scripts\python.exe` is missing, recreate the venv and reinstall dependencies before re-running `install_service.ps1`.
- If port `5000` is busy, either stop the conflicting process or change `APP_PORT`.

## Verification

Run the automated checks:

```bash
pytest tests/ -v
```

Run a smoke comparison:

```bash
python cli.py tests/fixtures/sample_a.stp tests/fixtures/sample_b.stp -o report.html
```

The tests validate geometry against independent analytical references:

- box volume: $V = a \cdot b \cdot c$
- cylinder volume: $V = \pi r^2 h$

There is also a regression test that protects the assembly-placement bug where center of mass could be computed from the referred label instead of the placed instance shape.

## Agentic Engineering Artifacts

This repository includes explicit process artifacts used during development:

- `AGENTS.md` for stable project context and technical traps.
- `docs/current-state.md` for the current system snapshot.
- `docs/spec-template.md` for pre-implementation feature specs.
- `docs/spec-reliability-hardening.md` for the reliability slice.
- `docs/spec-deferred-enhancements.md` for lazy assets, path IDs, templates, and WSGI.
- `docs/spec-ui-theme-activation.md` for report theme toggle and element activation fixes.
- `.github/workflows/tests.yml` for automated verification.

Development slices followed this loop:

`context -> requirements -> specification -> small slice -> tests -> implementation -> verification -> review -> summary`

## Project Structure

```text
cli.py                 CLI entry point
app.py                 Flask web app with cached sessions and lazy assets
wsgi.py                Waitress production entry point
templates/             Jinja2 upload and error pages
src/step_tree.py       STEP -> tree parsing, path_id, volume/COM, STL/PNG export
src/compare.py         tree diff logic by path_id
src/report.py          HTML report generation
src/i18n.py            translations
tests/test_geometry.py geometry, compare, and regression tests
tests/test_app.py      Flask upload/report/lazy asset smoke tests
```

## Known Tradeoffs

| Decision                            | Benefit                           | Cost                                              | Future Improvement                         |
| ----------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Match by hierarchical `path_id`     | Stable deterministic diff mapping | Renames appear as removed + added                 | Add optional rename-tolerant matching mode |
| Lazy STL/PNG generation in web mode | Faster initial compare response   | First preview click may be slower on heavy solids | Add background preview queue with progress |
| In-memory FIFO session cache        | Simple and fast runtime state     | Limited retention and memory-bound lifetime       | Add optional persistent cache backend      |
| Waitress-only app serving in repo   | Easy production entry point       | TLS/auth/reverse-proxy not included by default    | Add nginx/IIS deployment templates         |

## Submission Notes

Assignment evidence:

- Author: Roman Lazurko.
- Pull request: https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/46
- Demo video (1-2 min): https://youtu.be/_G7HxOYDoVc

Agentic practices actually used:

- Iterative loop per slice: context -> requirements -> specification -> tests -> implementation -> verification -> review -> summary.
- Persistent context in AGENTS.md with technical traps and verification commands.
- Maker != checker: implementation in code, then independent checks via pytest, CI workflow, and PR review tooling.
- Specs/tests/evals: analytical geometry tests plus explicit regression tests for TopLoc_Location behavior.
- Verification before merge: local pytest, smoke CLI run, and CI workflow execution.
- Tools/MCP usage: structured file edits, terminal validation, browser checks, and Python/MCP execution for reproducible diagnostics.

Student vs agent responsibilities:

- Student: selected architecture, defined acceptance criteria, reviewed outputs, and decided which changes were accepted.
- Agent: generated/refined implementation, added tests and docs updates, and ran validation commands under the defined workflow.
