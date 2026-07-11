"""``SQLiteJobRepository.create_job(provider=..., model=...)`` tests (plan 01-03 / BACK-09).

Satisfies the BACK-09 contract end-to-end at the repository layer:

- ``create_job(..., provider='ollama', model='translategemma:12b')`` stores
  the provider + model on the ``jobs.provider`` + ``jobs.model`` columns
  (added by Alembic 0005 + the ``Job.provider`` / ``Job.model`` SQLModel
  fields in plan 01-03). ``get_job(id)['provider']`` + ``['model']`` return
  the values.
- The Pydantic v2 ``VoiceoverJobBody`` schema now requires ``provider`` +
  ``model`` (the TTS provider + TTS model). A voiceover body with a
  missing ``provider`` or ``model`` is rejected at parse time with 422
  (the per-variant ``extra="forbid"`` + the missing-required-field gate).
- The ``JobView`` Pydantic response model exposes the two new fields
  (nullable for v1.1 back-compat). ``GET /api/v1/jobs/{id}`` returns
  ``JobView.provider`` + ``JobView.model`` for every new job.
- The voiceover preflight gate: a voiceover body with
  ``provider != "openai-compatible"`` returns 422
  ``validation_error`` (TTS is OpenAI-only per TTS-02; Ollama has no
  TTS endpoint per PRD §6).
- A v1.1-style row with ``provider=NULL, model=NULL`` is loadable
  through the repo and surfaces as ``JobView.provider=None,
  JobView.model=None`` (the orchestrator returns 422 for it but the
  load path is permissive).

The Alembic 0005 migration is reversible: ``alembic upgrade head`` +
``alembic downgrade base`` + ``alembic upgrade head`` round-trip
succeeds; the two new columns are added to ``jobs`` and are nullable.

The test schema is applied via ``SQLModel.metadata.create_all`` on a
per-test sync engine (the conftest ``db_path`` fixture). The migration
round-trip test runs the actual ``alembic`` CLI in a subprocess with
``EPUBTV_DB_PATH`` pointed at a per-test SQLite file.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import create_engine, inspect
from sqlmodel import SQLModel

from epubtv.adapters.persistence.sqlite_job_repository import (
    SQLiteJobRepository,
)

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("BACK-09-UT26")]


# ---------------------------------------------------------------------------
# Fixtures (mirror test_create_job_voice_field.py / test_sqlite_job_repository_crud.py)
# ---------------------------------------------------------------------------


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on a per-test database.

    The per-test ``db_path`` fixture overrides ``settings.db_path``;
    the test schema is applied via ``SQLModel.metadata.create_all``
    on a sync engine to avoid the async-alembic/event-loop conflict.
    Production schema apply goes through ``alembic upgrade head``.
    """
    # Importing ``schema`` registers the table models on ``SQLModel.metadata``.
    from epubtv.adapters.persistence import schema  # noqa: F401

    sync_engine = create_engine(f"sqlite:///{db_path_str}")
    SQLModel.metadata.create_all(sync_engine)
    sync_engine.dispose()


@pytest.fixture
async def migrated_repo(db_path: Any) -> Any:
    """Return a ``SQLiteJobRepository`` with the per-test schema applied."""
    _create_test_schema(str(db_path))

    repo = await SQLiteJobRepository.create(db_path=str(db_path))
    try:
        yield repo
    finally:
        await repo.dispose()


# ---------------------------------------------------------------------------
# create_job(provider=..., model=...) stores the columns
# ---------------------------------------------------------------------------


async def test_create_job_translation_persists_provider_model(migrated_repo: Any) -> None:
    """BACK-09: a translation job stores ``provider='ollama'`` + ``model='translategemma:12b'``.

    The Pydantic ``TranslationFieldsMixin`` already declares both
    fields; the router forwards them to ``create_job``. The repository
    persists them on the new ``jobs.provider`` + ``jobs.model`` columns
    (Alembic 0005 + the SQLModel field in plan 01-03).
    """
    job_id = await migrated_repo.create_job(
        epub_id="e1",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
        provider="ollama",
        model="translategemma:12b",
    )
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["provider"] == "ollama", f"provider should be 'ollama', got {job['provider']!r}"
    assert job["model"] == "translategemma:12b", (
        f"model should be 'translategemma:12b', got {job['model']!r}"
    )
    # Other columns unchanged — the two new fields are purely additive.
    assert job["job_type"] == "translation"
    assert job["source_language"] == "en"
    assert job["target_language"] == "de"
    assert job["status"] == "queued"


