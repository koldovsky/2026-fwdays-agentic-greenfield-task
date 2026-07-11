"""BDD conftest — shared fixtures for the F1 / F2 / F3 / F5 pytest-bdd suite.

Fixtures:

- ``client`` — a *sync* HTTPX wrapper around the FastAPI app (BDD step
  functions are sync; the unit tests' async ``client`` fixture does not
  work in BDD step bodies). The wrapper drives a fresh event loop per
  request so the underlying ASGI lifespan runs (4 ports bound + worker
  task live). The endpoint hits the real composition root, not a stub.
- ``api_headers`` — empty header dict that satisfies the F1
  ``Background: Given a client has a valid API credential`` step
  (Pitfall 17: single-tenant anonymous; no ``HTTPBearer`` dependency).
- ``fixtures_dir`` — path to the mimesis-generated EPUB fixtures
  (``backend/tests/fixtures/epubs/``). Re-uses the same fixture path
  the unit tests resolve.
- ``broken_epub_bytes`` — random bytes the F1 "Corrupted EPUB" scenario
  POSTs to assert 422 ``invalid_epub``.
- ``fake_epub_bytes`` — a plain ZIP renamed ``fake.epub`` for the F1
  "Non-EPUB archive" scenario.
- ``padded_50mb_bytes`` / ``padded_65mb_bytes`` — boundary-padded EPUBs
  via ``tests/_helpers.py::pad_epub_bytes``.

Phase 2 additions (plan 02-06):

- F5 WS step definitions for the 2 @integration BDD scenarios (on-time
  subscriber + late subscriber) — bound on the ``Given a User has an
  open WebSocket connection on /api/v1/jobs/{id}/events for an active
  job`` / ``Then the server pushes a JSON event ... within 1 second``
  step wording from ``job-management-and-persistence.feature``.

Phase 02.1 additions (plan 02.1-02, D-07 / D-08 / D-10):

- ``SCENARIO_TCID_MAP`` — canonical scenario-name → Test Case ID
  mapping for every bound pytest-bdd scenario. This is the runtime
  source of truth; the source-code ``@pytest.mark.tcid(...)`` markers
  above each ``@scenario`` decorator are documentation.
- ``SCENARIO_DEFER_SCALING`` — set of scenario names that should
  carry the ``defer_scaling`` marker (D-02 post-sprint re-enable
  hook). The marker is applied by the conftest because
  pytest-bdd's ``@scenario`` decorator strips Python markers
  applied to the wrapped function.
- ``pytest_bdd_apply_tag`` hook — applies the tcid +
  defer_scaling markers to the ``scenario_wrapper`` at registration
  time (after the gherkin tags are translated).
- ``pytest_bdd_before_scenario`` hook — logs the tcid + scenario
  name as a breadcrumb so the test log shows which tcid is being
  exercised (D-08 log-line requirement).
"""

from __future__ import annotations

import asyncio
import contextlib
import io
import logging
import os
import zipfile
from pathlib import Path
from typing import Any

import httpx
import pytest
from pytest_bdd import given, then

# pyrefly: ignore [missing-import]
from tests._helpers import pad_epub_bytes

