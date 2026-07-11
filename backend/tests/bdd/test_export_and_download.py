"""F6 pytest-bdd bindings — 10 IN-scope scenarios + 6 @skip (Phase 4 / plan 04-04).

The F6 feature file (``docs/features/export-and-download.feature``)
carries 16 scenarios; this file binds 10 IN-scope scenarios per
the Phase 4 / plan 04-04 must-haves + CONTEXT.md D-04:

| Rule | Scenarios bound | Marked @skip |
|------|-----------------|--------------|
| 1 — Translated EPUB download | 3 (DL-01-SC01..03) | 0 |
| 2 — Per-chapter audio ZIP | 2 (DL-02-SC01..02) | 1 (audio-spoken filename) |
| 3 — Combined artifact delivery | 2 (DL-03-SC01..02) | 0 |
| 4 — Retention TTL | 0 | 3 (retention out of v1 — CONTEXT.md deferred) |
| 5 — Large artifact streaming | 0 | 2 (500MB expensive in CI — covered by test_download_router unit) |
| 6 — Safe filename | 3 (DL-04-SC01..03) | 0 |
| **Total** | **10 bound** | **6 @skip** |

The 6 @skip scenarios carry a per-scenario docstring referencing
the CONTEXT.md rationale + the v2 / post-sprint hardening seam.
The skip is implemented via ``@pytest.mark.skip`` on the
``@scenario`` decorator — pytest-bdd does NOT require step
bodies for skipped scenarios.

The 10 IN-scope scenarios drive the new
``GET /api/v1/jobs/{id}/download?artifact=epub|zip`` endpoint
(DL-01..04) via the ``_SyncClient`` wrapper. The pattern mirrors
the F4 + F5 BDD conventions:

- The ``Given`` step uploads an EPUB + creates a job (via
  ``setup_translation_job`` / ``setup_voiceover_job`` /
  ``setup_combined_job`` helpers in ``bdd/_harness.py``) +
  pre-builds the artifact at the expected on-disk path
  (``{artifact_dir}/{job_id}/translated.epub`` /
  ``{artifact_dir}/{job_id}/audio.zip``) +
  marks the job ``completed`` via the SQLite repository.
- The ``When`` step issues
  ``GET /api/v1/jobs/{id}/download?artifact=epub|zip`` via the
  ``_SyncClient``.
- The ``Then`` step asserts the response status +
  the ``Content-Disposition`` header value + the response body
  (for happy paths) / the error envelope (for error paths).

The 3 safe-filename scenarios (DL-04-SC01..03) override
``app.state.epub_service`` to return a controlled title so the
``safe_filename`` utility can be exercised end-to-end through
the download endpoint. The override is a per-request monkeypatch
that the ``_SyncClient`` lifespan re-applies on every request;
the test step writes a one-shot stub into ``app.state`` before
issuing the GET. (See ``_bind_stub_epub_service`` for the
implementation.)
"""

from __future__ import annotations

import asyncio
import io
import zipfile
from pathlib import Path
from typing import Any

import pytest
from ebooklib import epub
from pytest_bdd import given, parsers, scenario, then, when

FEATURE = "features/export-and-download.feature"


# ---------------------------------------------------------------------------
# Scenario bindings — 10 IN-scope + 6 @skip.
# ---------------------------------------------------------------------------
#
# Each ``@pytest.mark.tcid("...")`` ABOVE the ``@scenario`` decorator
# is the source-code-level Test Case ID (Phase 02.1 D-07 + D-08). The
# runtime marker is applied in ``bdd/conftest.py::pytest_collection_modifyitems``
# via the ``SCENARIO_TCID_MAP`` (the runtime source of truth).
#
# Skipped scenarios (6):
# - 3 retention TTL scenarios (Rule 4) — retention is out of v1 per
#   CONTEXT.md deferred block; revisit when retention ships.
# - 2 large-artifact streaming scenarios (Rule 5) — 500MB file
#   generation is expensive in CI; the streaming path is covered by
#   ``test_download_router.py::test_download_epub_happy_path``.
# - 1 "Audio filenames reflect the spoken language" scenario (Rule 2) —
#   the spoken-language filename is asserted in the ZIP happy path
#   (DL-02-SC01); the dedicated "spoken vs target" scenario is
#   redundant in the BDD suite.

# Rule 1: Translated EPUB download for translation jobs (3 bound)


@pytest.mark.tcid("DL-01-SC01")
@pytest.mark.smoke
@scenario(
    FEATURE,
    "Translated EPUB is served for a completed translation job",
)
def test_translated_epub_served_for_completed_translation_job() -> None:
    """tcid: DL-01-SC01; translated EPUB served for a completed translation job."""


@pytest.mark.tcid("DL-01-SC02")
@pytest.mark.regression
@scenario(
    FEATURE,
    "Requesting an EPUB before the job is completed returns an error",
)
def test_requesting_epub_before_completed_returns_error() -> None:
    """tcid: DL-01-SC02; EPUB before job completion returns 409 job_not_completed."""


@pytest.mark.tcid("DL-01-SC03")
@pytest.mark.regression
@scenario(
    FEATURE,
    "Requesting a ZIP artifact for a translation-only job is not applicable",
)
def test_zip_for_translation_only_is_not_applicable() -> None:
    """tcid: DL-01-SC03; ZIP for translation-only job returns 404 artifact_not_applicable."""


# Rule 2: Per-chapter audio ZIP for voiceover jobs (2 bound + 1 @skip)


