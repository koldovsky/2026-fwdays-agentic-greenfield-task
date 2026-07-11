# Backend Agent Guidelines

Python + FastAPI service. Managed with **uv** — NEVER use npm, pip directly, or poetry. Run everything via `uv run ...`.

## Essential commands (run from `backend/`)

- Install deps: `uv sync`
- Run API locally: `uv run uvicorn app.main:app --reload --workers 1`
- Type check / format: `uv run ruff check . && uv run ruff format --check .`
- Type check: `uv run pyrefly check` (ADR 0009; replaces mypy)
- Tests: `uv run pytest` (BDD scenarios wired with `pytest-bdd`; live demo runs `@smoke` only)
- Tests (live demo slice): `uv run pytest -m smoke` (or the project's configured selector)
- Pre-commit: `pre-commit install` (one-time); hooks run ruff + biome on staged files (see repo-root `.pre-commit-config.yaml`)

**`--workers 1` is mandatory.** Multi-worker forks the in-process job queue and breaks F5's 3-active-jobs semantics.

## Read before editing

- [Architecture](../docs/agents/architecture.md) — hexagonal ports, `job_type` discriminator, in-process asyncio worker, combined workflow gated off, SQLite WAL single-writer. **Read for any backend task.**
- [Backend conventions](CONVENTIONS.md) — uv/Python 3.11/FastAPI 0.139/Uvicorn 0.49/Pydantic 2.13/SQLModel 0.0.39/SQLAlchemy 2.0.51/aiosqlite/Alembic 1.18.5/httpx 0.28/EbookLib 0.20+BS4 4.15+html5lib 1.1/NLTK 3.9.4 or spaCy sentencizer/pydub 0.25.1/python-multipart 0.0.32/pytest 9.1.1+pytest-asyncio+pytest-bdd 8.1.0. Mandatory gotchas: `--workers 1`, python-multipart runtime dep, system ffmpeg (WAV default for mock to avoid MP3 encoder delay), NLTK punkt lazy-download. Mock provider harness: `TranslationProviderPort`/`TTSPort` Protocols + `Mock…Adapter` impls preserving HTML tags hermetically + deterministic silent-audio + `force_timeout` hook. **Read for any backend code.**
- [Testing](TESTING.md) — pytest-bdd wiring, layer/scope tags (incl. `@defer-combined`), mock harness, pitfalls (html5lib tag counting, 4096 no-sentence-boundary, <2s first-byte needs `aiofiles` `StreamingResponse` not `FileResponse`).
- [API contract](../docs/agents/api-contract.md) — endpoints, error envelope `{error:{code,message,details?}}`, full code→HTTP table, thresholds. **Read for any endpoint, error path, or threshold change.**
- Provider SDKs: see [ADR-0012](../docs/adr/0012-use-openai-python-sdk-and-ollama-python-client-for-provider-integration.md) (`openai>=1.50,<2.0` + `ollama>=0.4,<1.0`; first-party per-provider clients, no unified facade).
- In-process alembic: see [ADR-0013](../docs/adr/0013-use-in-process-alembic-command-upgrade-in-lifespan.md) (`alembic.command.upgrade(cfg, "head")` in the FastAPI lifespan; helper at `backend/src/epubtv/tools/db_migrations.py`; replaces the prior `subprocess.run([sys.executable, "-m", "alembic", ...])` path).
- `audioop-lts` runtime install: see [ADR-0014](../docs/adr/0014-use-audioop-lts-for-pydub-on-python-3-13.md) (the wheel pulls in `pydub` which needs the `audioop` stdlib module removed in Python 3.13; the Docker image installs `audioop-lts` as a runtime dep so the `AudioStitcher` import succeeds — without it the `worker_supervisor` task dies silently on Python 3.13).
- Distribution build: `backend/hatch_build.py` (custom hatchling build hook — copies the frontend static export into `src/epubtv/www/` + writes `src/epubtv/package.json` with prod defaults; `FRONTEND_OUT` env var selects the source path, default `../frontend/out`) + `backend/bin/run-in-venv.sh` (Dockerfile + compose launcher; `exec "${VENV_DIR}/bin/python" "$@"` for clean signal propagation). The `Settings` source customisation in `backend/src/epubtv/config.py` (`settings_customise_sources` + `package_json_settings()` + the `frontend_out == "www"` resolver validator) reads `epubtv/package.json` via `importlib.resources` when the package is installed in a venv / container.
- [Sprint scope](../docs/agents/sprint-scope.md) — in/out scope, filename conventions. **Read before adding scope.**
- `tests/unit/_subprocess/test_subprocess_manager_class.py` — the test-only `MockServiceSubprocessManager` (WR-05: moved from `src/epubtv/adapters/subprocess/mock_service_subprocess.py` after the production rebind path was retired in plan 01-01; the class is unused in production, the unit tests are the only consumer).

## Mandatory gotchas (do not regress)

- **`--workers 1`** on Uvicorn — multi-worker forks break the in-process queue.
- **`python-multipart`** is a hard runtime requirement for FastAPI `UploadFile` (F1 50MB upload).
- **System `ffmpeg`** (not a pip package) required by pydub; WAV is the default mock format to avoid MP3 encoder delay breaking the ±50ms stitch.
- **NLTK Punkt** lazy-download — bake `punkt` (or `punkt_tab`) into the CI cache, or choose spaCy `sentencizer` (lock in Phase D).
- **SQLite WAL single-writer** — use one writer connection for the job queue; F5-day-1 decision.
- **WS thread→loop publish** — worker runs on the FastAPI event loop; do not thread-publish to websocket.

## Anti-list

Do not introduce: Celery+Redis, `lxml` as the BS4 parser (use html5lib), sync `requests`, socket.io, `--workers >1`, full-artifact memory buffering, free-threaded CPython 3.13t.

## Relevant skills

- [fastapi-templates](../.agents/skills/fastapi-templates/SKILL.md) — FastAPI project patterns (DI, async, error handling).
- [sqlalchemy-alembic-expert-best-practices-code-review](../.agents/skills/sqlalchemy-alembic-expert-best-practices-code-review/SKILL.md) — SQLModel/Alembic migration review checklist.
- [bdd-testing](../.agents/skills/write-bdd-tests/SKILL.md) — behavior-driven test generation (planner→writer→verifier loop).

## Demo with mocked external services

For the local demo flow with mocked external services
(single-container ``docker compose up`` + runtime settings toggle),
see
[`../../AGENTS.md §Demo with mocked external services`](../AGENTS.md#demo-with-mocked-external-services).
Backend-specific gotchas stay here; the demo orchestration lives at
the repo root.

## Phase 2 BDD contract

Phase 2 wires the 24 backend BDD scenarios for F2 (Translation
Configuration) + F3 (HTML-Aware Translation Pipeline) + F5 (Job
Management & Persistence). The BDD feature files (symlinked
from `docs/features/`) are the executable acceptance contract.

### Active scenarios (22)

| Feature | File | Count | Marker |
| --- | --- | --- | --- |
| F2 (Translation Configuration) | `test_translation_configuration.py` | 3 | `@api` (2) + `@integration` (1) |
| F3 (HTML-Aware Translation Pipeline) | `test_html_aware_translation_pipeline.py` | 11 | `@api` (3) + `@integration` (8) |
| F5 (Job Management & Persistence) | `test_job_management_and_persistence.py` | 8 | `@api` (6) + `@integration` (2) |

The 9 F2 `@web` scenarios (4 `@smoke` + 5 `@regression`) are bound
in `frontend/tests/steps/translation_config_steps.spec.ts` as
Playwright tests (plan 02-05); the 2 F5 `@integration` WS scenarios
share step definitions in `tests/bdd/conftest.py` and the test
file.

### Voiceover scenarios (2, re-bound in Phase 3)

The 2 F5 voiceover resume scenarios (under the "Voiceover job
resumption from last completed chunk" `Rule:`) are **bound** via
`@scenario` in `test_job_management_and_persistence.py` per
CONTEXT.md D-10 + the Phase 2 02-06 plan's recommendation (Phase 3
plan 03-05). Tcids: `JOBS-04-SC05` + `JOBS-04-SC06`. The step
bodies drive the `VoiceOverWorkflowService` via the
`setup_voiceover_job` + `wait_for_voiceover_audio_file` helpers
in `bdd/_harness.py` (gray area 3 from 03-RESEARCH.md — mirror of
the F5 WS step-def pattern).

### Defer-scaling scenarios (2, `@pytest.mark.defer_scaling`)

The 2 F5 Bounded-in-process-active-job-queue scenarios (D-02):

- "A fourth job is queued when three jobs are already active"
- "A queued job starts after an active job finishes"

carry the `@pytest.mark.defer_scaling` tag for the post-sprint
re-enable hook. The default pytest runner filters them out via
`-m 'not defer_scaling'`. The 2 defer-scaling tests pass when
explicitly run via `uv run pytest tests/bdd -m defer_scaling` —
the post-sprint hardening pass is the seam to re-enable
`MAX_ACTIVE=3` via the `WORKER_MAX_ACTIVE=3` env override (plan
02-02).

### Pytest commands

```bash
# Default runner — all 22 active scenarios (voiceover skipped,
# defer-scaling filtered out, slow test filtered out):
cd backend && uv run pytest tests/bdd -q --no-header -m 'not slow'

# Defer-scaling scenarios (the D-02 post-sprint re-enable hook):
cd backend && uv run pytest tests/bdd -m defer_scaling -q --no-header

# All 24 scenarios (22 active + 2 defer-scaling):
cd backend && uv run pytest tests/bdd -m 'not slow' -q --no-header
```

## Phase 3 BDD contract

Phase 3 wires the F4 voiceover pipeline (9 BDD scenarios active + 2
`@defer_combined` for Phase 4) + the F5 voiceover resume scenarios
(2 re-bound from Phase 2 02-06 preservation per D-10). The
voiceover-only 501 dispatch is REMOVED (D-11); the combined-workflow
501 STAYS (D-12 — Phase 4).

### Active scenarios (11)

| Feature | File | Count | Marker |
| --- | --- | --- | --- |
| F4 (Voice-Over Generation) | `test_voice_over_generation.py` | 9 | `@api` (5) + `@regression` (4) + `@smoke` (2) |
| F5 voiceover re-binding | `test_job_management_and_persistence.py` | 2 | `@api @smoke` (1) + `@api @regression` (1) |

The 4 F4 `@web` scenarios are bound in
`frontend/tests/steps/voiceover_config_steps.spec.ts` as Playwright
tests (plan 03-04). The F4 @smoke happy path video is recorded
at `docs/videos/f4-voiceover-happy-path.webm` (plan 03-05).

### Deferred scenarios (2 F4 `@defer_combined`)

The 2 F4 combined-workflow scenarios (under the "Combined workflow
consumes translated text for voice-over" `Rule:`) carry the
`@defer_combined` tag for the Phase 4 re-enable hook:

- "Combined job voice-over uses translated chapter text" (tcid
  `VOICE-04-SC05`)
- "Voice-Over pipeline waits until chapter translation is finished"
  (tcid `VOICE-04-SC06`)

The default pytest runner filters them out via
`-m 'not defer_combined'`. The 2 scenarios pass when explicitly
run via `cd backend && uv run pytest tests/bdd -m defer_combined -q
--no-header` (Phase 4 will replace the placeholder step bodies with
real assertions when the combined-workflow orchestrator ships).

### Pytest commands

```bash
# Default runner — all 11 F4 active + 2 F5 voiceover re-binding +
# 22 Phase 2 BDD = 35 BDD scenarios. The 2 defer-combined +
# 2 defer-scaling + 1 slow test are all excluded by default via
# pyproject.toml `[tool.pytest.ini_options].addopts` (pytest takes the
# last `-m`, so the addopts wins unless an explicit `-m defer_scaling` /
# `-m defer_combined` / `-m slow` is passed below):
cd backend && uv run pytest tests/bdd -q --no-header

# Defer-combined scenarios (the Phase 4 re-enable hook):
cd backend && uv run pytest tests/bdd -m defer_combined -q --no-header

# Defer-scaling scenarios (the D-02 post-sprint re-enable hook):
cd backend && uv run pytest tests/bdd -m defer_scaling -q --no-header

# All 39 BDD scenarios (22 Phase 2 + 11 F4 active + 2 F5 voiceover
# re-binding + 2 defer-combined + 2 defer-scaling):
cd backend && uv run pytest tests/bdd -m 'not slow' -q --no-header
```

### Backend unit groups (4)

The Phase 3 backend unit coverage consists of 12 new test files
shipped across plans 03-01/03-02/03-03; the consolidated view
(by REQ-ID) is:

- `test_mock_tts_adapter.py` — VOICE-01-UT01 + VOICE-03-UT06:
  1s 16 kHz WAV (D-01) + 4096 cap (D-03) + per-chunk call counter
- `test_voices_router.py` — VOICE-01-UT02: `GET /voices` flat-list
  endpoint (D-07 + ADR 0015 — `epubtv.domain.voices` +
  `VOICES_BY_LANGUAGE` + `default_voice_for` retired)
- `test_job_repo_port.py` — VOICE-01-UT03 + VOICE-01-UT04:
  Protocol signature for `append_chunk(chunk_namespace=)` + `create_job(voice=)`
- `test_jobs_router_voiceover.py` — VOICE-01-UT03: 501 removal
  (D-11) + D-08/D-09 preflight + D-06 voice catalog check
- `test_create_job_voice_field.py` — VOICE-01-UT04: `create_job(voice=...)`
  + Alembic 0003 round-trip
- `test_voiceover_audio_files.py` — VOICE-02-UT05: `register_audio_file`
  + `chunk_split_warning` column (D-10 + D-16)
- `test_resolve_voiceover_language.py` — VOICE-02-UT05 (continued):
  `EpubService.resolve_voiceover_language` first-spine rule (D-08)
- `test_character_chunker.py` — VOICE-03-UT06 + VOICE-03-UT07 +
  VOICE-03-UT08: 3-tier fallback (sentence → mid-sentence → hard cut)
  + `chunk_split_warning` marker (D-04 + D-10)
- `test_audio_stitcher.py` — VOICE-04-UT09: 3×1s → 3.0 ± 0.05s
- `test_voiceover_workflow.py` — VOICE-04-UT10: 60s timeout + 1
  retry + `provider_timeout` envelope + per-chapter WAV + resume
- `test_job_orchestrator_voiceover.py` — VOICE-04-UT11: dispatch
  + combined-workflow 501 STAYS (D-12)
- `test_dockerfile_ffmpeg.py` — D-14-UT12: ffmpeg install layer
  (D-14)

### Frontend unit + Playwright (0 + 4)

- `tests/steps/voiceover_config_steps.spec.ts` — VOICE-01-SC01..03
  + VOICE-02-SC01: 4 specs covering the voiceover config panel
  (render + voice dropdown + submit + chooser badge absence/presence).
  The previous `tests/unit/voices.test.ts` mirror of
  `lib/voices.ts` was retired with the per-language catalog in
  Quick 20260711-0847 / ADR 0015 — the SPA now fetches the flat
  voice list from `GET /api/v1/voices` at mount time.

### Conftest (F5 @integration WS step definitions)

`backend/tests/bdd/conftest.py` ships the F5 WebSocket step
definitions for the 2 `@integration` scenarios:

- `@given("a User has an open WebSocket connection on /api/v1/jobs/{id}/events for an active job")`
  — opens a TestClient WS to the events endpoint.
- `@then('the server pushes a JSON event containing "job_id", "job_type", "chunk_id", "progress_current", "progress_total", and "status" to the client within 1 second')`
  — asserts the 6-field F5-AC5 envelope arrives within 1.1s.

These step bodies are bound to the F5 scenarios in
`test_job_management_and_persistence.py` and re-exported via
the `_SyncClient.get` / `_SyncClient.post` helpers added in
plan 02-06.

### Test harness

`backend/tests/bdd/_harness.py` re-exports the
`MockTranslatorDropsNthTag` test profile from
`backend/tests/unit/_harness.py` (plan 02-01) so BDD step
definitions can exercise the F3 ≥95% / <95% regressions
without importing the unit-test harness directly. The
`setup_translation_job(client, epub_id, ...)` helper POSTs
`/api/v1/jobs` with a translation body and returns the new
`job_id`; the `wait_for_ws_event(bus, job_id, timeout=1.0)`
helper subscribes to the `JobProgressBus` and awaits the next
event with a timeout (used by the F5 @integration WS
scenarios).

### Test Case IDs (Phase 02.1 retrofit + Phase 3 extension)

Every backend test carries a stable Test Case ID (tcid) that
maps to a requirement ID in `docs/traceability/requirements-traceability.md`
(D-07 + D-08 + D-09, applied in plan 02.1-02; extended by plan 03-05).
The matrix at `docs/traceability/requirements-traceability.md` is the
single source of truth for "which test proves which requirement";
any new test MUST add its tcid to the corresponding row.

- **BDD scenarios** carry a `@pytest.mark.tcid("<TCID>")` marker
  (module-level via `pytestmark = pytest.mark.tcid(...)` for
  file-level, or function-level for per-scenario overrides).
  Phase 1+2+3 totals: 22 Phase 2 active BDD + 9 F4 active + 2
  F5 voiceover re-binding + 2 defer-scaling + 2 defer-combined
  = 37 BDD markers. The 2 defer_combined scenarios are bound
  (their step bodies document the Phase 4 contract) but filtered
  out of the default runner.
- **Unit tests** carry a module-level `@pytest.mark.tcid`
  marker (one per test file) covering 25 Phase 1+2 unit-test
  groups + 12 Phase 3 unit-test groups = 37 groups
  (271+ individual tests). The marker is set on the module
  rather than per-test to avoid the 271-marker blast radius.
- **tcid filter** — pytest's standard marker expression syntax
  works on the tcid marker: `cd backend && uv run pytest tests/bdd
  -m 'tcid(INFRA-04-SC01)' -q` filters to a single scenario;
  `-m 'tcid(INFRA-04)' -q` filters to a requirement family;
  `-m 'tcid(VOICE-04)' -q` filters to the voiceover audio
  stitching + TTS timeout requirement family.
- **Cross-reference** — the traceability matrix at
  `docs/traceability/requirements-traceability.md` lists every tcid
  alongside the REQ-ID it proves; the BDD scenario file:line is
  the canonical citation for the Gherkin contract. ADR 0011
  documents the recording-config corrections that landed
  alongside the tcid retrofit.
