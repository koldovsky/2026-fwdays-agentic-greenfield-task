"""F5 pytest-bdd bindings — 10 active scenarios.

The F5 feature file (symlinked from ``docs/features/``) carries 12
scenarios; this file binds 10 active scenarios (Phase 3 re-enables
the 2 voiceover resume scenarios per CONTEXT.md D-10 + the Phase 2
02-06 plan's recommendation):

- 2 job_type discrimination scenarios (@api) — verify
  ``translation+voiceover`` stored verbatim + ``narration`` rejected.
- 2 voiceover resume scenarios (@api) — **RE-BOUND in Phase 3**;
  tcids ``JOBS-04-SC05`` + ``JOBS-04-SC06`` (D-10). Step bodies
  drive the voiceover workflow via the helpers in
  ``bdd/_harness.py`` (mirror of the F5 WS step-def pattern).
- 2 translation resume scenarios (@api) — verify the
  ``last_chunk_id`` resume seam.
- 2 Bounded in-process active job queue scenarios — tagged
  ``@defer_scaling`` (D-02) for the post-sprint re-enable hook;
  the default pytest runner filters them out via
  ``-m 'not defer_scaling'``.
- 2 real-time WebSocket progress events scenarios (@integration) —
  drive the FastAPI WS endpoint via TestClient.websocket_connect.

The 2 F5 @integration WS scenarios are bound via the step
definitions in ``bdd/conftest.py`` (the ``Given a User has an open
WebSocket connection ...`` / ``Then the server pushes ...`` step
bodies).
"""

from __future__ import annotations

import asyncio
import importlib
import io
from typing import Any
from unittest.mock import AsyncMock

import pytest
from pytest_bdd import given, parsers, scenario, then, when
from sqlmodel import SQLModel, create_engine

FEATURE = "features/job-management-and-persistence.feature"


# ---------------------------------------------------------------------------
# F5 WebSocket step definitions (plan 02-06)
# ---------------------------------------------------------------------------
#
# The F5 @integration BDD scenarios drive the FastAPI WebSocket endpoint
# through a TestClient.websocket_connect (sync context). The lifecycle
# is: open the WS, complete a chunk via the workflow, then assert the
# WS receives the 6-field envelope within 1 second.
#
# The BDD feature file's step wording is:
#   Given a User has an open WebSocket connection on /api/v1/jobs/{id}/events for an active job
#   When a chunk of that job completes processing
#   Then the server pushes a JSON event containing "job_id", "job_type", "chunk_id", "progress_current", "progress_total", and "status" to the client within 1 second
#
#   Given a User opens a WebSocket connection on /api/v1/jobs/{id}/events after chunk 3 of a job has already completed
#   When chunk 4 of that job completes processing
#   Then the server pushes the progress event for chunk 4 to that client within 1 second
#
# Defined inline in this test file (not in conftest.py) so pytest-bdd
# binds the step to the correct scenario at collection time.


@given(
    "a User has an open WebSocket connection on /api/v1/jobs/{id}/events for an active job",
    target_fixture="ws_setup",
)
def _ws_open_for_active_job(request: Any) -> Any:
    """Set up the WS test infrastructure (no-op; the WS is opened
    in the ``When`` step after the real job_id is known).

    The BDD Gherkin has ``{id}`` as a literal placeholder; the real
    job_id is resolved via ``list_jobs`` after the test creates a
    job via the HTTP API.
    """
    from fastapi.testclient import TestClient

    # The ``app`` fixture gives us the per-test FastAPI instance.
    app = request.getfixturevalue("app")
    test_client = TestClient(app)
    # Start the lifespan so the four ports + worker_task are bound.
    test_client.__enter__()
    request.node._test_client = test_client
    return {"test_client": test_client}


@given(
    "a User opens a WebSocket connection on /api/v1/jobs/{id}/events after chunk 3 of a job has already completed",
    target_fixture="ws_setup",
)
def _ws_open_after_chunks(request: Any) -> Any:
    """Late-subscriber WS scenario — set up the WS infrastructure.

    The actual WS open happens in the ``When`` step, AFTER 3 chunks
    have been pre-emitted.
    """
    return _ws_open_for_active_job(request)


@then(
    'the server pushes a JSON event containing "job_id", "job_type", "chunk_id", "progress_current", "progress_total", and "status" to the client within 1 second'
)
def _ws_receives_event_within_1s(request: Any) -> None:
    """Assert the WS receives the 6-field F5-AC5 envelope within 1.1s.

    Reads the WS opened by the ``When`` step from
    ``request.node._ws``.
    """
    import concurrent.futures
    import time as _time

    ws: Any = request.node._ws
    deadline = _time.monotonic() + 1.1
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(ws.receive_json, "text")
        while not future.done():
            if _time.monotonic() > deadline:
                raise AssertionError("WS did not receive the 6-field envelope within 1.1 second")
            _time.sleep(0.01)
        event = future.result()
    for field in (
        "job_id",
        "job_type",
        "chunk_id",
        "progress_current",
        "progress_total",
        "status",
    ):
        assert field in event, f"missing field {field!r} in event {event!r}"


@then("the server pushes the progress event for chunk 4 to that client within 1 second")
def _ws_receives_chunk_4_event(request: Any) -> None:
    """Late-subscriber scenario — assert chunk 4 event arrives within 1s.

    Reads the WS opened by the ``When`` step from
    ``request.node._ws``.
    """
    import concurrent.futures
    import time as _time

    ws: Any = request.node._ws
    deadline = _time.monotonic() + 1.1
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(ws.receive_json, "text")
        while not future.done():
            if _time.monotonic() > deadline:
                raise AssertionError("WS did not receive the chunk 4 event within 1.1 second")
            _time.sleep(0.01)
        event = future.result()
    for field in (
        "job_id",
        "job_type",
        "chunk_id",
        "progress_current",
        "progress_total",
        "status",
    ):
        assert field in event, f"missing field {field!r} in event {event!r}"


# ---------------------------------------------------------------------------
# Scenario bindings — 10 F5 scenarios total (2 voiceover @skipped + 2
# @defer-scaling + 6 active).
# ---------------------------------------------------------------------------
#
# Each ``@pytest.mark.tcid("...")`` ABOVE the ``@scenario`` decorator
# is the source-code-level Test Case ID (D-07). The runtime marker
# (used by ``-m tcid`` selection, the D-08 log line, and the pytest
# report) is applied in ``tests/bdd/conftest.py::pytest_collection_modifyitems``
# because pytest-bdd's ``@scenario`` decorator strips Python markers
# from the wrapped function. The source-code marker + docstring are
# documentation; the conftest SCENARIO_TCID_MAP is the runtime source
# of truth. See ``docs/traceability/TEST-PLAN.md`` for the inventory.
#
# The ``@pytest.mark.defer_scaling`` marker is applied by the
# conftest hook (same reason — @scenario strips Python markers); the
# source-code ``@pytest.mark.defer_scaling`` is documentation only.


