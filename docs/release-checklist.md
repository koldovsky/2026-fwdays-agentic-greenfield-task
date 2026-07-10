# Release Checklist

Use this checklist before pushing the final submission update.

## Required Evidence

- [ ] Author name is present in README.
- [ ] PR link is present in README.
- [ ] 1-2 minute demo video link is present in README.
- [ ] Agentic practices and artifacts are listed in README.

## Code And Behavior

- [ ] `.venv\Scripts\python.exe -m pytest tests/ -v` passes.
- [ ] CLI smoke run works:
  - `python cli.py tests/fixtures/sample_a.stp tests/fixtures/sample_b.stp -o report.html`
- [ ] Web app opens locally:
  - `http://127.0.0.1:5000`
- [ ] Health endpoint responds:
  - `GET /healthz` -> `ok`
- [ ] Language switch on report works without re-upload.
- [ ] Back-to-start button works from report view.

## Windows Task Operation

- [ ] Scheduled task is installed: `STPTreeDiffWebApp`.
- [ ] Restart works:
  - `schtasks /End /TN STPTreeDiffWebApp`
  - `schtasks /Run /TN STPTreeDiffWebApp`
- [ ] Status is `Running` in `schtasks /Query /TN STPTreeDiffWebApp /V /FO LIST`.
- [ ] Runtime logs are written to `logs\app.log`.

## Documentation Consistency

- [ ] `AGENTS.md` reflects path_id matching and current architecture.
- [ ] `docs/current-state.md` test count matches latest run.
- [ ] README limitations/tradeoffs match actual implementation.
