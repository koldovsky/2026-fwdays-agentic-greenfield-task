"""Pytest fixtures — httpx ASGITransport against the single FastAPI app.

All tests run in-process against the single FastAPI app via
``httpx.ASGITransport`` — no real HTTP port, no separate server (TESTING.md).

Fixtures:
- ``app`` — constructs ``epubtv.api.app.app`` per-test; each test gets a
  fresh lifespan cycle so the four ports + worker task bind + dispose
  cleanly (no cross-test state leakage).
- ``client`` — async ``httpx.AsyncClient`` driving the lifespan via
  ``ASGITransport``.
- ``db_path`` — per-test temp SQLite path under ``tmp_path_factory`` so
  PRAGMA / migration tests do NOT collide with the dev ``db/epubtv.db``.
- ``virtual_clock`` — test-only clock: monkeypatches ``asyncio.sleep``
  so ``behaviour=slow`` tests do NOT actually sleep (D-04).
- ``fixtures_dir`` — path to generated EPUB fixtures (Plan 02 populates).
- ``nltk_data`` — session-scoped fixture that ensures the ``punkt_tab``
  NLTK data package is baked before any test that exercises the NLTK
  tokenizer branch runs (D-01). The download is a one-off per fresh
  environment.
- ``ffprobe_session`` — session-scoped fixture (Phase 02.1 D-06) that
  yields an ``FfprobeProbe`` helper or ``None`` if ``ffprobe`` is not
  on the host's ``PATH``. The D-06 BDD scenario
  (``backend/tests/bdd/test_documentation_video_dimensions.py``) uses
  this fixture to assert the recorded webm is exactly 1280x720 + ≥10s;
  the duration-only fallback fires when ``ffprobe`` is unavailable.

Lifecycle note: tests that need the app's lifespan to actually run (e.g.
``test_composition_root`` asserts ``app.state.*``) use ``async with
lifespan(...)`` directly; tests that just need HTTP traffic use the
``client`` fixture which owns the lifespan for the duration of its async
context manager.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import httpx
import pytest
import pytest_asyncio


@pytest.fixture
def fixtures_dir() -> Path:
    """Path to generated EPUB fixtures (Plan 02 populates via ``build_fixtures.py``)."""
    return Path(__file__).resolve().parent / "fixtures" / "epubs"


@pytest.fixture(autouse=True)
def _reset_alembic_cache() -> None:
    """Reset the ``db_migrations._alembic_upgrade_done`` module-level cache.

    The lifespan's alembic invocation is gated by an in-process
    flag so the BDD ``_SyncClient._drive`` pattern (one lifespan
    per HTTP call) does not pay the per-call alembic-engine
    startup cost. The unit-test ``db_path`` fixture gives every
    test a fresh tmp SQLite path; the alembic cache MUST reset per
    test so the in-process ``alembic.command.upgrade`` actually
    runs against the new path (otherwise the second test's
    lifespan skips the migration and the per-test tmp DB has no
    schema).
    """
    import epubtv.tools.db_migrations as _db_migrations

    _db_migrations._alembic_upgrade_done = False
    yield
    _db_migrations._alembic_upgrade_done = False


@pytest.fixture
def db_path(tmp_path_factory: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Return a per-test SQLite path; overrides ``settings.db_path`` so tests
    do NOT collide with the dev ``db/epubtv.db``.

    Also ensures ``settings.scratch_dir`` points at a tmp path so
    ``LocalFileStore`` writes do NOT pollute the dev scratch dir.

    Quick 260708-t1t + ADR 0013: the lifespan's in-process
    ``run_alembic_upgrade`` reads the current ``settings.db_path``
    via the ``EPUBTV_DB_PATH`` env var (the unit-test
    ``db_path`` fixture ``monkeypatch.setenv`` after the parent
    process imports ``epubtv.config.settings``, so the
    pydantic-settings cached field is stale) and forwards the
    sqlite+aiosqlite URL to the alembic ``Config``. The lifespan's
    alembic call is the schema-apply step; we no longer pre-create
    tables via ``SQLModel.metadata.create_all`` (that race-
    conditions with the alembic migration, which fails on
    "table jobs already exists"). The function-scoped tmp dir
    means each test gets a fresh database — the per-test
    ``tmp_path_factory.mktemp`` deletes the directory on teardown.
    """
    tmp = tmp_path_factory.mktemp("epubtv_db")
    db = tmp / "epubtv.db"
    scratch = tmp_path_factory.mktemp("epubtv_scratch")

    from epubtv.config import settings

    monkeypatch.setattr(settings, "db_path", db)
    monkeypatch.setattr(settings, "scratch_dir", scratch)
    # prod-only static serving is not exercised in tests.
    monkeypatch.setattr(settings, "serve_static", False)

    # Import the schema module so the SQLModel metadata is populated
    # (the alembic env.py uses it). The lifespan runs the migration
    # against the per-test tmp db; no ``create_all`` here (the
    # alembic migration owns the schema).
    from epubtv.adapters.persistence import schema  # noqa: F401  -- register models

    return db