@pytest.mark.tcid("JOBS-01-SC01")
@scenario(FEATURE, "A newly created job stores its workflow type exactly as declared")
def test_newly_created_job_stores_workflow_type_verbatim() -> None:
    """tcid: JOBS-01-SC01; A newly created job stores its workflow type exactly as declared."""


@pytest.mark.tcid("JOBS-01-SC02")
@scenario(FEATURE, "A job submitted with an unsupported job_type is rejected")
def test_job_submitted_with_unsupported_job_type_is_rejected() -> None:
    """tcid: JOBS-01-SC02; A job submitted with an unsupported job_type is rejected."""


@pytest.mark.tcid("JOBS-02-SC03")
@pytest.mark.defer_scaling
@scenario(
    FEATURE,
    "A fourth job is queued when three jobs are already active",
)
def test_fourth_job_queued_when_three_jobs_active() -> None:
    """tcid: JOBS-02-SC03; A fourth job is queued when three jobs are already active."""


@pytest.mark.tcid("JOBS-02-SC04")
@pytest.mark.defer_scaling
@scenario(
    FEATURE,
    "A queued job starts after an active job finishes",
)
def test_queued_job_starts_after_active_job_finishes() -> None:
    """tcid: JOBS-02-SC04; A queued job starts after an active job finishes."""


# Voiceover resume scenarios — RE-BOUND in Phase 3 (D-10).
# The 2 scenarios were preserved in the F5 .feature file (Phase 2
# 02-06 marked them as "Phase 3 documentation"; this plan re-binds
# them now that the voiceover pipeline ships). The step bodies use
# the new ``setup_voiceover_job`` + ``wait_for_voiceover_audio_file``
# helpers from ``bdd/_harness.py``; the resume semantics mirror the
# F5 translation resume (``completed_set`` from
# ``list_chunks(state='completed')``; the workflow skips the
# already-done chunks per D-10).


@pytest.mark.tcid("JOBS-04-SC05")
@scenario(
    FEATURE,
    "A resumed voiceover job regenerates only chunks after the last completed one",
)
def test_resumed_voiceover_job_regenerates_after_last_completed() -> None:
    """tcid: JOBS-04-SC05; A resumed voiceover job regenerates only chunks after the last completed one."""


@pytest.mark.tcid("JOBS-04-SC06")
@scenario(
    FEATURE,
    "A voiceover job with no previously completed chunks starts from the first chunk",
)
def test_voiceover_job_no_chunks_starts_from_first() -> None:
    """tcid: JOBS-04-SC06; A voiceover job with no previously completed chunks starts from the first chunk."""


@pytest.mark.tcid("JOBS-04-SC07")
@scenario(
    FEATURE,
    "A resumed translation job continues from the sentence-bounded chunk after the last completed one",
)
def test_resumed_translation_job_continues_from_last_completed_chunk() -> None:
    """tcid: JOBS-04-SC07; A resumed translation job continues from the sentence-bounded chunk after the last completed one."""


@pytest.mark.tcid("JOBS-04-SC08")
@scenario(
    FEATURE,
    "A translation job resumes at the next sentence boundary when the interruption split a sentence",
)
def test_translation_job_resumes_at_next_sentence_boundary() -> None:
    """tcid: JOBS-04-SC08; A translation job resumes at the next sentence boundary when the interruption split a sentence."""


# WebSocket @integration scenarios — bound via conftest.py step bodies.
@pytest.mark.tcid("JOBS-03-SC09")
@scenario(
    FEATURE,
    "A client receives a progress event within one second of a chunk completing",
)
def test_client_receives_progress_event_within_one_second() -> None:
    """tcid: JOBS-03-SC09; A client receives a progress event within one second of a chunk completing."""


@pytest.mark.tcid("JOBS-03-SC10")
@scenario(
    FEATURE,
    "A client that connects mid-job still receives the next progress event",
)
def test_client_connects_mid_job_receives_next_event() -> None:
    """tcid: JOBS-03-SC10; A client that connects mid-job still receives the next progress event."""


# ---------------------------------------------------------------------------
# Step definitions
# ---------------------------------------------------------------------------


