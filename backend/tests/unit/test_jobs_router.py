"""Jobs router unit tests (TDD Task 2 RED — plan 02-03).

Covers the 4 jobs endpoints:
- ``POST /api/v1/jobs`` — D-05 discriminated union + 501 dispatch
  (voiceover / combined) + D-06 source-language pre-flight + F4-AC1
  schema-level gate.
- ``GET /api/v1/jobs`` — list view (JOBS-05).
- ``GET /api/v1/jobs/{id}`` — single job view (404 on unknown).
- ``WS /api/v1/jobs/{id}/events`` — 1008 on unknown; 6-field envelope on
  known; late subscribers do NOT replay.

The HTTP layer is exercised via ``httpx.ASGITransport``; per-test
``app`` + ``db_path`` fixtures drive the lifespan. The D-06 EPUB
declaration state is controlled by uploading fixtures with known
``declared_languages`` (``mystere-nocturne.epub`` declares ``fr``;
``bilingual-reader.epub`` declares ``fr`` + ``en``; ``anonymous.epub``
declares nothing).

The 501 dispatch path is asserted via ``list_jobs(limit=50)`` BEFORE
and AFTER the 501 call — the count must NOT change (D-05: no 501 path
reaches ``JobRepo.create_job``).
"""

from __future__ import annotations

from typing import Any

import httpx
import pytest

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.tcid("JOBS-01-UT18"),
    pytest.mark.tcid("JOBS-05-UT20"),
    pytest.mark.tcid("JOBS-06-UT26"),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _upload_epub(client: httpx.AsyncClient, name: str) -> str:
    """Upload an EPUB fixture and return its ``epub_id``.

    Re-uses the F1 upload endpoint; the file is read from the
    ``fixtures_dir`` fixture (resolved at the test level).
    """
    from pathlib import Path

    fixtures = Path(__file__).resolve().parents[1] / "fixtures" / "epubs"
    payload = (fixtures / name).read_bytes()
    r = await client.post(
        "/api/v1/epubs",
        files={"file": (name, payload, "application/epub+zip")},
    )
    assert r.status_code == 200, r.text
    return str(r.json()["epub_id"])


# ---------------------------------------------------------------------------
# POST /api/v1/jobs
# ---------------------------------------------------------------------------