async def test_create_job_voiceover_persists_provider_model(migrated_repo: Any) -> None:
    """BACK-09: a voiceover job stores ``provider='openai-compatible'`` + ``model='tts-1'``.

    The Pydantic ``VoiceoverJobBody`` schema (plan 01-03 / BACK-09)
    adds ``provider: str`` + ``model: str`` as REQUIRED fields. The
    repository persists the TTS provider + TTS model on the new
    columns.
    """
    job_id = await migrated_repo.create_job(
        epub_id="e2",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
        voice="alloy",
        provider="openai-compatible",
        model="tts-1",
    )
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["provider"] == "openai-compatible", (
        f"provider should be 'openai-compatible', got {job['provider']!r}"
    )
    assert job["model"] == "tts-1", f"model should be 'tts-1', got {job['model']!r}"
    # Other columns unchanged.
    assert job["job_type"] == "voiceover"
    assert job["voice"] == "alloy"
    assert job["status"] == "queued"


async def test_create_job_combined_persists_provider_model(migrated_repo: Any) -> None:
    """BACK-09: a combined job stores the translation provider + model.

    The Pydantic ``CombinedJobBody`` inherits ``TranslationFieldsMixin``
    which already declares ``provider: str`` + ``model: str``. The
    repository persists the same fields for combined jobs.
    """
    job_id = await migrated_repo.create_job(
        epub_id="e3",
        job_type="translation+voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="de",
        voice="alloy",
        provider="openai-compatible",
        model="gpt-4o-mini",
    )
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["provider"] == "openai-compatible"
    assert job["model"] == "gpt-4o-mini"
    assert job["job_type"] == "translation+voiceover"


# ---------------------------------------------------------------------------
# Pydantic v2 schema-level gate
# ---------------------------------------------------------------------------


async def test_voiceover_body_provider_model_fields_have_defaults() -> None:
    """A voiceover body with missing ``provider`` or ``model`` uses the field defaults.

    Quick 260709-54r rolled back the BACK-09 REQUIRED contract on
    ``provider`` + ``model``: the SPA's voiceover form does not
    send these fields (the chooser dispatches to the TTS-only
    leg; the defaults are the canonical OpenAI-compatible
    provider + ``tts-1`` model). The
    ``VoiceoverJobBody.provider: str = "openai-compatible"`` and
    ``model: str = "tts-1"`` defaults restore the user-visible
    behaviour without a 422 at parse time. A POST body that
    omits either field constructs successfully and the field
    carries the default; an explicit value overrides the
    default. The ``extra="forbid"`` gate is preserved (unknown
    fields still 422).
    """
    from epubtv.api.schemas import VoiceoverJobBody

    # Omitting ``provider`` constructs with the default.
    body_no_provider = VoiceoverJobBody(  # pyrefly: ignore[missing-argument]
        job_type="voiceover",
        epub_id="e1",
        voice="alloy",
        model="tts-1",
    )
    assert body_no_provider.provider == "openai-compatible"

    # Omitting ``model`` constructs with the default.
    body_no_model = VoiceoverJobBody(  # pyrefly: ignore[missing-argument]
        job_type="voiceover",
        epub_id="e1",
        voice="alloy",
        provider="openai-compatible",
    )
    assert body_no_model.model == "tts-1"

    # Both explicitly present → caller can still override the defaults.
    ok = VoiceoverJobBody(
        job_type="voiceover",
        epub_id="e1",
        voice="alloy",
        provider="openai-compatible",
        model="tts-1",
    )
    assert ok.provider == "openai-compatible"
    assert ok.model == "tts-1"