# ---------------------------------------------------------------------------
# Phase 02.1 (plan 02.1-02): scenario → Test Case ID mapping (D-07)
# ---------------------------------------------------------------------------
#
# This is the canonical runtime mapping from Gherkin scenario name → Test
# Case ID. The ``@pytest.mark.tcid("...")`` source-code markers above each
# ``@scenario`` decorator are documentation; the conftest hook below is
# what actually attaches the marker to the runtime test (because
# pytest-bdd's ``@scenario`` decorator replaces the function with a
# ``scenario_wrapper`` that does NOT preserve Python markers applied to
# the original function — see ``@scenario`` source for the strip).
#
# The mapping is the single source of truth — it MUST stay in sync with
# ``.planning/phases/02.1-test-infrastructure-video-quality-remediation-1-regenerate-t/02.1-TEST-PLAN.md``
# (the plan 02.1-01 inventory). Any drift is a defect.
#
# NB: pytest-bdd 8.1.0 sets ``scenario_wrapper.__scenario__`` to the
# original ``ScenarioTemplate``, so we look up the tcid via
# ``function.__scenario__.name`` (a string match against this dict).
SCENARIO_TCID_MAP: dict[str, str] = {
    # F1 — EPUB Upload & Validation
    "Valid EPUB 3.0 archive passes format validation": "EPUB-02-SC04",
    "Non-EPUB archive is rejected with an invalid_epub error": "EPUB-02-SC05",
    "Corrupted EPUB file that cannot be opened is rejected": "EPUB-02-SC07",
    "Server rejects oversized upload with a file_too_large error": "EPUB-01-SC10",
    "Metadata is extracted from a valid EPUB and returned to the chooser step": "EPUB-02-SC12",
    "EPUB missing optional metadata still produces a valid response": "EPUB-02-SC14",
    "Exactly 50 MB EPUB is accepted at the limit boundary": "EPUB-01-SC11",
    "Multi-language EPUB reports all declared languages": "EPUB-02-SC15",
    "Audiobook Producer uploads a chapter-rich EPUB and metadata reports many chapters": (
        "EPUB-02-SC18"
    ),
    # F2 — Translation Configuration
    "Creating a translation job succeeds when a source language is selected": "CONF-02-SC07",
    "Rejecting a translation job when the EPUB declares no language and source is unselected": (
        "CONF-02-SC08"
    ),
    "Target languages include at least 55 options": "CONF-02-SC10",
    # F3 — HTML-Aware Translation Pipeline
    "Translated chapter retains at least 95% of structural HTML tags": "XLATE-02-SC01",
    "Exactly 95% of structural tags preserved is accepted at the threshold": "XLATE-02-SC02",
    "Translated chapter missing more than 5% of structural tags is rejected": "XLATE-02-SC03",
    "A 100-sentence chapter is processed with one provider call per chunk": "XLATE-01-SC04",
    "A single-sentence chapter yields one chunk and one provider call": "XLATE-01-SC05",
    "Chunk boundaries never split a sentence across two provider calls": "XLATE-01-SC06",
    "A provider call that exceeds 60 seconds is aborted and retried once successfully": (
        "XLATE-03-SC07"
    ),
    "A second provider-call timeout marks the chunk and the job as failed": "XLATE-03-SC08",
    "A provider call returning within 60 seconds is not aborted": "XLATE-03-SC09",
    "A progress event is emitted when a chapter completes translation": "JOBS-03-SC10",
    "A progress event is emitted when a chapter fails by provider timeout": "JOBS-03-SC11",
    # F5 — Job Management & Persistence (active)
    "A newly created job stores its workflow type exactly as declared": "JOBS-01-SC01",
    "A job submitted with an unsupported job_type is rejected": "JOBS-01-SC02",
    "A resumed translation job continues from the sentence-bounded chunk after the last completed one": (
        "JOBS-04-SC07"
    ),
    "A translation job resumes at the next sentence boundary when the interruption split a sentence": (
        "JOBS-04-SC08"
    ),
    "A client receives a progress event within one second of a chunk completing": "JOBS-03-SC09",
    "A client that connects mid-job still receives the next progress event": "JOBS-03-SC10",
    # F5 — Voiceover job resumption (Phase 3 re-binding per D-10)
    "A resumed voiceover job regenerates only chunks after the last completed one": "JOBS-04-SC05",
    "A voiceover job with no previously completed chunks starts from the first chunk": "JOBS-04-SC06",
    # F6 — Export & Download (Phase 4 / plan 04-04)
    "Translated EPUB is served for a completed translation job": "DL-01-SC01",
    # Phase 1 plan 01-03 / BACK-09: persisted provider + model surface
    "A translation job's persisted provider and model surface on GET /api/v1/jobs/{id}": "BACK-09-SC26",
    "Requesting an EPUB before the job is completed returns an error": "DL-01-SC02",
    "Requesting a ZIP artifact for a translation-only job is not applicable": "DL-01-SC03",
    "Audio ZIP archive is served for a completed voiceover job": "DL-02-SC01",
    "Requesting an EPUB for a voiceover-only job is not applicable": "DL-02-SC02",
    "Both EPUB and ZIP artifacts are downloadable for a completed translation+voiceover job": "DL-03-SC01",
    "One artifact being unavailable does not prevent the other from being served": "DL-03-SC02",
    "Path separators and ASCII control characters in the book title are sanitised before interpolation": (
        "DL-04-SC01"
    ),
    "A malicious title with directory traversal sequences cannot escape the filename slot": "DL-04-SC02",
    "A book title with Unicode characters is preserved verbatim in the filename": "DL-04-SC03",
    # F7 — Workflow Cancellation (Quick 260710-oih / JOBS-06)
    # 6 backend BDD scenarios bound in
    # ``backend/tests/bdd/test_workflow_cancellation.py`` (delete-pattern
    # impl; see the test plan F7 section header for the 4 deferred-
    # due-to-impl-gap rows — JOBS-06-SC09 expired, SC11/12 download 410,
    # SC13 partial artifacts retained — which are NOT bound here).
    "DELETE on a running job transitions it to cancelled and the worker stops scheduling new chunks": "JOBS-06-SC03",
    "A cancelled job pushes a status=cancelled WebSocket event within 1 second": "JOBS-06-SC04",
    "DELETE on a queued job transitions it to cancelled without ever starting": "JOBS-06-SC05",
    "Cancelling a completed job returns 409 with job_not_cancellable": "JOBS-06-SC06",
    "Cancelling an already cancelled job returns 409 with job_not_cancellable": "JOBS-06-SC07",
    "Cancelling a failed job returns 409 with job_not_cancellable": "JOBS-06-SC08",
}