async def test_post_translation_happy_path(app: Any, db_path: Any) -> None:
    """``POST /api/v1/jobs`` with a translation body returns 202 + JobView."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "translation",
                "epub_id": epub_id,
                "provider": "ollama",
                "model": "translategemma:12b",
                "source_language": "en",
                "target_language": "de",
            },
        )
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["epub_id"] == epub_id
    assert body["job_type"] == "translation"
    assert body["status"] == "queued"
    assert body["source_language"] == "en"
    assert body["target_language"] == "de"
    assert "id" in body and len(body["id"]) > 0


async def test_post_voiceover_with_provider_returns_422(app: Any, db_path: Any) -> None:
    """Voiceover body with a stray ``target_language`` is rejected at parse time (F4-AC1).

    Phase 1 plan 01-03 / BACK-09: ``provider`` is no longer a stray
    field on the voiceover body — it is REQUIRED. The
    ``test_voiceover_body_with_stray_target_language_returns_422_at_parse_time``
    test in ``test_jobs_router_voiceover.py`` covers the
    ``target_language`` stray-field case. This test now mirrors that
    contract (it was originally the ``provider`` stray-field test;
    the same coverage goal is preserved by sending a stray
    ``target_language`` on a body with the now-required provider
    + model fields).
    """
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "voiceover",
                "epub_id": epub_id,
                "voice": "female",
                "provider": "openai-compatible",  # required by BACK-09
                "model": "tts-1",  # required by BACK-09
                "target_language": "de",  # schema-level gate
            },
        )
    assert r.status_code == 422
    # The validation error is Pydantic; the envelope code is generic
    # "validation_error" (NOT phase_not_yet_implemented).
    body = r.json()
    # FastAPI's default 422 shape: {"detail": [{...}]}
    assert "detail" in body


async def test_post_voiceover_no_translation_fields_returns_202(app: Any, db_path: Any) -> None:
    """Phase 3 / D-11 + D-13: voiceover body (no translation fields) reaches create_job.

    The Phase 2 501 dispatch for ``voiceover`` is REMOVED — the
    body now reaches ``create_job`` and is persisted with the
    supplied voice + auto-resolved ``source_language``. This is the
    501-removal regression: the previous test asserted 501, but
    Phase 3 ships the voiceover pipeline so the body MUST succeed.

    The voice id is the ``fr`` catalog's first voice (``alloy``,
    per D-07). The EPUB declares ``["fr"]`` (single-language) so
    the router preflight fills ``source_language="fr"`` from the
    declared-languages branch.
    """
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "voiceover",
                "epub_id": epub_id,
                "voice": "alloy",
                # Phase 1 / BACK-09: voiceover body requires
                # ``provider`` + ``model``.
                "provider": "openai-compatible",
                "model": "tts-1",
            },
        )
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["job_type"] == "voiceover"
    assert body["status"] == "queued"
    assert body["source_language"] == "fr"  # auto-filled from declared
    assert body["voice"] == "alloy"
    assert "id" in body and len(body["id"]) > 0


async def test_post_voiceover_creates_job_row(app: Any, db_path: Any) -> None:
    """D-11 + D-13: the voiceover body now creates a row (the 501 gate is gone).

    The previous test (``test_post_501_does_not_create_job_row``) asserted
    the row count was unchanged after a voiceover 501. With the 501
    removed, the row IS created — this test asserts the new contract.
    """
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        # Baseline: zero jobs.
        r0 = await ac.get("/api/v1/jobs")
        assert r0.status_code == 200
        assert r0.json()["jobs"] == []

        # Voiceover body now succeeds.
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "voiceover",
                "epub_id": epub_id,
                "voice": "alloy",
                "provider": "openai-compatible",
                "model": "tts-1",
            },
        )
        assert r.status_code == 202

        # Exactly one job was created.
        r1 = await ac.get("/api/v1/jobs")
        assert r1.status_code == 200
        jobs = r1.json()["jobs"]
        assert len(jobs) == 1, f"expected 1 job, got {len(jobs)}"
        assert jobs[0]["job_type"] == "voiceover"
        assert jobs[0]["voice"] == "alloy"


async def test_post_combined_returns_202(app: Any, db_path: Any) -> None:
    """A combined job (translation + voiceover) is accepted (Phase 4 / plan 04-02).

    Phase 4 / plan 04-02: the combined-workflow 501 from Phase 2/3 is
    REMOVED. The router now reaches ``create_job`` for combined
    bodies and returns 202 + ``JobView``. The body must carry the
    voice catalog check (D-06) — "female" is NOT in the ``de`` /
    ``en`` / ``fr`` catalogs, so the test uses "alloy" (an ``en``
    catalog voice that is also in the ``fr`` catalog via the
    D-07 wildcard) and the EPUB must declare ``en`` to make the
    catalog check pass.
    """
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "translation+voiceover",
                "epub_id": epub_id,
                "provider": "ollama",
                "model": "x",
                "target_language": "de",
                "voice": "alloy",
            },
        )
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["job_type"] == "translation+voiceover"
    assert body["voice"] == "alloy"
    assert body["source_language"] is not None
    assert body["target_language"] == "de"


async def test_post_unknown_job_type_returns_422(app: Any, db_path: Any) -> None:
    """An unknown ``job_type`` is rejected by the Pydantic discriminator."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "narration",
                "epub_id": epub_id,
                "voice": "female",
            },
        )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# D-06 source-language pre-flight
# ---------------------------------------------------------------------------