@pytest.fixture
def virtual_clock(monkeypatch: pytest.MonkeyPatch) -> dict[str, float]:
    """Test-only virtual clock — swaps ``asyncio.sleep`` so ``behaviour=slow``
    tests do NOT actually sleep (D-04).

    Returns a dict so tests can introspect the virtual-time elapsed.
    """
    elapsed: dict[str, float] = {"slept": 0.0}

    async def _fake_sleep(seconds: float) -> None:
        elapsed["slept"] += float(seconds)

    monkeypatch.setattr(asyncio, "sleep", _fake_sleep)
    return elapsed


@pytest.fixture(scope="session")
def nltk_data() -> None:
    """Ensure the NLTK ``punkt_tab`` package is baked.

    Idempotent: ``bake()`` guards the download with ``nltk.data.find``
    so the second call in the same environment is a no-op. Used by
    NLTK branch tests (e.g. ``test_sentence_chunker``). The
    ``SentenceChunker`` module-import guard skips the bake when
    ``EPUBTV_BAKE_NLTK=1`` is NOT set (TESTING.md); this fixture
    bakes directly so unit tests do NOT have to set the env knob.
    """
    from epubtv.tools.bake_nltk import bake

    bake()


# ---------------------------------------------------------------------------
# Chapter HTML fixture auto-regeneration.
# ---------------------------------------------------------------------------
#
# ``tests/fixtures/chapters/*.html`` are gitignored generated outputs from
# the sibling ``build_*.py`` scripts. If they are missing (fresh clone,
# nuked ``.gitignore``-ignored tree, CI cache miss), tests that read them
# (notably ``test_sentence_chunker``) fail with ``FileNotFoundError`` before
# exercising any assertion. This session-scoped autouse fixture regenerates
# whichever outputs are absent — the build scripts are deterministic
# (hand-crafted sentences + static HTML) and the regeneration is cheap
# (microseconds). The fixture is autouse so it runs before any test that
# imports ``backend/tests/conftest.py``; the per-file build script is only
# invoked when its output is missing.
@pytest.fixture(scope="session", autouse=True)
def _ensure_chapter_fixtures() -> None:
    chapters_dir = Path(__file__).resolve().parent / "fixtures" / "chapters"
    for script in ("build_100_sentences.py", "build_structural_tags_20.py"):
        out_name = script.replace("build_", "").replace(".py", ".html")
        if not (chapters_dir / out_name).exists():
            subprocess.run(  # noqa: S603 — deterministic local dev script
                [sys.executable, str(chapters_dir / script)],  # noqa: S607
                check=True,
                cwd=chapters_dir,
            )


# ---------------------------------------------------------------------------
# Phase 02.1 (plan 02.1-03, D-06): ffprobe session fixture.
# ---------------------------------------------------------------------------
#
# The D-06 BDD scenario in ``backend/tests/bdd/test_documentation_video_dimensions.py``
# spawns ``npx playwright test`` as a subprocess (with the corrected
# ``.agents/skills/document-bdd-feature/scripts/playwright.video.config.ts``) and
# needs to assert the resulting ``.webm`` is exactly 1280x720 + ≥10s duration.
# This fixture provides a session-scoped ``FfprobeProbe`` helper that wraps
# ``ffprobe`` invocations. When ``ffprobe`` is NOT on the host's ``PATH``
# (e.g. on a CI runner without ffmpeg installed), the fixture yields
# ``None`` and the BDD test falls back to a duration-only assertion
# (which is satisfiable only when the host has Playwright's own
# --reporter=json metadata — see the D-06 test for the exact path).


_logger = logging.getLogger("epubtv.tests")