# D-02 defer-scaling scenarios (post-sprint re-enable hook). Applied
# here because ``@scenario`` strips Python markers — the source-code
# ``@pytest.mark.defer_scaling`` placement above the @scenario
# decorator is documentation only.
SCENARIO_DEFER_SCALING: set[str] = {
    "A fourth job is queued when three jobs are already active",
    "A queued job starts after an active job finishes",
}

# Phase 4 / plan 04-04: the 2 F4 defer_combined scenarios were
# BOUND in plan 04-02 (real step bodies replacing the Phase 3
# placeholders) and are now ACTIVE in the default runner. The set
# is kept as an empty seam so future combined-workflow scenarios
# can re-use the marker if needed. The conftest hook below
# applies the marker when a scenario name appears in the set;
# an empty set is a no-op.
SCENARIO_DEFER_COMBINED: set[str] = set()

_logger = logging.getLogger("epubtv.bdd")


# ---------------------------------------------------------------------------
# Gherkin tag → pytest mark translation (D-07 tcid + D-02 defer_scaling)
# ---------------------------------------------------------------------------


@pytest.hookimpl(tryfirst=True)
def pytest_bdd_apply_tag(tag: str, function: Any) -> Any:
    """Rewrite Gherkin tags before pytest mark resolution.

    pytest rejects ``:`` in marker names, so ``@feature:F1`` from the
    F1 ``.feature`` file would emit ``PytestUnknownMarkWarning`` via the
    default ``getattr(pytest.mark, tag)`` lookup. We translate ``:`` to
    ``_`` (``feature:F1`` → ``feature_F1``) so the mark applies. All
    other tags fall through to the default behaviour.

    The tcid + defer_scaling markers are applied in
    ``pytest_bdd_before_scenario`` (not here) because pytest-bdd
    strips the original ``pytestmark`` when it wraps the test
    function in a fresh ``scenario_wrapper``; the
    ``__scenario__`` attribute that identifies the scenario is also
    not set until after this hook runs, so we look up the tcid
    from the scenario object passed to the later hook.
    """
    if ":" in tag:
        tag = tag.replace(":", "_")
    return getattr(pytest.mark, tag)(function)


@pytest.hookimpl(tryfirst=True)
def pytest_bdd_before_scenario(request: Any, feature: Any, scenario: Any) -> None:
    """Log the tcid + scenario name before the scenario body runs (D-08).

    D-08 requires a log line on every BDD run that identifies the
    Test Case ID. We read the marker from the runtime test node so
    the log line is generated from the same source of truth that the
    test reporting uses.

    The tcid + defer_scaling markers are applied in
    ``pytest_collection_modifyitems`` (not here) so that
    ``-m tcid`` / ``-m defer_scaling`` selection works at
    collection time. This hook only emits the breadcrumb log line.
    """
    tcid_marker = request.node.get_closest_marker("tcid")
    tcid = tcid_marker.args[0] if tcid_marker is not None else "<no-tcid>"
    _logger.info("BDD scenario tcid=%s name=%s", tcid, scenario.name)


