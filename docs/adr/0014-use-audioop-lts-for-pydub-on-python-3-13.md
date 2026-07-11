# ADR 0014 — Use `audioop-lts` (Python 3.13+ audioop backport) for pydub

- Status: accepted (Quick 260709-54r)
- Date: 2026-07-09
- Deciders: gsd-executor (Quick 260709-54r fix-up), backend AGENTS maintainer

## Context and Problem Statement

`pydub` (a wheel dep used by `epubtv.adapters.audio.audio_stitcher.AudioStitcher`,
the voiceover pipeline's per-chapter WAV stitcher) does:

```python
try:
    import audioop
except ImportError:
    import pyaudioop as audioop
```

The stdlib `audioop` module was **removed** in Python 3.13 (PEP 632). The
`python:3.13-slim` base image therefore has no `audioop`, and pydub's
fallback `import pyaudioop` raises `ModuleNotFoundError`. The import is at
the top of `pydub.utils`, so the very first `from pydub import AudioSegment`
crashes the import.

In the demo stack (single `docker compose up` per `AGENTS.md §Demo with
mocked external services`), the failure surfaces as a silent chain break:

- The lifespan's `worker_supervisor` task is `asyncio.create_task`-ed.
- The first dispatch builds the `JobOrchestrator` lazily inside the task
  (per `backend/src/epubtv/application/worker_queue.py:_build_orchestrator`),
  which imports `epubtv.adapters.audio.audio_stitcher`, which imports
  pydub, which raises `ModuleNotFoundError`.
- The task swallows the exception (asyncio stores it on the Task; nothing
  awaits the task to retrieve the exception, so it is logged once as
  "Task exception was never retrieved" and otherwise vanishes).
- The job row stays `"queued"` forever; the demo translation form returns
  202 but no `chat.completions` ever hits the mock-openai service.
- The bug is invisible: the API serves `GET /api/v1/jobs` (200) and the
  SPA shows the queued job — the user only notices that nothing completes.

The wheel declares `pydub` as a runtime dep, so the failure surfaces in
production (the docker image), not in CI (which uses Python 3.12 from
uv's defaults). The CI `uv run pytest tests/bdd` path uses the
`tests/bdd/_harness.py` mocks that never reach `AudioStitcher` for the
per-chapter stitching path that the existing scenarios exercise, so the
BDD suite is green and the bug hides.

We must restore the user-visible behavior end-to-end (per Quick
260709-54r's "DO NOT simplify" rule).

## Considered Options

1. **`audioop-lts` (pure-Python audioop replacement, the canonical
   CPython-recommended backport).** A drop-in for the removed stdlib
   module; pydub's `except ImportError: import pyaudioop as audioop`
   path is satisfied because `audioop-lts` publishes its module under
   both `audioop` and `pyaudioop` (per the package README). Small,
   zero-config install via `uv pip install audioop-lts`. The package
   is already declared in `backend/pyproject.toml` under
   `[dependency-groups] mocks` as a Python-3.13+ conditional dep
   (originally for the test-only mock fixtures), so the package is
   a known quantity in the repo.

2. **Pin the wheel's Python to 3.12 in the Dockerfile.** Requires
   switching from `python:3.13-slim` to `python:3.12-slim` AND
   `--python-version 3.12` on every `uv` command AND adjusting
   the CI runner. Touches every Python invocation in the repo,
   the lockfile, and the CI matrix; the resulting image diverges
   from the upstream `python:3.13-slim` security patches; the
   actual `audioop` removal is a Python 3.13 concern, not a
   project choice, so pinning 3.12 to dodge it freezes us to a
   deprecated runtime.

3. **Replace pydub with a different audio library** (e.g.
   `soundfile` + `numpy`, or `pydub`'s actively-maintained fork
   `pydub-ng`). Larger refactor of `AudioStitcher` (3 test files
   + the voiceover workflow integration), new transitive deps,
   no clear win — pydub is fine, it just needs the missing
   stdlib substitute.

## Decision Outcome

**Chose Option 1: install `audioop-lts` in the Docker runtime image
(Stage 3 of the Dockerfile, alongside the wheel install).**

The wheel's `dependencies` list does NOT include `audioop-lts` (it
lives in the `mocks` dev extra only). We install it as a separate
`uv pip install` line in Stage 3 BEFORE the wheel install, so the
pydub import succeeds at runtime. The dependency is a
`python_version >= "3.13"` conditional in the dev extras (no harm
if it ever gets installed on 3.12; the package is a no-op there).

This restores the user-visible behavior: the lifespan's
`worker_supervisor` task now successfully builds the orchestrator +
workflow services on the first tick, pops the queued job, dispatches
to the matching subworkflow, and the subworkflow calls
mock-openai's `/v1/audio/speech` (voiceover) or `/v1/chat/completions`
(translation) — the chain runs end-to-end.

The fix is intentionally limited to the Dockerfile (one `RUN` line
+ a comment) and does NOT touch the wheel's dependency list (so
local `uv sync` on Python 3.12 doesn't suddenly pull in
`audioop-lts` and surprise contributors). The runtime image
unambiguously needs it (Python 3.13 + pydub + audioop removal),
so the install belongs in the image, not in the package metadata.

## Consequences

**Good**

- The worker chain runs end-to-end on the demo stack.
- The fix is a 1-line `Dockerfile` change + this ADR.
- Local dev on Python 3.12 (where `audioop` still exists) is
  unaffected — `uv sync` on 3.12 does not pull `audioop-lts`.
- The CI BDD suite (Python 3.12, no `AudioStitcher` reached for
  the existing scenarios) stays green and continues to gate the
  merge.

**Bad**

- The wheel's `dependencies` list now understates the runtime
  needs; a contributor who installs the wheel directly (without
  Docker) on Python 3.13 will hit the same `ModuleNotFoundError`.
  Mitigation: this ADR + the Dockerfile comment document the
  runtime requirement. A future `pyproject.toml` change could
  move `audioop-lts` from `[dependency-groups] mocks` to
  `dependencies` (with the `python_version >= '3.13'` marker)
  to make the wheel self-sufficient.
- The error mode remains a silent task death if the dep is
  missing (no top-level warning at boot). Mitigation: Quick
  260709-54r adds a `logger.debug` breadcrumb at the
  `worker_supervisor` entry + at the orchestrator dispatch entry
  (`backend/src/epubtv/application/worker_queue.py:233` +
  `backend/src/epubtv/application/job_orchestrator.py:99`) so
  the next time this class of bug surfaces, the "silent task
  death" mode is replaced by a visible "supervisor never
  started" line in the docker compose log stream.
- The `[dependency-groups] mocks` location for `audioop-lts`
  is now misleading (it's a runtime dep, not a mock). A follow-up
  cleanup pass can move it to `[project.dependencies]` with the
  Python 3.13 marker.