class FfprobeProbe:
    """Thin wrapper around the host's ``ffprobe`` binary.

    The two methods (``probe_dimensions`` and ``probe_duration``) both
    shell out to ``ffprobe`` with a single field of interest and parse
    the ``-of csv=p=0`` output. The subprocess is short-lived and
    captures stdout as text (ffprobe's default output is a single line
    for the requested field).

    The helper is intentionally minimal: it does not parse the full
    ffprobe JSON envelope (the BDD scenario only needs two scalar
    fields), and it does not retry on transient errors. If a BDD test
    sees a ``CalledProcessError`` it should fail loudly — that means
    the recording was unreadable, which IS the bug the D-06 assertion
    is meant to catch.
    """

    def probe_dimensions(self, webm_path: Path) -> tuple[int, int]:
        """Return ``(width, height)`` of the first video stream in ``webm_path``.

        Uses ``ffprobe -v error -select_streams v:0 -show_entries
        stream=width,height -of csv=p=0`` which prints a single line
        like ``1280,720`` on stdout. The trailing newline is stripped
        by ``text=True`` + ``.strip()``.

        Raises ``FileNotFoundError`` (from subprocess) if ``webm_path``
        does not exist, and ``CalledProcessError`` if ffprobe returns
        non-zero (e.g. corrupted webm).
        """
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=width,height",
                "-of",
                "csv=p=0",
                str(webm_path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        width_str, height_str = result.stdout.strip().split(",")
        return int(width_str), int(height_str)

    def probe_duration(self, webm_path: Path) -> float:
        """Return the container duration in seconds for ``webm_path``.

        Uses ``ffprobe -v error -show_entries format=duration -of csv=p=0``
        which prints a single float (e.g. ``12.345000``) on stdout.

        Raises ``CalledProcessError`` if ffprobe returns non-zero.
        """
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "csv=p=0",
                str(webm_path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        return float(result.stdout.strip())


@pytest.fixture(scope="session")
def ffprobe_session() -> FfprobeProbe | None:
    """Session-scoped ``ffprobe`` helper for the D-06 BDD scenario.

    Probes ``ffprobe`` availability via ``shutil.which`` at session
    start. If available: yields an :class:`FfprobeProbe` helper. If
    unavailable: yields ``None`` and logs a WARNING so the test report
    shows the fallback mode is in use.

    The fixture is intentionally session-scoped (one ffprobe process is
    amortized across the suite) and uses ``scope="session"`` to match
    the slow fixture pattern (one-time host inspection).
    """
    ffprobe_path = shutil.which("ffprobe")
    if ffprobe_path is None:
        _logger.warning(
            "ffprobe not found on PATH; D-06 BDD scenario will fall back to "
            "duration-only assertion (the host's package manager can install "
            "ffmpeg/ffprobe to enable the full dimension+duration check)"
        )
        return None
    _logger.info(
        "ffprobe found at %s; D-06 BDD scenario will use full dimension+duration assertion",
        ffprobe_path,
    )
    return FfprobeProbe()


@pytest_asyncio.fixture
async def app(db_path: Path) -> Any:
    """Construct the FastAPI app with the per-test ``db_path`` overridden.

    Imports inside the fixture so the monkeypatch on ``settings.db_path``
    is applied before ``epubtv.api.app`` reads it. We construct a fresh
    app instance per test so lifespan state (ports, worker_task) does not
    leak across tests.
    """
    # Late import so the db_path/scratch_dir monkeypatch takes effect first.
    from epubtv.api.app import create_app

    return create_app()


# pyrefly: ignore [no-matching-overload]
@pytest_asyncio.fixture
# pyrefly: ignore [bad-return]
async def client(app: Any) -> httpx.AsyncClient:
    """Async ``httpx.AsyncClient`` driving the lifespan via ``ASGITransport``.

    The_async_ context manager ``async with httpx.AsyncClient(...)`` runs
    the lifespan startup + shutdown for the duration of the test.
    """
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        # Trigger lifespan startup explicitly.
        with contextlib.suppress(Exception):
            # httpx does NOT auto-run lifespan for ASGITransport; use
            # the lifespan context manager explicitly to bind ports.
            async with app.router.lifespan_context(app):
                yield ac


# Provide a synchronous ``app`` getter for tests that do NOT want the lifespan
# to run automatically (e.g. ``test_composition_root`` drives the lifespan
# explicitly inside the test). This is the same ``app`` fixture above; the
# section is just a marker so the intent is explicit.