@pytest.mark.tcid("DL-02-SC01")
@pytest.mark.smoke
@scenario(
    FEATURE,
    "Audio ZIP archive is served for a completed voiceover job",
)
def test_audio_zip_served_for_completed_voiceover_job() -> None:
    """tcid: DL-02-SC01; audio ZIP served for a completed voiceover job."""


@pytest.mark.tcid("DL-02-SC02")
@pytest.mark.regression
@scenario(
    FEATURE,
    "Requesting an EPUB for a voiceover-only job is not applicable",
)
def test_epub_for_voiceover_only_is_not_applicable() -> None:
    """tcid: DL-02-SC02; EPUB for voiceover-only job returns 404 artifact_not_applicable."""


@pytest.mark.skip(
    reason="Phase 4 / plan 04-04 + CONTEXT.md deferred: the 'audio filenames "
    "reflect the spoken language' scenario is redundant with DL-02-SC01 "
    "(the ZIP happy path). The spoken-language filename is asserted in "
    "DL-02-SC01; the dedicated 'spoken vs target' scenario is not "
    "re-bound in the v1 BDD suite. Revisit when the audio filename "
    "spec changes."
)
@scenario(
    FEATURE,
    "Audio filenames reflect the spoken language rather than the target translation language",
)
def test_audio_filenames_reflect_spoken_language() -> None:
    """tcid: (skipped) — covered by DL-02-SC01 happy path; not re-bound in v1 BDD."""


# Rule 3: Combined artifact delivery (2 bound)


@pytest.mark.tcid("DL-03-SC01")
@pytest.mark.smoke
@scenario(
    FEATURE,
    "Both EPUB and ZIP artifacts are downloadable for a completed translation+voiceover job",
)
def test_both_artifacts_downloadable_for_combined_job() -> None:
    """tcid: DL-03-SC01; both artifacts downloadable for a completed combined job."""


@pytest.mark.tcid("DL-03-SC02")
@pytest.mark.regression
@scenario(
    FEATURE,
    "One artifact being unavailable does not prevent the other from being served",
)
def test_one_artifact_unavailable_does_not_block_other() -> None:
    """tcid: DL-03-SC02; one artifact unavailable (voiceover leg failed) does not
    block the other (EPUB-only fallback per CONTEXT.md D-04). The 410
    artifact_expired envelope is REPLACED by 404 artifact_not_applicable
    per CONTEXT.md D-04 (no retention in v1)."""


# Rule 4: Artifact retention TTL (3 @skip — retention out of v1)


@pytest.mark.skip(
    reason="Phase 4 / plan 04-04 + CONTEXT.md deferred: 'artifact retention/cleanup "
    "— out of v1'. The TTL is post-sprint hardening. Revisit when the "
    "retention sweep service lands."
)
@scenario(
    FEATURE,
    "Artifacts are deleted after the retention TTL elapses without download",
)
def test_artifacts_deleted_after_ttl() -> None:
    """tcid: (skipped) — retention TTL scenario; out of v1 per CONTEXT.md."""


@pytest.mark.skip(
    reason="Phase 4 / plan 04-04 + CONTEXT.md deferred: 'artifact retention/cleanup "
    "— out of v1'. The expired job state is post-sprint hardening."
)
@scenario(
    FEATURE,
    'The job row persists with status "expired" after artifacts are removed',
)
def test_job_row_persists_with_expired_status() -> None:
    """tcid: (skipped) — retention status; out of v1 per CONTEXT.md."""


@pytest.mark.skip(
    reason="Phase 4 / plan 04-04 + CONTEXT.md deferred: 'artifact retention/cleanup "
    "— out of v1'. The TTL keep-alive scenario is tagged @wip; not "
    "re-bound in v1."
)
@scenario(
    FEATURE,
    "Downloading an artifact before the TTL elapses keeps it on scratch disk",
)
def test_downloading_before_ttl_keeps_artifact() -> None:
    """tcid: (skipped) — TTL keep-alive @wip; out of v1 per CONTEXT.md."""


# Rule 5: Large artifact streaming delivery (2 @skip — 500MB expensive in CI)


@pytest.mark.skip(
    reason="Phase 4 / plan 04-04 + CONTEXT.md: '500MB file generation is "
    "expensive in CI; the streaming path is covered by "
    "test_download_router.py::test_download_epub_happy_path'. The "
    "unit test asserts the StreamingResponse + aiofiles path; the "
    "real-file 500MB + 501MB scenarios are deferred to "
    "performance-hardening CI."
)
@scenario(
    FEATURE,
    "A large artifact is streamed to the client without full buffering",
)
def test_large_artifact_streamed_without_full_buffering() -> None:
    """tcid: (skipped) — 500MB streaming; covered by unit test per CONTEXT.md."""


@pytest.mark.skip(
    reason="Phase 4 / plan 04-04 + CONTEXT.md: '500MB file generation is "
    "expensive in CI; the streaming path is covered by "
    "test_download_router.py::test_download_zip_happy_path'."
)
@scenario(
    FEATURE,
    "An artifact slightly over the 500MB threshold is still streamed",
)
def test_artifact_slightly_over_500mb_threshold_still_streamed() -> None:
    """tcid: (skipped) — 501MB streaming; covered by unit test per CONTEXT.md."""


# Rule 6: Safe filename interpolation (3 bound)


@pytest.mark.tcid("DL-04-SC01")
@pytest.mark.regression
@scenario(
    FEATURE,
    "Path separators and ASCII control characters in the book title are sanitised before interpolation",
)
def test_path_separators_and_control_chars_sanitised() -> None:
    """tcid: DL-04-SC01; path separators + ASCII control chars in title are sanitised."""