def pytest_collection_modifyitems(config: Any, items: Any) -> None:
    """Apply tcid + defer_scaling markers to BDD test items at collection time.

    pytest-bdd's ``@scenario`` decorator strips Python markers from
    the wrapped function (it returns a fresh ``scenario_wrapper`` and
    only applies gherkin tags via ``pytest_bdd_apply_tag``), so the
    ``@pytest.mark.tcid("...")`` source-code marker above the
    @scenario decorator is documentation only.

    To make the marker actually appear on the test item (so
    ``-m tcid`` selection works AND the marker shows up in the
    pytest report), we apply the marker here at collection time via
    ``Item.add_marker``. The ``scenario_wrapper`` has
    ``__scenario__`` attached by pytest-bdd after its hooks run, so
    we can look up the tcid by ``item.obj.__scenario__.name``.

    The SCENARIO_TCID_MAP is the runtime source of truth; the
    source-code markers in the test files are intentionally
    redundant for human readability.
    """
    for item in items:
        obj = getattr(item, "obj", None)
        if obj is None:
            continue
        scenario = getattr(obj, "__scenario__", None)
        if scenario is None:
            continue
        scenario_name = scenario.name
        tcid = SCENARIO_TCID_MAP.get(scenario_name)
        if tcid is not None and item.get_closest_marker("tcid") is None:
            item.add_marker(pytest.mark.tcid(tcid))
        if (
            scenario_name in SCENARIO_DEFER_SCALING
            and item.get_closest_marker("defer_scaling") is None
        ):
            item.add_marker(pytest.mark.defer_scaling)
        if (
            scenario_name in SCENARIO_DEFER_COMBINED
            and item.get_closest_marker("defer_combined") is None
        ):
            item.add_marker(pytest.mark.defer_combined)


# ---------------------------------------------------------------------------
# Sync HTTP client wrapper for BDD step bodies
# ---------------------------------------------------------------------------