async def test_d06_source_unset_with_one_declared_lang_uses_declared(
    app: Any, db_path: Any
) -> None:
    """Translation with no source + 1 declared lang → source set to that lang (D-06 happy)."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        # ``mystere-nocturne.epub`` declares ``["fr"]``.
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "translation",
                "epub_id": epub_id,
                "provider": "ollama",
                "model": "x",
                "target_language": "de",
                # source_language OMITTED
            },
        )
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["source_language"] == "fr"


async def test_d06_source_unset_with_zero_declared_langs_returns_422(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Translation with no source + 0 declared langs → 422 source_language_required.

    The test monkeypatches ``EpubService.get_metadata`` to return
    ``declared_languages=[]`` for the duration of one request, so the
    D-06 pre-flight hits the missing branch. This isolates the router
    logic from the EPUB fixture (no fixture-builder to maintain; the
    existing fixtures all declare ≥1 language).
    """
    from epubtv.application.epub_service import EpubService

    async def _no_declared(*args: Any, **kwargs: Any) -> dict[str, object]:
        return {
            "title": None,
            "author": None,
            "declared_languages": [],
            "chapter_count": 1,
            "chapter_ids": ["chapter_1"],
        }

    monkeypatch.setattr(EpubService, "get_metadata", _no_declared)

    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "translation",
                "epub_id": epub_id,
                "provider": "ollama",
                "model": "x",
                "target_language": "de",
            },
        )
    assert r.status_code == 422, r.text
    body = r.json()
    assert body["error"]["code"] == "source_language_required"
    assert body["error"]["details"]["epub_id"] == epub_id
    assert body["error"]["details"]["declared_languages"] == []