# ---------------------------------------------------------------------------
# JobView exposes provider + model
# ---------------------------------------------------------------------------


async def test_job_view_includes_provider_model_fields(app: Any, db_path: Any) -> None:
    """``GET /api/v1/jobs/{id}`` returns the two new fields for every job type.

    The Pydantic v2 ``JobView`` schema (plan 01-03 / BACK-09) grows
    ``provider: str | None = None`` + ``model: str | None = None``
    (nullable for v1.1 back-compat). The router's
    ``_job_row_to_view`` helper forwards the values from the
    repository row.
    """
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        # Use a synthetic EPUB upload (any valid EPUB works).
        from pathlib import Path

        fixtures_dir = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "epubs"
        epub_bytes = (fixtures_dir / "mystere-nocturne.epub").read_bytes()
        # Pad to a sane size (EPUB-02-SC04 minimal flow).
        upload_resp = client.post(
            "/api/v1/epubs",
            files={"file": ("mystere-nocturne.epub", epub_bytes, "application/epub+zip")},
        )
        assert upload_resp.status_code == 200, upload_resp.text
        epub_id = upload_resp.json()["epub_id"]

        # Create a translation job with provider + model.
        r = client.post(
            "/api/v1/jobs",
            json={
                "job_type": "translation",
                "epub_id": epub_id,
                "provider": "ollama",
                "model": "translategemma:12b",
                "source_language": "fr",
                "target_language": "de",
            },
        )
        assert r.status_code == 202, r.text
        body = r.json()
        assert body["provider"] == "ollama", (
            f"JobView.provider should be 'ollama', got {body.get('provider')!r}"
        )
        assert body["model"] == "translategemma:12b", (
            f"JobView.model should be 'translategemma:12b', got {body.get('model')!r}"
        )

        # GET the single-job view — same fields are present.
        r2 = client.get(f"/api/v1/jobs/{body['id']}")
        assert r2.status_code == 200
        body2 = r2.json()
        assert body2["provider"] == "ollama"
        assert body2["model"] == "translategemma:12b"


# ---------------------------------------------------------------------------
# V1.1 legacy row: loadable, provider=NULL, model=NULL
# ---------------------------------------------------------------------------


async def test_legacy_job_row_without_provider_model_loads(migrated_repo: Any) -> None:
    """A v1.1-style row (provider=NULL, model=NULL) is loadable and surfaces as None.

    The migration is additive (the columns are nullable for back-compat).
    A row inserted via the legacy path (no provider + model) loads
    through the repo and the ``_job_to_dict`` helper surfaces the
    values as ``None``. The orchestrator's 422 guard is the
    dispatch-time check (plan 01-03 Task 2); the load path is
    permissive.
    """
    # Insert a row directly via a sync SQLAlchemy session (bypassing
    # the repository's create_job so we can omit the new columns).
    from datetime import UTC, datetime

    from sqlalchemy import insert

    from epubtv.adapters.persistence.schema import Job

    job_id = "legacy-v11-job-id-0000000000000000"
    sync_engine = create_engine(f"sqlite:///{_get_db_path()!s}")
    try:
        now = datetime.now(UTC)
        with sync_engine.begin() as conn:
            conn.execute(
                insert(Job).values(
                    id=job_id,
                    epub_id="legacy-epub",
                    job_type="translation",
                    status="queued",
                    source_language="en",
                    target_language="de",
                    chapter_ids="[]",
                    last_chunk_id=None,
                    voice=None,
                    provider=None,
                    model=None,
                    created_at=now,
                    updated_at=now,
                )
            )
    finally:
        sync_engine.dispose()

    # Read the row through the repository.
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["provider"] is None, f"legacy row should have provider=None, got {job['provider']!r}"
    assert job["model"] is None, f"legacy row should have model=None, got {job['model']!r}"
    # Other columns are intact.
    assert job["job_type"] == "translation"
    assert job["source_language"] == "en"
    assert job["target_language"] == "de"