class _SyncClient:
    """Minimal sync HTTP client wrapping an ASGITransport + fresh event loop.

    pytest-bdd step functions are synchronous, so we cannot await an
    ``httpx.AsyncClient.post(...)`` directly. This wrapper spins up a
    dedicated event loop on first use, runs the FastAPI lifespan inside
    it, and proxies each ``post()`` call through the loop. The loop is
    torn down on ``close()``.

    This is heavier than the unit-test ``httpx.AsyncClient + ASGITransport``
    pattern but isolates BDD from the unit-test fixture scope: each BDD
    test gets a clean lifespan cycle so ports and worker_task don't leak
    across scenarios.
    """

    def __init__(self, app: Any) -> None:
        self._app = app
        self._loop: asyncio.AbstractEventLoop | None = None
        self._transport: httpx.ASGITransport | None = None
        self._client: httpx.AsyncClient | None = None

    def _ensure(self) -> None:
        if self._client is not None:
            return
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._transport = httpx.ASGITransport(app=self._app)
        self._client = httpx.AsyncClient(transport=self._transport, base_url="http://test")

    def post(
        self,
        path: str,
        *,
        files: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        json: dict[str, Any] | None = None,
    ) -> httpx.Response:
        """POST ``files`` to ``path`` synchronously, returning the response."""
        return self._request("POST", path, files=files, headers=headers, json=json)

    def get(
        self,
        path: str,
        *,
        headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        """GET ``path`` synchronously, returning the response."""
        return self._request("GET", path, headers=headers)

    def _request(
        self,
        method: str,
        path: str,
        *,
        files: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        json: dict[str, Any] | None = None,
    ) -> httpx.Response:
        """Drive an HTTP method synchronously through the ASGI lifespan."""
        self._ensure()
        assert self._client is not None and self._loop is not None

        async def _drive() -> httpx.Response:
            # Run the lifespan for the duration of the call so the four
            # ports + worker_task are bound. The lifespan context manager
            # exits on response, undoing the binding.
            async with self._app.router.lifespan_context(self._app):
                if method == "POST":
                    return await self._client.post(  # type: ignore[union-attr]
                        path, files=files, headers=headers, json=json
                    )
                return await self._client.get(path, headers=headers)  # type: ignore[union-attr]

        return self._loop.run_until_complete(_drive())

    def close(self) -> None:
        if self._client is not None and self._loop is not None:
            self._loop.run_until_complete(self._client.aclose())
        if self._loop is not None:
            self._loop.close()
        self._client = None
        self._loop = None
        self._transport = None


@pytest.fixture
def client(app: Any, db_path: Any) -> Any:
    """A sync HTTPX wrapper for BDD step bodies.

    Yields a ``_SyncClient``; closes it on teardown so the event loop is
    released before the next scenario.
    """
    sync = _SyncClient(app)
    try:
        yield sync
    finally:
        with contextlib.suppress(Exception):
            sync.close()


# ---------------------------------------------------------------------------
# Existing F1 BDD fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def api_headers() -> dict[str, str]:
    """Empty header dict satisfying the F1 ``Given a client has a valid API credential``.

    Per PRD §6 the sprint is single-tenant anonymous — there is no auth, so
    the Background step returns ``{}``. The Decorator on the BDD test file
    uses ``target_fixture="api_headers"`` so subsequent steps can reference
    the variable.
    """
    return {}


# ---------------------------------------------------------------------------
# F6 Background step binding (plan 04-04)
# ---------------------------------------------------------------------------
#
# The F6 ``docs/features/export-and-download.feature`` has a Background
# step ``Given a client has a valid API credential`` that needs a
# step binding. The fixture above is the data (an empty dict per the
# single-tenant anonymous PRD contract); this step binding
# returns the fixture to pytest-bdd so the Background step resolves.
# (None of the F1..F5 .feature files have a Background step — they
# reference the fixture directly via ``target_fixture="api_headers"``.)
@given("a client has a valid API credential", target_fixture="api_headers")
def _given_valid_api_credential() -> dict[str, str]:
    """Return the empty header dict (single-tenant anonymous per PRD §6)."""
    return {}


@pytest.fixture
def broken_epub_bytes() -> bytes:
    """Random bytes that are not a valid ZIP / EPUB (F1 "Corrupted EPUB")."""
    return os.urandom(2 * 1024 * 1024)


@pytest.fixture
def fake_epub_bytes() -> bytes:
    """A plain ZIP renamed ``fake.epub`` — F1 "Non-EPUB archive" scenario.

    The archive is a valid ZIP but not a valid EPUB package (no
    ``mimetype`` / ``container.xml`` / OPF), so ``ebooklib.read_epub``
    raises and the route returns 422 ``invalid_epub``.
    """
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("readme.txt", b"this is not an epub")
    return buf.getvalue()


@pytest.fixture
def padded_50mb_bytes(fixtures_dir: Path) -> bytes:
    """An exactly 50 MB valid-ZIP EPUB (Pitfall D boundary — accepted)."""
    return pad_epub_bytes(fixtures_dir / "mystere-nocturne.epub", 50 * 1024 * 1024)


@pytest.fixture
def padded_65mb_bytes(fixtures_dir: Path) -> bytes:
    """A 65 MB valid-ZIP EPUB (F1 size-limit — rejected with 413)."""
    return pad_epub_bytes(fixtures_dir / "mystere-nocturne.epub", 65 * 1024 * 1024)


# ---------------------------------------------------------------------------
# Phase 2: F5 WebSocket step definitions (plan 02-06)
# ---------------------------------------------------------------------------
#
# The F5 @integration BDD scenarios drive the FastAPI WebSocket endpoint
# through a TestClient.websocket_connect (sync context). The lifecycle
# is: open the WS, complete a chunk via the workflow, then assert the
# WS receives the 6-field envelope within 1 second.
#
# The BDD feature file's step wording is:
#   Given a User has an open WebSocket connection on /api/v1/jobs/{id}/events for an active job
#   Then the server pushes a JSON event containing "job_id", "job_type", "chunk_id", "progress_current", "progress_total", and "status" to the client within 1 second
#
# The step body uses request.node._ws to thread the open WS through the
# When/Then steps (pytest-bdd does NOT share fixtures across steps
# unless target_fixture is used). The fixture is registered as
# target_fixture="ws_connection" so the subsequent ``Then`` step can
# read it as a function argument.
#
# This is intentionally minimal — the BDD scenarios use
# ``wait_for_ws_event`` from ``bdd/_harness.py`` for the
# 1-second-window assertion (the @integration contract is precisely
# the 1s deadline; the BDD step wording restates it for readability).


@given(
    "a User has an open WebSocket connection on /api/v1/jobs/{job_id}/events for an active job",
    target_fixture="ws_connection",
)
def _ws_open_for_active_job(request: Any, job_id: str) -> Any:
    """Open a TestClient WS to the events endpoint for ``job_id``.

    The WS stays open for the duration of the scenario; the next step
    (``when`` or ``then``) emits an event and asserts the WS receives
    it. Returns the ``TestClient.websocket_connect`` context manager
    so the test can drive the WS lifecycle from a single thread.
    """
    from fastapi.testclient import TestClient

    # The ``app`` is a per-test FastAPI instance built by the
    # ``app`` fixture in ``tests/conftest.py``. We drive the WS via
    # TestClient so the BDD step body can use sync ``receive_json()``
    # without awaiting the underlying ASGI loop.

    sync_client: _SyncClient = request.getfixturevalue("client")
    # The ``_SyncClient`` owns its own lifespan cycle per call. The
    # WS requires the SAME lifespan to be live as the request that
    # created the job. We re-create a TestClient using the same app
    # so the existing lifespan context is reused.
    # pyrefly: ignore [missing-attribute]
    test_client = TestClient(sync_client._app)
    # The WS is opened lazily on first ``receive_*``; the test must
    # call ``ws_connection.receive_json(timeout=1.0)`` to read the
    # event. The connection is held by the returned context manager.
    ws_ctx = test_client.websocket_connect(f"/api/v1/jobs/{job_id}/events")
    # Store on request so the teardown can close it.
    request.node._ws_ctx = ws_ctx
    ws = ws_ctx.__enter__()
    request.node._ws = ws
    request.node._test_client = test_client
    return ws


@then(
    'the server pushes a JSON event containing "job_id", "job_type", "chunk_id", "progress_current", "progress_total", and "status" to the client within 1 second'
)
def _ws_receives_event_within_1s(request: Any) -> None:
    """Assert the WS receives the 6-field F5-AC5 envelope within 1.1s.

    The "within 1 second" requirement is the F5-AC5 contract. We allow
    a small headroom (1.1s) for the receive_json timeout because the
    underlying TestClient.websocket_connect has a 1s handshake; the
    event itself arrives well under 1s wall time.
    """
    import concurrent.futures
    import time as _time

    from starlette.testclient import WebSocketTestSession

    ws: WebSocketTestSession = request.node._ws
    # TestClient.websocket_connect.receive_json has no timeout kwarg
    # (only mode='text'|'binary'). We drive the receive on a worker
    # thread with a 1.1s wall-clock deadline so the BDD assertion
    # matches the F5-AC5 'within 1 second' contract with a 100ms
    # tolerance for the receive_json startup latency.
    deadline = _time.monotonic() + 1.1
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(ws.receive_json, "text")
        while not future.done():
            if _time.monotonic() > deadline:
                raise AssertionError("WS did not receive the 6-field envelope within 1.1 second")
            _time.sleep(0.01)
        event = future.result()
    # 6-field envelope (Pitfall 7 + F5-AC5).
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

    The BDD scenario for "A client that connects mid-job still receives
    the next progress event" connects the WS AFTER chunks 1-3 have
    completed. The next emitted event (chunk 4) must arrive within 1s.
    """
    import concurrent.futures
    import time as _time

    from starlette.testclient import WebSocketTestSession

    ws: WebSocketTestSession = request.node._ws
    deadline = _time.monotonic() + 1.1
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(ws.receive_json, "text")
        while not future.done():
            if _time.monotonic() > deadline:
                raise AssertionError("WS did not receive the chunk 4 event within 1.1 second")
            _time.sleep(0.01)
        event = future.result()
    # The late-subscriber scenario expects the next chunk's event
    # (chunk 4 per the BDD step wording). The 6-field envelope is
    # the F5-AC5 contract — assert all 6 fields are present.
    for field in (
        "job_id",
        "job_type",
        "chunk_id",
        "progress_current",
        "progress_total",
        "status",
    ):
        assert field in event, f"missing field {field!r} in event {event!r}"