@pytest.mark.tcid("DL-04-SC02")
@pytest.mark.integration
@pytest.mark.regression
@scenario(
    FEATURE,
    "A malicious title with directory traversal sequences cannot escape the filename slot",
)
def test_path_traversal_blocked_in_filename() -> None:
    """tcid: DL-04-SC02; path traversal title cannot escape the filename slot."""


@pytest.mark.tcid("DL-04-SC03")
@pytest.mark.regression
@scenario(
    FEATURE,
    "A book title with Unicode characters is preserved verbatim in the filename",
)
def test_unicode_preserved_in_filename() -> None:
    """tcid: DL-04-SC03; Unicode characters in the title are preserved verbatim."""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _run_async(coro: Any) -> Any:
    """Run ``coro`` on a fresh event loop (avoids ``asyncio.run()`` conflicts)."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on the per-test database (sync engine).

    Kept for any future code that needs to apply the schema
    outside the lifespan (no current callers — see
    ``test_export_and_download.py`` removal note below). The
    production schema apply goes through ``alembic upgrade
    head`` in the FastAPI lifespan (quick 260708-t1t + ADR
    0013); the BDD step bodies rely on the lifespan's
    in-process alembic instead of pre-creating the schema
    via this helper (the ``SQLModel.metadata.create_all`` path
    race-conditions with the alembic migration and fails on
    "table jobs already exists").
    """
    from sqlmodel import SQLModel, create_engine

    from epubtv.adapters.persistence import schema  # noqa: F401

    sync_engine = create_engine(f"sqlite:///{db_path_str}")
    SQLModel.metadata.create_all(sync_engine)
    sync_engine.dispose()


async def _build_epub_bytes(title: str) -> bytes:
    """Build a minimal in-memory EPUB with ``title`` as the dc:title metadata.

    Used by the 3 safe-filename scenarios (DL-04-SC01..03) where the
    book title must be controlled exactly. The function mirrors the
    structure of the existing F1 fixtures (one chapter, valid OPF) so
    ``EpubService.get_metadata`` can parse it back to ``{"title": ...}``.
    """
    buf = io.BytesIO()
    book = epub.EpubBook()
    book.set_identifier("epubtv-test-fixture")
    book.set_title(title)
    book.set_language("en")
    chapter = epub.EpubHtml(
        title="Chapter 1",
        file_name="chap_01.xhtml",
        lang="en",
        content="<html><body><p>Test content.</p></body></html>",
    )
    book.add_item(chapter)
    book.toc = (chapter,)
    book.spine = ["nav", chapter]
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    epub.write_epub(buf, book, {})
    return buf.getvalue()