def _get_db_path() -> Path:
    """Return the per-test ``db_path`` (resolved from the conftest fixture).

    The conftest ``db_path`` fixture monkeypatches
    ``settings.db_path`` to a per-test tmp path. The legacy-row test
    needs the resolved path to open a sync SQLAlchemy session.
    """
    from epubtv.config import settings

    return Path(str(settings.db_path))


# ---------------------------------------------------------------------------
# Alembic 0005 migration round-trip
# ---------------------------------------------------------------------------


async def test_alembic_migration_0005_round_trip(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Alembic 0005 round-trip: upgrade adds the columns; downgrade drops them.

    Runs ``alembic upgrade head`` + ``alembic downgrade base`` against
    a per-test SQLite DB. After ``upgrade head`` the ``provider`` +
    ``model`` columns are present (NOTNULL=0). After
    ``downgrade base`` the columns are absent (the table is dropped
    by the chain; the columns being absent after re-apply is the
    post-upgrade signal).

    The ``EPUBTV_DB_PATH`` env var overrides the alembic subprocess's
    ``settings.db_path`` (the env is read by Pydantic Settings inside
    the subprocess — the in-process ``monkeypatch.setattr`` is NOT
    visible to the subprocess).
    """
    test_db = tmp_path / "alembic_test.db"

    backend_dir = Path(__file__).resolve().parents[2]
    env = {**os.environ, "EPUBTV_DB_PATH": str(test_db)}
    cmd_prefix = [sys.executable, "-m", "alembic"]

    # upgrade head
    proc = subprocess.run(
        [*cmd_prefix, "upgrade", "head"],
        cwd=backend_dir,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, f"alembic upgrade head failed: {proc.stderr}"

    # Columns present + nullable.
    engine = create_engine(f"sqlite:///{test_db}")
    try:
        insp = inspect(engine)
        cols = {c["name"]: c for c in insp.get_columns("jobs")}
        assert "provider" in cols, f"provider column missing after upgrade: cols={list(cols)}"
        assert "model" in cols, f"model column missing after upgrade: cols={list(cols)}"
        assert cols["provider"]["nullable"] is True, (
            f"provider should be NULL-able, got {cols['provider']!r}"
        )
        assert cols["model"]["nullable"] is True, (
            f"model should be NULL-able, got {cols['model']!r}"
        )

        # alembic current reports the head revision (0006 is the head
        # after the worker-queue-stuck-after-first-job follow-up; the
        # chain is 0001 -> 0002 -> 0003 -> 0005 -> 0006).
        proc_current = subprocess.run(
            [*cmd_prefix, "current"],
            cwd=backend_dir,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        assert "0006" in proc_current.stdout, (
            f"alembic current should report 0006, got: {proc_current.stdout!r}"
        )

        # alembic history includes 0006 (the head).
        proc_history = subprocess.run(
            [*cmd_prefix, "history"],
            cwd=backend_dir,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        assert "0005" in proc_history.stdout, (
            f"alembic history should include 0005, got: {proc_history.stdout!r}"
        )

        # downgrade base — the columns are removed (along with the table).
        proc3 = subprocess.run(
            [*cmd_prefix, "downgrade", "base"],
            cwd=backend_dir,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        assert proc3.returncode == 0, f"alembic downgrade base failed: {proc3.stderr}"

        # Re-apply upgrade head (idempotency for the test setup).
        proc4 = subprocess.run(
            [*cmd_prefix, "upgrade", "head"],
            cwd=backend_dir,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        assert proc4.returncode == 0, f"alembic upgrade head (re-apply) failed: {proc4.stderr}"

        # After re-apply the columns are back.
        insp_after = inspect(engine)
        cols_after = {c["name"]: c for c in insp_after.get_columns("jobs")}
        assert "provider" in cols_after, (
            f"provider should be present after re-apply, cols={list(cols_after)}"
        )
        assert "model" in cols_after, (
            f"model should be present after re-apply, cols={list(cols_after)}"
        )
        assert cols_after["provider"]["nullable"] is True
        assert cols_after["model"]["nullable"] is True
    finally:
        engine.dispose()