async def test_d06_source_unset_with_multi_declared_langs_persists_null(
    app: Any, db_path: Any
) -> None:
    """Translation with no source + >1 declared langs → source_language is null (D-06 multi)."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        # ``bilingual-reader.epub`` declares ``["fr", "en"]``.
        epub_id = await _upload_epub(ac, "bilingual-reader.epub")
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "translation",
                "epub_id": epub_id,
                "provider": "ollama",
                "model": "x",
                "target_language": "de",
            },
        )
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["source_language"] is None


# ---------------------------------------------------------------------------
# GET /api/v1/jobs (JOBS-05 list)
# ---------------------------------------------------------------------------


async def test_get_jobs_returns_3_in_reverse_insertion_order(app: Any, db_path: Any) -> None:
    """``GET /api/v1/jobs`` returns the jobs in created_at DESC order."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        ids: list[str] = []
        for _i in range(3):
            r = await ac.post(
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
            assert r.status_code == 202
            ids.append(r.json()["id"])
        r = await ac.get("/api/v1/jobs")
    assert r.status_code == 200
    body = r.json()
    assert len(body["jobs"]) == 3
    # Reverse insertion order: latest first.
    returned_ids = [j["id"] for j in body["jobs"]]
    assert returned_ids == list(reversed(ids))


# ---------------------------------------------------------------------------
# GET /api/v1/jobs/{id}
# ---------------------------------------------------------------------------


async def test_get_job_known_id_returns_view(app: Any, db_path: Any) -> None:
    """``GET /api/v1/jobs/{id}`` returns the JobView for a known id."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r_post = await ac.post(
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
        assert r_post.status_code == 202
        job_id = r_post.json()["id"]
        r = await ac.get(f"/api/v1/jobs/{job_id}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == job_id
    assert body["job_type"] == "translation"


async def test_get_job_unknown_id_returns_404(app: Any, db_path: Any) -> None:
    """``GET /api/v1/jobs/{id}`` for an unknown id returns 404 ``not_found``."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        r = await ac.get("/api/v1/jobs/nonexistent-id")
    assert r.status_code == 404
    body = r.json()
    assert body["error"]["code"] == "not_found"


# ---------------------------------------------------------------------------
# DELETE /api/v1/jobs/{id} (JOBS-06 / Quick 260710-oih — cancel surface)
# ---------------------------------------------------------------------------


async def test_delete_queued_job_returns_204_and_removes_row(app: Any, db_path: Any) -> None:
    """``DELETE /api/v1/jobs/{id}`` on a queued job returns 204 + removes the row.

    The router marks the row ``"cancelled"`` first (so the worker's
    next ``pop_next_queued`` tick skips it) then physically deletes
    the row + its chunks + its audio files. The post-DELETE
    ``GET /api/v1/jobs`` must show an empty list.
    """
    import uuid

    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r_post = await ac.post(
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
        assert r_post.status_code == 202
        job_id = r_post.json()["id"]

        r = await ac.delete(f"/api/v1/jobs/{job_id}")
    assert r.status_code == 204, r.text

    # Post-DELETE: the list view is empty.
    async with (
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        r_list = await ac.get("/api/v1/jobs")
    assert r_list.status_code == 200
    assert r_list.json()["jobs"] == []
    # Also confirm a random uuid is not in the list (no resurrection).
    assert all(j["id"] != uuid.uuid4().hex for j in r_list.json()["jobs"])


async def test_delete_unknown_job_returns_404(app: Any, db_path: Any) -> None:
    """``DELETE /api/v1/jobs/{id}`` for a random uuid returns 404 ``not_found``."""
    import uuid

    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        r = await ac.delete(f"/api/v1/jobs/{uuid.uuid4().hex}")
    assert r.status_code == 404, r.text
    body = r.json()
    assert body["error"]["code"] == "not_found"


async def test_delete_terminal_job_returns_409(app: Any, db_path: Any) -> None:
    """``DELETE /api/v1/jobs/{id}`` on a terminal job returns 409 ``job_not_cancellable``.

    The router rejects terminal-state deletes (the SPA's Cancel
    button should never silently succeed on a finished job). The
    test drives the job to ``"completed"`` via the repo's
    ``update_status`` helper (the worker's per-chunk path is the
    production source of ``"completed"``; the unit test bypasses it
    to keep the test fast).
    """
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r_post = await ac.post(
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
        assert r_post.status_code == 202
        job_id = r_post.json()["id"]

        # Drive the job to a terminal state via the repo (bypass
        # the worker for test speed).
        job_repo = ac._transport.app.state.job_repo  # type: ignore[attr-defined]
        await job_repo.update_status(job_id, "completed")

        r = await ac.delete(f"/api/v1/jobs/{job_id}")
    assert r.status_code == 409, r.text
    body = r.json()
    assert body["error"]["code"] == "job_not_cancellable"
    assert body["error"]["details"]["status"] == "completed"


async def test_delete_running_job_returns_204(app: Any, db_path: Any) -> None:
    """``DELETE /api/v1/jobs/{id}`` on a running job returns 204 (the row is wiped).

    The in-flight task is NOT aborted mid-chunk — the running task
    is left to finish its current chunk; the row is gone before any
    next chunk write, so the next ``append_chunk`` would write an
    orphan ``job_chunks`` row with no parent (the FK is
    intentionally not declared per ``schema.py``). The endpoint
    contract is the 204 + row removal; the orphan-chunk seam is
    documented as sprint-scope acceptable per Quick 260710-oih.
    """
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r_post = await ac.post(
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
        assert r_post.status_code == 202
        job_id = r_post.json()["id"]

        # Manually promote to "running" (the worker would do this
        # via ``pop_next_queued``'s atomic promote; the unit test
        # bypasses the worker for speed).
        job_repo = ac._transport.app.state.job_repo  # type: ignore[attr-defined]
        await job_repo.update_status(job_id, "running")

        r = await ac.delete(f"/api/v1/jobs/{job_id}")
    assert r.status_code == 204, r.text


async def test_delete_clears_associated_chunks(app: Any, db_path: Any) -> None:
    """``DELETE /api/v1/jobs/{id}`` wipes the row's ``job_chunks`` (cascade).

    The test pre-seeds two ``job_chunks`` rows via
    ``job_repo.append_chunk`` (the production writer the workflow
    services use), then DELETEs the job, and asserts the
    ``list_chunks`` view is empty.
    """
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub(ac, "mystere-nocturne.epub")
        r_post = await ac.post(
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
        assert r_post.status_code == 202
        job_id = r_post.json()["id"]

        # Pre-seed two ``job_chunks`` rows.
        job_repo = ac._transport.app.state.job_repo  # type: ignore[attr-defined]
        await job_repo.append_chunk(job_id, 0, 0, "completed")
        await job_repo.append_chunk(job_id, 0, 1, "completed")
        pre_chunks = await job_repo.list_chunks(job_id)
        assert len(pre_chunks) == 2

        r = await ac.delete(f"/api/v1/jobs/{job_id}")
    assert r.status_code == 204, r.text

    # Post-DELETE: the chunks are gone (the cascade wiped them).
    async with (
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        post_repo = ac._transport.app.state.job_repo  # type: ignore[attr-defined]
        post_chunks = await post_repo.list_chunks(job_id)
    assert post_chunks == []