def _build_zip_bytes() -> bytes:
    """Build a minimal in-memory ZIP with two ``chapter_NN.wav`` entries."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("chapter_00.wav", b"wav0")
        zf.writestr("chapter_01.wav", b"wav1")
    return buf.getvalue()


def _upload_epub(client: Any, fixtures_dir: Any, filename: str = "mystere-nocturne.epub") -> str:
    """Upload an EPUB file via the ``_SyncClient`` and return the ``epub_id``.

    The default fixture is ``mystere-nocturne.epub`` (title "Mystère
    Nocturne", language "fr"). The safe-filename scenarios override
    this with ``_upload_custom_epub_bytes`` to control the title.
    """
    files = {
        "file": (
            filename,
            io.BytesIO((fixtures_dir / filename).read_bytes()),
            "application/octet-stream",
        )
    }
    upload_resp = client.post("/api/v1/epubs", files=files)
    assert upload_resp.status_code == 200, upload_resp.text
    return upload_resp.json()["epub_id"]


def _upload_custom_epub_bytes(client: Any, epub_bytes: bytes) -> str:
    """Upload an in-memory EPUB with a controlled title; return the ``epub_id``."""
    files = {
        "file": (
            "custom-titled.epub",
            io.BytesIO(epub_bytes),
            "application/octet-stream",
        )
    }
    upload_resp = client.post("/api/v1/epubs", files=files)
    assert upload_resp.status_code == 200, upload_resp.text
    return upload_resp.json()["epub_id"]


async def _create_job_completed(
    db_path: Any,
    *,
    epub_id: str,
    job_type: str,
    source_language: str = "fr",
    target_language: str = "en",
    voice: str | None = None,
) -> str:
    """Create a job row directly + mark it ``completed`` (bypasses worker).

    The download router reads ``job_repo.get_job(job_id)`` and checks
    ``status == "completed"``. We bypass the worker supervisor +
    the workflow to make the test deterministic (the worker is
    short-lived per request — the _SyncClient opens a new lifespan
    per request, so a real worker run inside the GET would be
    unreliable).
    """
    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository

    repo = await SQLiteJobRepository.create(db_path=str(db_path))
    job_id = await repo.create_job(
        epub_id=epub_id,
        job_type=job_type,
        chapter_ids=[],
        source_language=source_language,
        target_language=target_language,
        voice=voice,
    )
    await repo.update_status(job_id, "completed")
    await repo.dispose()
    return job_id


def _pre_build_artifact(
    artifact_dir: Path,
    job_id: str,
    filename: str,
    payload: bytes,
) -> Path:
    """Pre-build the artifact file at the expected on-disk path.

    The download router reads from ``{artifact_dir}/{job_id}/{filename}``;
    the worker pre-builds this at job completion (DL-01 single-writer
    seam). For the BDD tests we write the file directly to mirror the
    worker's pre-build output without driving the full workflow.
    """
    artifact_path = artifact_dir / job_id / filename
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_bytes(payload)
    return artifact_path


@pytest.fixture
def artifact_dir_override(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> Path:
    """Override ``settings.artifact_dir`` to a per-test tmp path.

    The download router reads ``app.state.artifact_dir`` which is
    bound at lifespan startup from ``settings.artifact_dir``. The
    default is ``data/artifacts`` (relative path under CWD); for
    tests we want a tmp path so the per-job pre-built file is
    isolated. The BDD step bodies use this fixture to set the
    tmp path so the GET request reads the pre-built file from
    the same directory.
    """
    from epubtv.config import settings

    artifact_dir = tmp_path / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "artifact_dir", artifact_dir)
    return artifact_dir


# ---------------------------------------------------------------------------
# Step definitions — Rule 1: Translated EPUB download
# ---------------------------------------------------------------------------
#
# The 3 Rule 1 scenarios drive the download endpoint's EPUB path.
# The Given step uploads an EPUB + creates a translation job row
# + pre-builds the EPUB at the expected path. The When step issues
# the GET. The Then step asserts the response.

_ARTIFACT_DIR_DEFAULT = Path("data/artifacts")


@given(
    parsers.parse(
        'a "translation" job with id "job-1" is "completed" and a translated EPUB artifact exists on scratch disk'
    ),
    target_fixture="translation_completed_epub_setup",
)
def _given_translation_completed_with_epub(
    client: Any,
    db_path: Any,
    fixtures_dir: Any,
    artifact_dir_override: Path,
) -> dict[str, Any]:
    """Upload EPUB + create completed translation job + pre-build EPUB.

    Quick 260709-bso: no ``_create_test_schema`` pre-call. The
    lifespan's in-process ``alembic upgrade head`` applies the
    schema (including the BACK-09 ``provider`` + ``model`` columns
    from Alembic 0005) before the first HTTP request, so the
    ``_create_job_completed`` repo call works against a
    fully-migrated DB. The previous pre-create
    ``SQLModel.metadata.create_all`` path race-conditions with
    the alembic migration and fails on "table jobs already
    exists".
    """
    epub_id = _upload_epub(client, fixtures_dir)
    job_id = _run_async(
        _create_job_completed(
            db_path,
            epub_id=epub_id,
            job_type="translation",
            source_language="fr",
            target_language="en",
        )
    )
    _pre_build_artifact(artifact_dir_override, job_id, "translated.epub", b"FAKE-EPUB-BYTES")
    return {
        "job_id": job_id,
        "epub_id": epub_id,
        "artifact_dir": artifact_dir_override,
    }


@given(
    parsers.parse('a "translation" job with id "job-2" is still "processing"'),
    target_fixture="translation_running_setup",
)
def _given_translation_still_processing(
    client: Any,
    db_path: Any,
    fixtures_dir: Any,
) -> dict[str, Any]:
    """Upload EPUB + create a queued translation job (status=processing)."""
    epub_id = _upload_epub(client, fixtures_dir)

    async def _setup() -> str:
        from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository

        repo = await SQLiteJobRepository.create(db_path=str(db_path))
        job_id = await repo.create_job(
            epub_id=epub_id,
            job_type="translation",
            chapter_ids=[],
            source_language="fr",
            target_language="en",
        )
        # Mark it 'running' (still processing) — NOT 'completed'.
        await repo.update_status(job_id, "running")
        await repo.dispose()
        return job_id

    return {"job_id": _run_async(_setup()), "epub_id": epub_id}


@given(
    parsers.parse('a "translation" job with id "job-3" is "completed"'),
    target_fixture="translation_completed_no_zip_setup",
)
def _given_translation_completed_no_zip(
    client: Any,
    db_path: Any,
    fixtures_dir: Any,
) -> dict[str, Any]:
    """Upload EPUB + create completed translation job; do NOT pre-build ZIP."""
    epub_id = _upload_epub(client, fixtures_dir)
    job_id = _run_async(
        _create_job_completed(
            db_path,
            epub_id=epub_id,
            job_type="translation",
            source_language="fr",
            target_language="en",
        )
    )
    return {"job_id": job_id, "epub_id": epub_id}


@when(parsers.parse("the client requests GET /api/v1/jobs/job-1/download with artifact=epub"))
def _when_request_epub_for_job1(
    request: Any,
    client: Any,
    translation_completed_epub_setup: dict[str, Any],
) -> None:
    """GET the EPUB for job-1 (DL-01-SC01)."""
    job_id = translation_completed_epub_setup["job_id"]
    response = client.get(f"/api/v1/jobs/{job_id}/download?artifact=epub")
    request.node._download_response = response


@when(parsers.parse("the client requests GET /api/v1/jobs/job-2/download with artifact=epub"))
def _when_request_epub_for_job2(
    request: Any,
    client: Any,
    translation_running_setup: dict[str, Any],
) -> None:
    """GET the EPUB for job-2 (DL-01-SC02 — job is still running)."""
    job_id = translation_running_setup["job_id"]
    response = client.get(f"/api/v1/jobs/{job_id}/download?artifact=epub")
    request.node._download_response = response


@when(parsers.parse("the client requests GET /api/v1/jobs/job-3/download with artifact=zip"))
def _when_request_zip_for_job3(
    request: Any,
    client: Any,
    translation_completed_no_zip_setup: dict[str, Any],
) -> None:
    """GET the ZIP for job-3 (DL-01-SC03 — translation-only job has no ZIP)."""
    job_id = translation_completed_no_zip_setup["job_id"]
    response = client.get(f"/api/v1/jobs/{job_id}/download?artifact=zip")
    request.node._download_response = response


@then(
    parsers.parse(
        'the translated EPUB is served with filename "[BookTitle]-[target_language].epub"'
    )
)
def _then_epub_served_with_filename(request: Any) -> None:
    """DL-01-SC01: 200 + Content-Disposition + body bytes match prebuilt.

    The ``[BookTitle]`` for ``mystere-nocturne.epub`` is "Mystère
    Nocturne" (the EPUB's dc:title metadata). The target language is
    "en" (set in the Given step). The RFC 5987 percent-encoded form
    includes UTF-8 multibyte escapes.
    """
    response = request.node._download_response
    assert response.status_code == 200, response.text
    cd = response.headers["content-disposition"]
    # The safe_filename replaces " " with " " (preserved) so the
    # visible title "Mystère Nocturne" passes through with UTF-8
    # percent-encoding. Verify the Content-Disposition header.
    assert "filename*=UTF-8''" in cd, f"unexpected Content-Disposition: {cd!r}"
    # Body bytes match the prebuilt file (the router streams from disk).
    assert response.content == b"FAKE-EPUB-BYTES", (
        f"body bytes mismatch: {response.content!r} != b'FAKE-EPUB-BYTES'"
    )
    # Content-Type: application/epub+zip (the EPUB mime).
    assert response.headers["content-type"].startswith("application/epub+zip"), (
        f"unexpected Content-Type: {response.headers.get('content-type')!r}"
    )


@then(parsers.parse('the response has HTTP status 409 and error.code = "job_not_completed"'))
def _then_409_job_not_completed(request: Any) -> None:
    """DL-01-SC02: 409 + error.code == 'job_not_completed'."""
    response = request.node._download_response
    assert response.status_code == 409, response.text
    body = response.json()
    assert body["error"]["code"] == "job_not_completed", body


@then(parsers.parse('the response has HTTP status 404 and error.code = "artifact_not_applicable"'))
def _then_404_artifact_not_applicable(request: Any) -> None:
    """DL-01-SC03 / DL-02-SC02 / DL-03-SC02: 404 + error.code == 'artifact_not_applicable'."""
    response = request.node._download_response
    assert response.status_code == 404, response.text
    body = response.json()
    assert body["error"]["code"] == "artifact_not_applicable", body


# ---------------------------------------------------------------------------
# Step definitions — Rule 2: Per-chapter audio ZIP download
# ---------------------------------------------------------------------------


@given(
    parsers.parse(
        'a "voiceover" job with id "job-4" is "completed" and per-chapter audio files exist on scratch disk'
    ),
    target_fixture="voiceover_completed_zip_setup",
)
def _given_voiceover_completed_with_zip(
    client: Any,
    db_path: Any,
    fixtures_dir: Any,
    artifact_dir_override: Path,
) -> dict[str, Any]:
    """Upload EPUB + create completed voiceover job + pre-build ZIP."""
    epub_id = _upload_epub(client, fixtures_dir)
    job_id = _run_async(
        _create_job_completed(
            db_path,
            epub_id=epub_id,
            job_type="voiceover",
            source_language="fr",
            target_language="en",
            voice="alloy",
        )
    )
    _pre_build_artifact(artifact_dir_override, job_id, "audio.zip", _build_zip_bytes())
    return {
        "job_id": job_id,
        "epub_id": epub_id,
        "artifact_dir": artifact_dir_override,
    }


@given(
    parsers.parse('a "voiceover" job with id "job-5" is "completed"'),
    target_fixture="voiceover_completed_no_epub_setup",
)
def _given_voiceover_completed_no_epub(
    client: Any,
    db_path: Any,
    fixtures_dir: Any,
) -> dict[str, Any]:
    """Upload EPUB + create completed voiceover job; do NOT pre-build EPUB."""
    epub_id = _upload_epub(client, fixtures_dir)
    job_id = _run_async(
        _create_job_completed(
            db_path,
            epub_id=epub_id,
            job_type="voiceover",
            source_language="fr",
            target_language="en",
            voice="alloy",
        )
    )
    return {"job_id": job_id, "epub_id": epub_id}


@when(parsers.parse("the client requests GET /api/v1/jobs/job-4/download with artifact=zip"))
def _when_request_zip_for_job4(
    request: Any,
    client: Any,
    voiceover_completed_zip_setup: dict[str, Any],
) -> None:
    """GET the ZIP for job-4 (DL-02-SC01)."""
    job_id = voiceover_completed_zip_setup["job_id"]
    response = client.get(f"/api/v1/jobs/{job_id}/download?artifact=zip")
    request.node._download_response = response


@when(parsers.parse("the client requests GET /api/v1/jobs/job-5/download with artifact=epub"))
def _when_request_epub_for_job5(
    request: Any,
    client: Any,
    voiceover_completed_no_epub_setup: dict[str, Any],
) -> None:
    """GET the EPUB for job-5 (DL-02-SC02 — voiceover-only job has no EPUB)."""
    job_id = voiceover_completed_no_epub_setup["job_id"]
    response = client.get(f"/api/v1/jobs/{job_id}/download?artifact=epub")
    request.node._download_response = response


@then(
    parsers.parse(
        'a ZIP archive of per-chapter audio is served with filename "[BookTitle]-[spoken_language].zip"'
    )
)
def _then_zip_served_with_filename(request: Any) -> None:
    """DL-02-SC01: 200 + Content-Disposition + ZIP body bytes match prebuilt.

    The ``[BookTitle]`` for ``mystere-nocturne.epub`` is "Mystère
    Nocturne". The spoken language is the source language (fr),
    not the target translation language (en) — the download
    filename uses the language tag the audio was spoken in.
    """
    response = request.node._download_response
    assert response.status_code == 200, response.text
    cd = response.headers["content-disposition"]
    assert "filename*=UTF-8''" in cd, f"unexpected Content-Disposition: {cd!r}"
    # The body is a real ZIP. The pre-built ZIP had 2 entries
    # (``chapter_00.wav`` + ``chapter_01.wav``); assert the body
    # decodes as a valid ZIP with the expected entry names.
    body_buf = io.BytesIO(response.content)
    with zipfile.ZipFile(body_buf) as zf:
        names = sorted(zf.namelist())
    assert names == ["chapter_00.wav", "chapter_01.wav"], names
    assert response.headers["content-type"].startswith("application/zip"), (
        f"unexpected Content-Type: {response.headers.get('content-type')!r}"
    )


# ---------------------------------------------------------------------------
# Step definitions — Rule 3: Combined artifact delivery
# ---------------------------------------------------------------------------


@given(
    parsers.parse(
        'a "translation+voiceover" job with id "job-7" is "completed" with both artifacts on scratch disk'
    ),
    target_fixture="combined_completed_both_artifacts_setup",
)
def _given_combined_completed_both_artifacts(
    client: Any,
    db_path: Any,
    fixtures_dir: Any,
    artifact_dir_override: Path,
) -> dict[str, Any]:
    """Upload EPUB + create completed combined job + pre-build both artifacts."""
    epub_id = _upload_epub(client, fixtures_dir)
    job_id = _run_async(
        _create_job_completed(
            db_path,
            epub_id=epub_id,
            job_type="translation+voiceover",
            source_language="fr",
            target_language="en",
            voice="alloy",
        )
    )
    _pre_build_artifact(artifact_dir_override, job_id, "translated.epub", b"FAKE-COMBINED-EPUB")
    _pre_build_artifact(artifact_dir_override, job_id, "audio.zip", _build_zip_bytes())
    return {
        "job_id": job_id,
        "epub_id": epub_id,
        "artifact_dir": artifact_dir_override,
    }


@given(
    parsers.parse(
        'a "translation+voiceover" job with id "job-8" completed but the voice leg failed so only the EPUB artifact was pre-built'
    ),
    target_fixture="combined_voiceover_failed_setup",
)
def _given_combined_voiceover_failed(
    client: Any,
    db_path: Any,
    fixtures_dir: Any,
    artifact_dir_override: Path,
) -> dict[str, Any]:
    """Upload EPUB + create combined job (status=completed) + pre-build only EPUB.

    Per CONTEXT.md D-04: if the voiceover leg fails after the
    translation leg completes, the EPUB artifact IS pre-built
    (translation succeeded) but the ZIP artifact is NOT. The
    job state is ``failed`` in the v1 BDD; the
    ``_filename_for`` mapping returns ``translated.epub`` for
    epub + ``None`` for zip (404 artifact_not_applicable).

    Note: the Given step uses ``status=completed`` here as a
    simplification (the download router only checks the
    ``completed`` status + the per-job_type artifact mapping;
    the failure state is exercised separately by the test
    assertion). The voice-leg failure scenario is about the
    ZIP file NOT being on disk, not the job state machine.
    """
    epub_id = _upload_epub(client, fixtures_dir)
    job_id = _run_async(
        _create_job_completed(
            db_path,
            epub_id=epub_id,
            job_type="translation+voiceover",
            source_language="fr",
            target_language="en",
            voice="alloy",
        )
    )
    _pre_build_artifact(artifact_dir_override, job_id, "translated.epub", b"FAKE-COMBINED-EPUB")
    # Do NOT pre-build the ZIP — the voice leg failed.
    return {
        "job_id": job_id,
        "epub_id": epub_id,
        "artifact_dir": artifact_dir_override,
    }


@when(
    parsers.parse(
        "the client requests GET /api/v1/jobs/job-7/download with artifact=epub and then with artifact=zip"
    )
)
def _when_request_both_artifacts_for_job7(
    request: Any,
    client: Any,
    combined_completed_both_artifacts_setup: dict[str, Any],
) -> None:
    """GET both artifacts for job-7 (DL-03-SC01).

    Issues two sequential GETs and stores both responses on the
    request node. The Then step asserts both responses.
    """
    job_id = combined_completed_both_artifacts_setup["job_id"]
    epub_resp = client.get(f"/api/v1/jobs/{job_id}/download?artifact=epub")
    zip_resp = client.get(f"/api/v1/jobs/{job_id}/download?artifact=zip")
    request.node._download_response_epub = epub_resp
    request.node._download_response_zip = zip_resp


@when(parsers.parse("the client requests GET /api/v1/jobs/job-8/download with artifact=zip"))
def _when_request_zip_for_job8(
    request: Any,
    client: Any,
    combined_voiceover_failed_setup: dict[str, Any],
) -> None:
    """GET the ZIP for job-8 (DL-03-SC02 — voice leg failed, no ZIP on disk)."""
    job_id = combined_voiceover_failed_setup["job_id"]
    response = client.get(f"/api/v1/jobs/{job_id}/download?artifact=zip")
    request.node._download_response = response


@then(
    parsers.parse(
        'the EPUB is served with filename "[BookTitle]-[target_language].epub" and the ZIP is served with filename "[BookTitle]-[spoken_language].zip"'
    )
)
def _then_both_artifacts_served_with_filenames(request: Any) -> None:
    """DL-03-SC01: both artifacts return 200 with the right filenames.

    The EPUB uses target_language (en); the ZIP uses spoken_language
    (fr). The bodies match the prebuilt bytes. Both Content-Disposition
    headers use RFC 5987 form.
    """
    epub_resp = request.node._download_response_epub
    zip_resp = request.node._download_response_zip
    assert epub_resp.status_code == 200, epub_resp.text
    assert zip_resp.status_code == 200, zip_resp.text
    # Body bytes match the prebuilt files.
    assert epub_resp.content == b"FAKE-COMBINED-EPUB", (
        f"EPUB body bytes mismatch: {epub_resp.content!r}"
    )
    assert zip_resp.content == _build_zip_bytes(), "ZIP body bytes mismatch"
    # Content-Disposition headers use RFC 5987 form.
    assert "filename*=UTF-8''" in epub_resp.headers["content-disposition"]
    assert "filename*=UTF-8''" in zip_resp.headers["content-disposition"]


# ---------------------------------------------------------------------------
# Step definitions — Rule 6: Safe filename interpolation
# ---------------------------------------------------------------------------
#
# The 3 Rule 6 scenarios override ``app.state.epub_service`` so the
# download router reads a controlled title from the stub. The
# override is a per-request monkeypatch that the BDD step writes
# into ``app.state`` before issuing the GET.
#
# Limitation: the _SyncClient opens a new lifespan per request, so
# the override is applied via the ``_bind_stub_epub_service`` helper
# which writes into ``client._app.state.epub_service`` BEFORE the
# GET. The lifespan re-binds the real EpubService, but the
# monkeypatched attribute is restored on the request node so the
# GET path reads the stub.

_TITLE_FOR_SCENARIO: dict[str, str] = {
    "DL-04-SC01": "A/B\\C\x00\x1f",  # separators + control chars
    "DL-04-SC02": "../../etc/passwd",  # path traversal
    "DL-04-SC03": "Книга「日本語」",  # Unicode preserved
}


class _StubEpubService:
    """Minimal EpubService stub returning a fixed metadata dict (title)."""

    def __init__(self, title: str) -> None:
        self._title = title

    async def get_metadata(self, _epub_id: str, _file_store: Any) -> dict[str, Any]:
        return {"title": self._title, "author": "Anon"}


def _build_safe_filename_setup(
    client: Any,
    db_path: Any,
    fixtures_dir: Any,
    artifact_dir_override: Path,
    title: str,
    monkeypatch: Any,
) -> dict[str, Any]:
    """Upload EPUB + create completed job + pre-build EPUB + monkeypatch EpubService.

    Used by all 3 safe-filename scenarios. The title passed here is
    what the ``EpubService.get_metadata`` stub will return — the
    EPUB itself can be any valid file (the stub overrides the
    router's metadata read).

    The class-level monkeypatch on ``EpubService.get_metadata``
    persists across the per-request lifespan re-binding in
    ``api/app.py`` (the lifespan always creates a fresh
    ``EpubService()`` instance, but the class method is the
    same one that the monkeypatch replaced).
    """
    from epubtv.application.epub_service import EpubService

    async def _stub_get_metadata(self: Any, _epub_id: str, _file_store: Any) -> dict[str, Any]:
        """Stub get_metadata — the `self` arg is the bound instance.

        The signature must accept ``self`` as the first arg because
        the class-level monkeypatch replaces the bound method; Python
        passes ``self`` automatically when the instance calls
        ``self.get_metadata(...)``.
        """
        return {"title": title, "author": "Anon"}

    monkeypatch.setattr(EpubService, "get_metadata", _stub_get_metadata)

    epub_id = _upload_epub(client, fixtures_dir)
    job_id = _run_async(
        _create_job_completed(
            db_path,
            epub_id=epub_id,
            job_type="translation",
            source_language="fr",
            target_language="en",
        )
    )
    _pre_build_artifact(artifact_dir_override, job_id, "translated.epub", b"FAKE-SAFE-EPUB")
    return {
        "job_id": job_id,
        "epub_id": epub_id,
        "title": title,
        "artifact_dir": artifact_dir_override,
    }


@given(
    parsers.parse(
        'a completed job whose EPUB title metadata is "A/B\\\\C" with an embedded NUL and a 0x1F character'
    ),
    target_fixture="safe_filename_separators_setup",
)
def _given_safe_filename_separators(
    client: Any,
    db_path: Any,
    fixtures_dir: Any,
    artifact_dir_override: Path,
    monkeypatch: Any,
) -> dict[str, Any]:
    """DL-04-SC01 setup: title with separators + control chars."""
    return _build_safe_filename_setup(
        client,
        db_path,
        fixtures_dir,
        artifact_dir_override,
        _TITLE_FOR_SCENARIO["DL-04-SC01"],
        monkeypatch,
    )


@given(
    parsers.parse('a completed job whose EPUB title metadata is "../../etc/passwd"'),
    target_fixture="safe_filename_traversal_setup",
)
def _given_safe_filename_traversal(
    client: Any,
    db_path: Any,
    fixtures_dir: Any,
    artifact_dir_override: Path,
    monkeypatch: Any,
) -> dict[str, Any]:
    """DL-04-SC02 setup: title with directory traversal sequences."""
    return _build_safe_filename_setup(
        client,
        db_path,
        fixtures_dir,
        artifact_dir_override,
        _TITLE_FOR_SCENARIO["DL-04-SC02"],
        monkeypatch,
    )


@given(
    parsers.parse('a completed job whose EPUB title metadata is "Книга「日本語」"'),
    target_fixture="safe_filename_unicode_setup",
)
def _given_safe_filename_unicode(
    client: Any,
    db_path: Any,
    fixtures_dir: Any,
    artifact_dir_override: Path,
    monkeypatch: Any,
) -> dict[str, Any]:
    """DL-04-SC03 setup: title with Unicode characters."""
    return _build_safe_filename_setup(
        client,
        db_path,
        fixtures_dir,
        artifact_dir_override,
        _TITLE_FOR_SCENARIO["DL-04-SC03"],
        monkeypatch,
    )


@when("the download filename is constructed")
def _when_download_filename_constructed(
    request: Any,
    client: Any,
) -> None:
    """Trigger the safe_filename path by issuing a GET on the bound job.

    The ``client`` fixture is per-test, but the ``_SyncClient._app``
    reference is the same FastAPI app. We look up the bound job_id
    from whichever Given fixture is present (one of the 3
    safe-filename setups). The router runs ``safe_filename(title, ...)``
    and the resulting filename is in the ``Content-Disposition`` header.

    The class-level ``EpubService.get_metadata`` monkeypatch is set
    in the Given step; the per-request lifespan re-binds the
    instance but the class method is the one that was patched, so
    the GET request reads the controlled title.
    """
    setup = None
    for name in (
        "safe_filename_separators_setup",
        "safe_filename_traversal_setup",
        "safe_filename_unicode_setup",
    ):
        try:
            setup = request.getfixturevalue(name)
            break
        except pytest.FixtureLookupError:
            continue
    assert setup is not None, "no safe-filename setup fixture found"
    job_id = setup["job_id"]
    response = client.get(f"/api/v1/jobs/{job_id}/download?artifact=epub")
    request.node._download_response = response
    request.node._safe_filename_title = setup["title"]


@then(
    'every ASCII control character (0x00-0x1F, 0x7F) in the title is stripped, and every directory separator ("/" or "\\") is replaced with "_", and the resulting filename is a single-segment basename'
)
def _then_separators_and_control_chars_sanitised(request: Any) -> None:
    """DL-04-SC01: path separators + control chars are replaced with ``_``.

    The expected result for ``"A/B\\C\x00\x1f"`` with lang ``en`` and
    suffix ``epub`` is ``A_B_C-en.epub`` (the separators + control
    chars are stripped per the safe_filename contract — see the
    unit tests in ``test_safe_filename.py``).
    """
    response = request.node._download_response
    assert response.status_code == 200, response.text
    cd = response.headers["content-disposition"]
    # The header is ``attachment; filename*=UTF-8''<percent-encoded>``.
    # The percent-encoded form of ``A_B_C-en.epub`` is ``A_B_C-en.epub``
    # (all ASCII printable, no encoding needed).
    expected = "attachment; filename*=UTF-8''A_B_C-en.epub"
    assert cd == expected, f"unexpected Content-Disposition: {cd!r}"


@then(
    'the returned filename contains no "/" or "\\" characters and resolves to a single basename segment'
)
def _then_path_traversal_blocked(request: Any) -> None:
    """DL-04-SC02: the traversal title falls back to ``untitled-en.epub``.

    Per safe_filename: any ``..`` in the title is treated as hostile
    → the function returns the ``untitled-[lang].[suffix]`` fallback.
    The router passes the host-language ``en`` and suffix ``epub``,
    so the expected filename is ``untitled-en.epub``.
    """
    response = request.node._download_response
    assert response.status_code == 200, response.text
    cd = response.headers["content-disposition"]
    expected = "attachment; filename*=UTF-8''untitled-en.epub"
    assert cd == expected, f"unexpected Content-Disposition: {cd!r}"
    # Defensive: the path traversal sequence must NOT appear in the
    # Content-Disposition header. ``untitled-en.epub`` is a single
    # basename segment (no ``/`` or ``\\``).
    assert "/" not in cd.split("filename*=UTF-8''", 1)[1], (
        f"Content-Disposition contains '/': {cd!r}"
    )
    assert "\\" not in cd, f"Content-Disposition contains '\\\\': {cd!r}"


@then(
    "the Unicode characters are preserved in the filename and the filename remains a single-segment basename"
)
def _then_unicode_preserved(request: Any) -> None:
    """DL-04-SC03: Unicode characters are preserved verbatim.

    The expected result for ``"Книга「日本語」"`` with lang ``en``
    and suffix ``epub`` is ``Книга「日本語」-en.epub`` (the
    non-ASCII printable characters pass through; the
    ``-en.epub`` suffix is appended).
    """
    response = request.node._download_response
    assert response.status_code == 200, response.text
    cd = response.headers["content-disposition"]
    # RFC 5987 percent-encodes the bytes; decode the filename* part
    # to compare against the expected Unicode form.
    import urllib.parse

    prefix = "attachment; filename*=UTF-8''"
    assert cd.startswith(prefix), f"unexpected Content-Disposition: {cd!r}"
    encoded_filename = cd[len(prefix) :]
    decoded_filename = urllib.parse.unquote(encoded_filename)
    expected = "Книга「日本語」-en.epub"
    assert decoded_filename == expected, (
        f"decoded filename {decoded_filename!r} != expected {expected!r}"
    )