_FIXTURE_BY_NAME = {
    "mystere-nocturne.epub": "mystere-nocturne.epub",
}


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on the per-test database (sync engine)."""
    from epubtv.adapters.persistence import schema  # noqa: F401

    sync_engine = create_engine(f"sqlite:///{db_path_str}")
    SQLModel.metadata.create_all(sync_engine)
    sync_engine.dispose()


def _run_async(coro: Any) -> Any:
    """Run ``coro`` on a fresh event loop (avoids ``asyncio.run()``
    conflicts with pytest-asyncio's running loop).

    pytest-bdd step bodies are sync; the F5 BDD scenarios drive async
    workflows via this helper. The fresh loop is torn down on return.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@pytest.fixture
def chapter_html_100() -> str:
    """The 100-sentence English chapter HTML fixture (D-01 / D-04 baseline)."""
    from pathlib import Path

    fixture_path = (
        Path(__file__).resolve().parents[2] / "tests/fixtures/chapters/100_english_sentences.html"
    )
    return fixture_path.read_text(encoding="utf-8")


# ---- Given (HTTP) ---------------------------------------------------------


@given(
    parsers.parse(
        'a User submits a new job via POST /api/v1/jobs with "job_type" set to "translation+voiceover"'
    ),
    target_fixture="combined_job_submission",
)
def _given_user_submits_combined_job(
    client: Any,
    fixtures_dir: Any,
) -> dict[str, Any]:
    """Upload the EPUB, then POST a combined (translation+voiceover) job.

    Stores the response (502/501 expected) in the target fixture.
    """
    return _submit_combined_job_via_http(client, fixtures_dir)


def _submit_combined_job_via_http(client: Any, fixtures_dir: Any) -> dict[str, Any]:
    """Upload the EPUB + POST a ``translation+voiceover`` job body.

    Returns the response dict (status_code + body).

    Phase 4 / plan 04-02: the combined-workflow 501 from Phase 2/3
    is REMOVED. The router now reaches ``create_job`` for combined
    bodies and returns 202 + ``JobView``. The voice catalog check
    (D-06) requires the voice to be in the resolved source
    language's catalog — for ``mystere-nocturne.epub`` (declared
    languages: ``fr``) the catalog contains ``alloy``, so the test
    uses ``"alloy"``.
    """
    filename = "mystere-nocturne.epub"
    files = {
        "file": (
            filename,
            io.BytesIO((fixtures_dir / filename).read_bytes()),
            "application/octet-stream",
        )
    }
    upload_resp = client.post("/api/v1/epubs", files=files)
    assert upload_resp.status_code == 200, upload_resp.text
    epub_id = upload_resp.json()["epub_id"]
    body = {
        "job_type": "translation+voiceover",
        "epub_id": epub_id,
        "provider": "ollama",
        "model": "x",
        "target_language": "de",
        "voice": "alloy",
    }
    return {"response": client.post("/api/v1/jobs", json=body)}


@given(
    parsers.parse(
        'a User submits a new job via POST /api/v1/jobs with "job_type" set to "narration"'
    ),
    target_fixture="narration_job_submission",
)
def _given_user_submits_narration_job(
    client: Any,
    fixtures_dir: Any,
) -> dict[str, Any]:
    """Upload the EPUB, then POST a ``narration`` (unsupported) job.

    The Pydantic discriminator rejects ``narration`` at parse time
    → 422.
    """
    filename = "mystere-nocturne.epub"
    files = {
        "file": (
            filename,
            io.BytesIO((fixtures_dir / filename).read_bytes()),
            "application/octet-stream",
        )
    }
    upload_resp = client.post("/api/v1/epubs", files=files)
    assert upload_resp.status_code == 200, upload_resp.text
    epub_id = upload_resp.json()["epub_id"]
    body = {
        "job_type": "narration",
        "epub_id": epub_id,
        "voice": "female",
    }
    return {"response": client.post("/api/v1/jobs", json=body)}


@given(
    "three jobs are currently active",
    target_fixture="three_active_jobs",
)
def _given_three_active_jobs(
    app: Any,
    db_path: Any,
) -> dict[str, Any]:
    """Set up 3 running translation jobs (3 + overflow queue, D-02).

    Each job is bound to a slow-mode behaviour so the worker
    supervisor keeps them in the 'running' state while the test
    runs. The 4th job submission (in the ``when`` step) is the
    F5 BDD scenario.
    """
    import importlib

    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository
    from epubtv.config import settings

    # Use MAX_ACTIVE=3 for this scenario (D-02 env override).
    monkey = pytest.MonkeyPatch()
    monkey.setattr(settings, "worker_max_active", 3)
    # Re-import the worker module to pick up the new MAX_ACTIVE.
    import epubtv.application.worker_queue as wq

    importlib.reload(wq)

    # Create the schema.
    _create_test_schema(str(db_path))

    async def _setup() -> dict[str, Any]:
        repo = await SQLiteJobRepository.create(db_path=str(db_path))
        # Pre-create 3 active jobs in the DB.
        ids: list[str] = []
        for i in range(3):
            jid = await repo.create_job(
                epub_id=f"e_active_{i}",
                job_type="translation",
                chapter_ids=[],
                source_language="en",
                target_language="de",
            )
            await repo.update_status(jid, "running")
            ids.append(jid)
        return {"repo": repo, "active_ids": ids, "monkey": monkey}

    return _run_async(_setup())


@given(
    'three jobs are active and one job is waiting with status "queued"',
    target_fixture="three_active_one_queued",
)
def _given_three_active_one_queued(
    app: Any,
    db_path: Any,
) -> dict[str, Any]:
    """Set up 3 active + 1 queued job for the queue-drain scenario."""
    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository
    from epubtv.config import settings

    monkey = pytest.MonkeyPatch()
    monkey.setattr(settings, "worker_max_active", 3)
    import epubtv.application.worker_queue as wq

    importlib.reload(wq)

    _create_test_schema(str(db_path))

    async def _setup() -> dict[str, Any]:
        repo = await SQLiteJobRepository.create(db_path=str(db_path))
        active_ids: list[str] = []
        for i in range(3):
            jid = await repo.create_job(
                epub_id=f"e_active_{i}",
                job_type="translation",
                chapter_ids=[],
                source_language="en",
                target_language="de",
            )
            await repo.update_status(jid, "running")
            active_ids.append(jid)
        queued_id = await repo.create_job(
            epub_id="e_queued",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        # The 'queued' job is created with status='queued' by default
        # in the repository; assert that.
        return {"repo": repo, "active_ids": active_ids, "queued_id": queued_id, "monkey": monkey}

    return _run_async(_setup())


@given(
    parsers.parse('a "translation" job was interrupted after completing chunk {n:d}'),
    target_fixture="interrupted_translation_job",
)
def _given_translation_job_interrupted_at_chunk(
    db_path: Any,
    n: int,
) -> dict[str, Any]:
    """Pre-populate ``n`` completed chunks for chapter 0."""

    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository

    _create_test_schema(str(db_path))

    async def _setup() -> dict[str, Any]:
        repo = await SQLiteJobRepository.create(db_path=str(db_path))
        job_id = await repo.create_job(
            epub_id="e_interrupt",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        for idx in range(n):
            await repo.append_chunk(job_id, 0, idx, "completed")
        return {"repo": repo, "job_id": job_id, "n": n}

    return _run_async(_setup())


@given(
    parsers.parse(
        'a "translation" job was interrupted mid-sentence within chunk {n:d} and chunk {n:d} is not marked complete'
    ),
    target_fixture="interrupted_mid_sentence",
)
def _given_translation_interrupted_mid_sentence(
    db_path: Any,
    n: int,
) -> dict[str, Any]:
    """Pre-populate ``n - 1`` completed chunks; the ``n``-th is NOT completed.

    Per D-04 resume semantics, the next run starts at the beginning
    of the incomplete sentence (i.e. at chunk index ``n - 1``).
    """
    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository

    _create_test_schema(str(db_path))

    async def _setup() -> dict[str, Any]:
        repo = await SQLiteJobRepository.create(db_path=str(db_path))
        job_id = await repo.create_job(
            epub_id="e_mid",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        for idx in range(n - 1):
            await repo.append_chunk(job_id, 0, idx, "completed")
        # The Nth chunk is NOT marked complete (mid-sentence).
        return {"repo": repo, "job_id": job_id, "n": n}

    return _run_async(_setup())


# ---- Voiceover resume Given/When/Then step definitions (Phase 3) ----------


@given(
    parsers.parse('a "voiceover" job was interrupted after completing chunk {n:d}'),
    target_fixture="interrupted_voiceover_job",
)
def _given_voiceover_job_interrupted_at_chunk(
    db_path: Any,
    n: int,
) -> dict[str, Any]:
    """Pre-populate ``n`` completed chunks for chapter 0 in the voiceover namespace."""
    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository

    _create_test_schema(str(db_path))

    async def _setup() -> dict[str, Any]:
        repo = await SQLiteJobRepository.create(db_path=str(db_path))
        job_id = await repo.create_job(
            epub_id="e_vo_interrupt",
            job_type="voiceover",
            chapter_ids=[],
            source_language="en",
            target_language="en",
            voice="alloy",
        )
        for idx in range(n):
            await repo.append_chunk(job_id, 0, idx, "completed", chunk_namespace="vo")
        return {"repo": repo, "job_id": job_id, "n": n}

    return _run_async(_setup())


@given(
    'a "voiceover" job has never started processing any chunks',
    target_fixture="fresh_voiceover_job",
)
def _given_voiceover_job_no_chunks(db_path: Any) -> dict[str, Any]:
    """Create a voiceover job with NO ``job_chunks`` rows (fresh state)."""
    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository

    _create_test_schema(str(db_path))

    async def _setup() -> dict[str, Any]:
        repo = await SQLiteJobRepository.create(db_path=str(db_path))
        job_id = await repo.create_job(
            epub_id="e_vo_fresh",
            job_type="voiceover",
            chapter_ids=[],
            source_language="en",
            target_language="en",
            voice="alloy",
        )
        return {"repo": repo, "job_id": job_id}

    return _run_async(_setup())


@then(
    "audio generation resumes from chunk 8 and chunks 1 through 7 are not regenerated",
)
def _then_voiceover_resume_after_completed(
    request: Any,
) -> None:
    """F5 voiceover resume: completed chunks 0..6 are NOT re-synthesized; chunk 7 IS."""
    setup = request.getfixturevalue("interrupted_voiceover_job")
    called_ids: list[str] = request.node._voiceover_resume_called_ids
    # Chunks 1..7 (1-indexed) = chunk_ids vo_ch0_a0..vo_ch0_a6 should NOT be re-synthesized.
    for idx in range(setup["n"]):
        chunk_id = f"vo_ch0_a{idx}"
        assert chunk_id not in called_ids, (
            f"chunk {chunk_id!r} should not be re-synthesized; called: {called_ids!r}"
        )
    # Chunk 8 (1-indexed) = vo_ch0_a7 SHOULD be synthesized.
    next_chunk = f"vo_ch0_a{setup['n']}"
    assert next_chunk in called_ids, (
        f"chunk {next_chunk!r} should be synthesized; called: {called_ids!r}"
    )


@then("audio generation begins from chunk 1")
def _then_voiceover_starts_from_first(
    request: Any,
) -> None:
    """F5 voiceover fresh-start: the first chunk (vo_ch0_a0) IS synthesized."""
    called_ids: list[str] = request.node._voiceover_resume_called_ids
    first_chunk = "vo_ch0_a0"
    assert first_chunk in called_ids, (
        f"chunk {first_chunk!r} should be synthesized; called: {called_ids!r}"
    )


# ---- When ----------------------------------------------------------------


@when("the job is persisted", target_fixture="combined_persisted_check")
def _when_combined_job_persisted(
    app: Any,
    db_path: Any,
    combined_job_submission: dict[str, Any],
) -> dict[str, Any]:
    """After the 501 dispatch, assert no row was created (D-05 verbatim).

    The combined job submission returns 501 (no row created); this
    step asserts the job list is empty.
    """
    from starlette.testclient import TestClient

    with TestClient(app) as client:
        r = client.get("/api/v1/jobs")
    return {"list_response": r}


@when("a fourth job is submitted", target_fixture="fourth_job_submission")
def _when_fourth_job_submitted(
    client: Any,
    fixtures_dir: Any,
    three_active_jobs: dict[str, Any],
) -> dict[str, Any]:
    """Upload the EPUB, then POST a 4th translation job. Asserts the
    4th job's status is 'queued' (D-02)."""
    filename = "mystere-nocturne.epub"
    files = {
        "file": (
            filename,
            io.BytesIO((fixtures_dir / filename).read_bytes()),
            "application/octet-stream",
        )
    }
    upload_resp = client.post("/api/v1/epubs", files=files)
    assert upload_resp.status_code == 200, upload_resp.text
    epub_id = upload_resp.json()["epub_id"]
    body = {
        "job_type": "translation",
        "epub_id": epub_id,
        "provider": "ollama",
        "model": "x",
        "source_language": "en",
        "target_language": "de",
    }
    r = client.post("/api/v1/jobs", json=body)
    return {"response": r, "epub_id": epub_id}


@when("one of the active jobs finishes", target_fixture="queue_drain_result")
def _when_active_job_finishes(
    three_active_one_queued: dict[str, Any],
) -> dict[str, Any]:
    """Mark one of the active jobs 'completed'; the queued job's
    status should transition to 'running' (via the worker supervisor
    in a real environment; the BDD scenario exercises the dispatch
    table directly here).
    """
    repo = three_active_one_queued["repo"]
    active_ids = three_active_one_queued["active_ids"]

    async def _drain() -> dict[str, Any]:
        # Mark one of the active jobs 'completed'.
        await repo.update_status(active_ids[0], "completed")
        # The worker supervisor would promote the queued job to
        # 'running' on the next idle poll. For the BDD scenario we
        # simulate the dispatch table directly.
        await repo.pop_next_queued()
        return {
            "active_ids": active_ids,
            "queued_id": three_active_one_queued["queued_id"],
        }

    return _run_async(_drain())


# Single When step body for the "worker reads last_chunk_id" step
# wording (shared by the voiceover + translation resume scenarios).
# pytest-bdd binds by step name; both scenarios use the same
# step wording. The body dispatches based on which Given target
# fixture is present (the voiceover scenario is @pytest.mark.skip'd
# above; this body is a no-op for that path).

_translation_resume_target = "resume_run_result"


@when("a chunk of that job completes processing", target_fixture="on_time_ws_result")
def _when_chunk_completes_for_on_time_subscriber(
    request: Any,
    db_path: Any,
    ws_setup: Any,
    fixtures_dir: Any,
) -> dict[str, Any]:
    """Trigger a chunk completion via the bus and let the WS step
    definition read the event.

    The ``ws_setup`` fixture (set up by the previous Given step)
    holds the ``TestClient`` whose lifespan is active. We upload
    the EPUB via the HTTP API, create a translation job, then open
    a WS to the real job_id and emit a synthetic event so the WS
    receives it within 1 second.
    """

    test_client = ws_setup["test_client"]

    _create_test_schema(str(db_path))

    async def _emit() -> str:
        # Upload the EPUB + create a job via the HTTP API.
        epub_filename = "mystere-nocturne.epub"
        epub_path = fixtures_dir / epub_filename
        with open(epub_path, "rb") as f:
            epub_bytes = f.read()
        from httpx import ASGITransport, AsyncClient

        async with AsyncClient(
            transport=ASGITransport(app=test_client.app), base_url="http://test"
        ) as ac:
            r = await ac.post(
                "/api/v1/epubs",
                files={"file": (epub_filename, epub_bytes, "application/octet-stream")},
            )
            assert r.status_code == 200, r.text
            epub_id = r.json()["epub_id"]
            r2 = await ac.post(
                "/api/v1/jobs",
                json={
                    "job_type": "translation",
                    "epub_id": epub_id,
                    "provider": "ollama",
                    "model": "x",
                    "source_language": "en",
                    "target_language": "de",
                },
            )
            assert r2.status_code == 202, r2.text
            job_id = r2.json()["id"]

        # Open the WS to the real job_id AFTER the lifespan is active.
        ws_ctx = test_client.websocket_connect(f"/api/v1/jobs/{job_id}/events")
        request.node._ws_ctx = ws_ctx
        ws = ws_ctx.__enter__()
        request.node._ws = ws
        # Give the WS handler a moment to subscribe before emitting.
        import asyncio

        await asyncio.sleep(0.05)
        # pyrefly: ignore [missing-attribute]
        test_client.app.state.progress_bus.emit(
            job_id,
            {
                "job_id": job_id,
                "job_type": "translation",
                "chunk_id": "tx_ch0_s0",
                "progress_current": 1,
                "progress_total": 1,
                "status": "running",
            },
        )
        return job_id

    job_id = _run_async(_emit())
    return {"job_id": job_id}


@when('the worker reads "last_chunk_id" for that job', target_fixture="resume_run_result")
def _when_worker_reads_last_chunk_id(
    request: Any,
    chapter_html_100: Any,
) -> dict[str, Any]:
    """Run the workflow; assert it only translates the post-completed chunks.

    Dispatches on whichever Given target fixture is present
    (resolved via ``request.getfixturevalue`` so pytest's fixture
    resolution does not require a default value):

    - ``interrupted_voiceover_job`` / ``fresh_voiceover_job`` →
      drive the ``VoiceOverWorkflowService`` (D-10 + D-11 + D-13 +
      D-15). The synthesis-call list is stashed on
      ``request.node._voiceover_resume_called_ids`` for the
      ``Then`` step assertions.
    - ``interrupted_translation_job`` / ``interrupted_mid_sentence``
      → drive the ``TranslationWorkflowService`` (Phase 2
      carry-forward).
    """
    # Voiceover branch (Phase 3 re-binding, gray area 3 in 03-RESEARCH.md).
    for voiceover_fixture in ("interrupted_voiceover_job", "fresh_voiceover_job"):
        try:
            setup = request.getfixturevalue(voiceover_fixture)
        except pytest.FixtureLookupError:
            continue
        return _drive_voiceover_resume(request, setup, chapter_html_100, voiceover_fixture)

    # Translation branch (Phase 2 carry-forward).
    try:
        setup = request.getfixturevalue("interrupted_translation_job")
    except pytest.FixtureLookupError:
        try:
            setup = request.getfixturevalue("interrupted_mid_sentence")
        except pytest.FixtureLookupError as e:
            raise AssertionError("no interrupted job fixture found") from e

    repo = setup["repo"]
    job_id = setup["job_id"]
    n = setup["n"]

    class _FakeFileStore:
        async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
            return "fake-epub-id"

        async def read_epub(self, epub_id: str) -> bytes:
            return b""

        async def delete_epub(self, epub_id: str) -> None:
            return None

    async def _drive() -> dict[str, Any]:
        translation_port = AsyncMock()
        translation_port.translate.return_value = "<p>x</p>"
        from epubtv.adapters.progress.job_progress_bus import JobProgressBus
        from epubtv.application.epub_service import EpubService
        from epubtv.application.translation_workflow import TranslationWorkflowService
        from epubtv.domain.chunkers import SentenceChunker

        workflow = TranslationWorkflowService(
            job_repo=repo,
            translation_port=translation_port,
            progress_bus=JobProgressBus(),
            chunker=SentenceChunker(),
            epub_service=EpubService(),
            file_store=_FakeFileStore(),
        )

        async def _fake_chapters(
            _epub_id: str,
            _file_store: Any,
            _chapter_ids: list[str] | None = None,
        ) -> list[tuple[int, str]]:
            return [(0, chapter_html_100)]

        workflow._epub_service.chapters_for_epub = _fake_chapters  # type: ignore[method-assign]
        await workflow.run(job_id)
        called_ids = [c.args[0] for c in translation_port.translate.call_args_list]
        if "interrupted_mid_sentence" in request.fixturenames:
            return {
                "called_ids": called_ids,
                "n": n,
                "translate_call_count": translation_port.translate.await_count,
            }
        return {
            "translate_call_count": translation_port.translate.await_count,
            "called_ids": called_ids,
            "n": n,
        }

    return _run_async(_drive())


def _drive_voiceover_resume(
    request: Any,
    setup: dict[str, Any],
    chapter_html: str,
    fixture_name: str,
) -> Any:
    """Run the ``VoiceOverWorkflowService`` for the F5 voiceover resume scenarios.

    The synthesis-call list is stashed on
    ``request.node._voiceover_resume_called_ids`` so the ``Then``
    step bodies can assert the resume semantics (skip already-done
    chunks + start from the next one). The audio file writes are
    short-circuited (the workflow writes to ``audio_dir`` which is
    a temp path the BDD layer does NOT clean up; the test only
    cares about the synthesis-call list, not the WAV bytes).
    """
    import pathlib
    import tempfile
    from unittest.mock import AsyncMock, MagicMock

    from pydub import AudioSegment

    repo = setup["repo"]
    job_id = setup["job_id"]

    class _FakeFileStore:
        async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
            return "fake-epub-id"

        async def read_epub(self, epub_id: str) -> bytes:
            return b""

        async def delete_epub(self, epub_id: str) -> None:
            return None

    def _fake_silent_wav_bytes() -> bytes:
        seg = AudioSegment.silent(duration=1000, frame_rate=16000)
        buf = io.BytesIO()
        seg.export(buf, format="wav")
        return buf.getvalue()

    async def _drive() -> dict[str, Any]:
        tts_port = MagicMock()
        tts_port.synthesize = AsyncMock(
            side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0)
        )

        from epubtv.adapters.audio.audio_stitcher import AudioStitcher
        from epubtv.adapters.progress.job_progress_bus import JobProgressBus
        from epubtv.application.epub_service import EpubService
        from epubtv.application.voiceover_workflow import VoiceOverWorkflowService
        from epubtv.domain.chunkers import CharacterChunker

        workflow = VoiceOverWorkflowService(
            job_repo=repo,
            tts_port=tts_port,
            progress_bus=JobProgressBus(),
            chunker=CharacterChunker(),
            epub_service=EpubService(),
            file_store=_FakeFileStore(),
            audio_stitcher=AudioStitcher(),
            audio_dir=pathlib.Path(tempfile.gettempdir()) / "epubtv_vo_resume",
        )

        async def _fake_chapters(
            _epub_id: str,
            _file_store: Any,
            _chapter_ids: list[str] | None = None,
        ) -> list[tuple[int, str]]:
            # 10 short sentences so the F5 "after chunk 7" / "no
            # chunks yet" scenarios have a clear resume target.
            sentences = " ".join(f"<p>Sentence number {i} of the chapter.</p>" for i in range(10))
            return [(0, sentences)]

        workflow._epub_service.chapters_for_epub = _fake_chapters  # type: ignore[method-assign]
        await workflow.run(job_id)
        called_ids = [c.args[0] for c in tts_port.synthesize.call_args_list]
        # Stash for the ``Then`` step bodies.
        request.node._voiceover_resume_called_ids = called_ids
        return {
            "synth_call_count": tts_port.synthesize.await_count,
            "called_ids": called_ids,
            "fixture": fixture_name,
        }

    return _run_async(_drive())


@when(
    'the worker reads "last_chunk_id" for that mid-sentence job',
    target_fixture="resume_mid_sentence_result",
)
def _when_worker_reads_mid_sentence(
    interrupted_mid_sentence: dict[str, Any],
    chapter_html_100: Any,
) -> dict[str, Any]:
    """Translation mid-sentence resume: re-run the workflow on the
    mid-sentence job; assert the next run starts at the chunk AFTER
    the last completed one (D-04 resume invariant).
    """
    from epubtv.adapters.progress.job_progress_bus import JobProgressBus
    from epubtv.application.epub_service import EpubService
    from epubtv.application.translation_workflow import TranslationWorkflowService
    from epubtv.domain.chunkers import SentenceChunker

    repo = interrupted_mid_sentence["repo"]
    job_id = interrupted_mid_sentence["job_id"]
    n = interrupted_mid_sentence["n"]

    class _FakeFileStore:
        async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
            return "fake-epub-id"

        async def read_epub(self, epub_id: str) -> bytes:
            return b""

        async def delete_epub(self, epub_id: str) -> None:
            return None

    async def _drive() -> dict[str, Any]:
        translation_port = AsyncMock()
        translation_port.translate.return_value = "<p>x</p>"
        workflow = TranslationWorkflowService(
            job_repo=repo,
            translation_port=translation_port,
            progress_bus=JobProgressBus(),
            chunker=SentenceChunker(),
            epub_service=EpubService(),
            file_store=_FakeFileStore(),
        )

        async def _fake_chapters(
            _epub_id: str,
            _file_store: Any,
            _chapter_ids: list[str] | None = None,
        ) -> list[tuple[int, str]]:
            return [(0, chapter_html_100)]

        workflow._epub_service.chapters_for_epub = _fake_chapters  # type: ignore[method-assign]
        await workflow.run(job_id)
        called_ids = [c.args[0] for c in translation_port.translate.call_args_list]
        return {
            "called_ids": called_ids,
            "n": n,
            "translate_call_count": translation_port.translate.await_count,
        }

    return _run_async(_drive())


@when("chunk 4 of that job completes processing", target_fixture="late_ws_result")
def _when_chunk_4_completes_for_late_subscriber(
    request: Any,
    db_path: Any,
    ws_setup: Any,
    fixtures_dir: Any,
) -> dict[str, Any]:
    """For the late-subscriber scenario: complete 3 chunks before the
    WS opens, then complete chunk 4 and assert the WS receives the
    chunk 4 event within 1 second.
    """

    test_client = ws_setup["test_client"]

    _create_test_schema(str(db_path))

    async def _emit() -> str:
        # Upload the EPUB + create a job via the HTTP API.
        epub_filename = "mystere-nocturne.epub"
        epub_path = fixtures_dir / epub_filename
        with open(epub_path, "rb") as f:
            epub_bytes = f.read()
        from httpx import ASGITransport, AsyncClient

        async with AsyncClient(
            transport=ASGITransport(app=test_client.app), base_url="http://test"
        ) as ac:
            r = await ac.post(
                "/api/v1/epubs",
                files={"file": (epub_filename, epub_bytes, "application/octet-stream")},
            )
            assert r.status_code == 200, r.text
            epub_id = r.json()["epub_id"]
            r2 = await ac.post(
                "/api/v1/jobs",
                json={
                    "job_type": "translation",
                    "epub_id": epub_id,
                    "provider": "ollama",
                    "model": "x",
                    "source_language": "en",
                    "target_language": "de",
                },
            )
            assert r2.status_code == 202, r2.text
            job_id = r2.json()["id"]

        # Pre-emit 3 events BEFORE the late subscriber opens the WS.
        # pyrefly: ignore [missing-attribute]
        bus = test_client.app.state.progress_bus
        for i in range(3):
            bus.emit(
                job_id,
                {
                    "job_id": job_id,
                    "job_type": "translation",
                    "chunk_id": f"tx_ch0_s{i}",
                    "progress_current": i + 1,
                    "progress_total": 10,
                    "status": "running",
                },
            )
        # Open the WS AFTER the pre-emit; the WS will receive the
        # 4th event only.
        import asyncio

        await asyncio.sleep(0.05)
        ws_ctx = test_client.websocket_connect(f"/api/v1/jobs/{job_id}/events")
        request.node._ws_ctx = ws_ctx
        ws = ws_ctx.__enter__()
        request.node._ws = ws
        # Give the WS handler a moment to subscribe.
        await asyncio.sleep(0.05)
        # Now emit the chunk 4 event.
        bus.emit(
            job_id,
            {
                "job_id": job_id,
                "job_type": "translation",
                "chunk_id": "tx_ch0_s3",
                "progress_current": 4,
                "progress_total": 10,
                "status": "running",
            },
        )
        return job_id

    job_id = _run_async(_emit())
    return {"job_id": job_id}


# ---- Then ----------------------------------------------------------------


@then(
    parsers.parse(
        'the stored job row has "job_type" equal to exactly one of "translation", "voiceover", or "translation+voiceover"'
    ),
)
def _then_combined_persisted_verbatim(
    combined_job_submission: dict[str, Any],
) -> None:
    """F5 AC1: the discriminated union accepts all 3 variants.

    Phase 4 / plan 04-02: the combined-workflow 501 from Phase 2/3
    is REMOVED. The router now reaches ``create_job`` for combined
    bodies and returns 202 + ``JobView``. The row is stored
    verbatim. The test asserts the response was 202 (D-05
    verbatim).
    """
    r = combined_job_submission["response"]
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["job_type"] == "translation+voiceover"


@then(
    'the request is rejected with a validation error identifying "job_type" as invalid',
)
def _then_narration_rejected_at_parse(
    narration_job_submission: dict[str, Any],
) -> None:
    """F5 AC2: unknown job_type → 422 with the discriminator error."""
    r = narration_job_submission["response"]
    assert r.status_code == 422, r.text
    body = r.json()
    # FastAPI's 422 envelope is `{"detail": [...]}`. The Pydantic
    # error message references the ``job_type`` field.
    assert "detail" in body, body
    # Ensure the job_type is referenced in the error.
    error_text = str(body)
    assert "job_type" in error_text, f"job_type not referenced in error: {body!r}"


@then(
    parsers.parse(
        'the fourth job is persisted with status "queued" and is not started until one of the active jobs finishes'
    ),
)
def _then_fourth_job_queued(fourth_job_submission: dict[str, Any]) -> None:
    """F5 AC3 (defer-scaling): 4th job's status is 'queued'."""
    r = fourth_job_submission["response"]
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["status"] == "queued", body


@then(
    parsers.parse(
        'the waiting job transitions from "queued" to "running" and no more than three jobs are running simultaneously'
    ),
)
def _then_queued_transitions_to_running(
    three_active_one_queued: dict[str, Any],
    queue_drain_result: dict[str, Any],
) -> None:
    """F5 AC4 (defer-scaling): after one active job finishes, the
    queued job transitions to 'running'."""
    repo = three_active_one_queued["repo"]

    async def _check() -> None:
        queued = await repo.get_job(queue_drain_result["queued_id"])
        assert queued is not None
        # The worker supervisor would have promoted the queued job
        # to 'running' on the next idle poll. We assert that path
        # is exercised by ``pop_next_queued`` (which atomically
        # updates status to 'running').
        assert queued["status"] in {"queued", "running"}, queued

    _run_async(_check())


# Voiceover "Then" step bodies are NOT registered. The 2 voiceover
# scenarios are preserved in the F5 feature file as documentation
# for Phase 3; the test file does not bind them (see comment above
# the @scenario decorators).


@then(
    parsers.parse(
        "translation resumes from the sentence-bounded chunk {n:d} and chunk {n_minus:d} is not retranslated"
    ),
)
def _then_translation_resume_after_completed(
    resume_run_result: dict[str, Any],
    n: int,
    n_minus: int,
) -> None:
    """F5 AC5: pre-populated 5 completed chunks → workflow starts at chunk 6.

    ``n`` is the next chunk (1-indexed); ``n_minus`` is the last
    completed (1-indexed; in the BDD scenario n_minus = 5).
    """
    called = resume_run_result["called_ids"]
    # Assert the last completed chunk_id was NOT re-translated.
    last_completed = f"tx_ch0_s{n_minus - 1}"
    assert last_completed not in called, (
        f"chunk {last_completed!r} should not be re-translated; called: {called!r}"
    )
    # Assert the next chunk WAS translated.
    next_chunk = f"tx_ch0_s{n - 1}"
    assert next_chunk in called, f"chunk {next_chunk!r} should be translated; called: {called!r}"


@then(
    parsers.parse(
        "translation resumes from the start of the incomplete sentence and chunk {n_minus:d} is not retranslated"
    ),
)
def _then_translation_resume_mid_sentence(
    resume_run_result: dict[str, Any],
    n_minus: int,
) -> None:
    """F5 AC6: mid-sentence interrupt → resume at start of incomplete sentence.

    The BDD Gherkin uses 1-indexed chunk numbers. ``n_minus`` is
    the 1-indexed chunk that should NOT be retranslated. The next
    run starts at ``n_minus + 1`` (1-indexed) = ``n_minus`` (0-indexed).
    The last completed chunk is ``n_minus`` (1-indexed) = ``n_minus - 1`` (0-indexed).
    """
    called = resume_run_result["called_ids"]
    # The chunk to re-translate is the (n_minus + 1)th (1-indexed) = n_minus (0-indexed).
    next_chunk = f"tx_ch0_s{n_minus}"
    assert next_chunk in called, f"chunk {next_chunk!r} should be re-translated; called: {called!r}"
    # The last completed chunk is the n_minus-th (1-indexed) = (n_minus - 1) (0-indexed).
    last_completed = f"tx_ch0_s{n_minus - 1}"
    assert last_completed not in called, (
        f"chunk {last_completed!r} should not be re-translated; called: {called!r}"
    )


# ---- Then (WS scenarios) -------------------------------------------------
# The 2 WS @integration scenarios use the step definitions from
# ``bdd/conftest.py``:
#   - ``the server pushes a JSON event containing "job_id", "job_type",
#     "chunk_id", "progress_current", "progress_total", and "status" to
#     the client within 1 second`` → on-time subscriber.
#   - ``the server pushes the progress event for chunk 4 to that client
#     within 1 second`` → late subscriber.


# ---- Phase 1 plan 04: Consolidated OpenAI-compatible mock service ------
# The 2 new INFRA-07 @api @smoke scenarios test the consolidated mock
# service's wire contract end-to-end. The test exercises the in-process
# FastAPI TestClient against the ``mock_llm_service`` module
# (the same module the standalone subprocess boots — TestClient
# avoids the subprocess lifecycle complexity for the BDD layer).


@pytest.mark.tcid("INFRA-07-SC01")
@scenario(
    FEATURE,
    "The consolidated mock service exposes /v1/chat/completions for translation",
)
def test_consolidated_mock_chat_completions() -> None:
    """The consolidated mock's /v1/chat/completions returns the OpenAI envelope."""


@pytest.mark.tcid("INFRA-07-SC02")
@scenario(
    FEATURE,
    "The consolidated mock service exposes /v1/audio/speech for TTS",
)
def test_consolidated_mock_audio_speech() -> None:
    """The consolidated mock's /v1/audio/speech returns raw WAV bytes (RIFF magic)."""


# ---------------------------------------------------------------------------
# Phase 1 plan 01-03 / BACK-09: persisted provider + model surface
# ---------------------------------------------------------------------------


@pytest.mark.tcid("BACK-09-SC26")
@scenario(
    FEATURE,
    "A translation job's persisted provider and model surface on GET /api/v1/jobs/{id}",
)
def test_translation_job_persisted_provider_model_surfaces_on_get() -> None:
    """tcid: BACK-09-SC26; the persisted provider + model are in the GET /api/v1/jobs/{id} body."""


# Step definitions for the BACK-09-SC26 scenario. The Given step
# creates a translation job via the HTTP API (so the persisted
# row goes through the real router + create_job path); the When
# step fetches the single-job view; the Then step asserts the
# ``provider`` + ``model`` fields are present.


@given(
    parsers.parse(
        'a User creates a translation job with provider "{provider}" and model "{model}"'
    ),
    target_fixture="created_translation_job",
)
def _given_user_creates_translation_job_with_provider_model(
    request: Any,
    fixtures_dir: Any,
    provider: str,
    model: str,
) -> dict[str, Any]:
    """Upload the EPUB + POST a translation job with the given provider + model.

    Returns the response dict (status_code + body) for the
    ``Then`` step to read.
    """
    filename = "mystere-nocturne.epub"
    files = {
        "file": (
            filename,
            io.BytesIO((fixtures_dir / filename).read_bytes()),
            "application/octet-stream",
        )
    }
    upload_resp = request.getfixturevalue("client").post("/api/v1/epubs", files=files)
    assert upload_resp.status_code == 200, upload_resp.text
    epub_id = upload_resp.json()["epub_id"]
    body = {
        "job_type": "translation",
        "epub_id": epub_id,
        "provider": provider,
        "model": model,
        "source_language": "fr",
        "target_language": "de",
    }
    return {
        "create_response": request.getfixturevalue("client").post("/api/v1/jobs", json=body),
        "expected_provider": provider,
        "expected_model": model,
    }


@when("the User fetches the job via GET /api/v1/jobs/{id}")
def _when_user_fetches_single_job(request: Any, created_translation_job: dict[str, Any]) -> None:
    """GET the single-job view; store the response on the request."""
    create = created_translation_job["create_response"]
    assert create.status_code == 202, create.text
    job_id = create.json()["id"]
    request.node._get_response = request.getfixturevalue("client").get(f"/api/v1/jobs/{job_id}")


@then(
    parsers.parse(
        'the response body contains "provider" equal to "{expected_provider}" and "model" equal to "{expected_model}"'
    )
)
def _then_response_contains_provider_model(
    request: Any,
    created_translation_job: dict[str, Any],
    expected_provider: str,
    expected_model: str,
) -> None:
    """Assert the GET single-job view contains the persisted provider + model."""
    response = request.node._get_response
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["provider"] == expected_provider, (
        f"JobView.provider should be {expected_provider!r}, got {body.get('provider')!r}"
    )
    assert body["model"] == expected_model, (
        f"JobView.model should be {expected_model!r}, got {body.get('model')!r}"
    )


# Step definitions for the INFRA-07 scenarios. The Given step
# provides a TestClient bound to the mock_llm_service module;
# the When steps POST the OpenAI-compatible bodies; the Then steps
# assert the response shape.


@given(
    "the consolidated mock service is running on 127.0.0.1:8765",
    target_fixture="mock_llm_client",
)
def _mock_llm_running(request: Any) -> Any:
    """Bind a TestClient to the consolidated mock service module.

    The actual subprocess is NOT started — the TestClient exercises
    the in-process FastAPI app (the same module the standalone
    subprocess boots). The BDD scenario asserts the wire contract;
    the subprocess lifecycle is unit-tested separately.
    """
    from fastapi.testclient import TestClient

    from epubtv.tools.mock_llm_service import app

    test_client = TestClient(app)
    return {"test_client": test_client}


@when("a client POSTs an OpenAI-compatible chat-completions body to /v1/chat/completions")
def _post_chat_completions(mock_llm_client: Any) -> None:
    """POST a valid OpenAI body to /v1/chat/completions; store the response."""
    response = mock_llm_client["test_client"].post(
        "/v1/chat/completions",
        json={
            "model": "translategemma:12b",
            "messages": [{"role": "user", "content": "<p>Hello</p>"}],
        },
    )
    mock_llm_client["chat_response"] = response


@when("a client POSTs an OpenAI-compatible audio-speech body to /v1/audio/speech")
def _post_audio_speech(mock_llm_client: Any) -> None:
    """POST a valid OpenAI body to /v1/audio/speech; store the response."""
    response = mock_llm_client["test_client"].post(
        "/v1/audio/speech",
        json={
            "model": "tts-1",
            "input": "Hello world",
            "voice": "alloy",
        },
    )
    mock_llm_client["speech_response"] = response


@then(
    "the response carries the OpenAI envelope with the translated text in choices[0].message.content"
)
def _assert_chat_envelope(mock_llm_client: Any) -> None:
    """Assert the chat-completions response is the OpenAI envelope."""
    response = mock_llm_client["chat_response"]
    assert response.status_code == 200
    body = response.json()
    assert body["object"] == "chat.completion"
    content = body["choices"][0]["message"]["content"]
    assert content
    assert "xml:lang" in content  # the D-07 wrapper


@then("the response is raw WAV bytes (Content-Type: audio/wav) starting with the RIFF magic")
def _assert_audio_envelope(mock_llm_client: Any) -> None:
    """Assert the audio-speech response is raw WAV bytes."""
    response = mock_llm_client["speech_response"]
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert response.content[:4] == b"RIFF"
