"""Voiceover jobs router preflight tests (Task 3 TDD cycle — plan 03-03).

Satisfies the D-06 + D-08 + D-09 + D-11 + D-12 + D-13 + D-15 contract
end-to-end at the router layer:

- ``POST /api/v1/jobs`` with a voiceover body (no translation fields)
  returns 202 + ``JobView`` (D-11 + D-13: the Phase 2 501 for
  ``voiceover`` is REMOVED; the body reaches ``create_job``).
- A voiceover body with a stray ``provider`` / ``target_language``
  field returns 422 at parse time (F4-AC1 + D-15: the
  ``VoiceoverJobBody`` schema's ``extra="forbid"`` rejects
  translation fields).
- A voiceover body with a voice NOT in ``VOICES`` (the canonical
  OpenAI voice list) returns 422 ``validation_error`` (D-06 forward-
  compat catalog check).
- A voiceover body with an empty voice (``voice=""``) returns 422
  at parse time (Pydantic ``min_length=1``).
- A voiceover body for a 0-language EPUB returns 422
  ``source_language_required`` (D-09 error envelope; the
  ``EpubService.resolve_voiceover_language`` returns ``None``).
- A voiceover body for a multi-language EPUB uses the first-spine
  chapter's ``xml:lang`` (D-08 first-spine rule).
- A voiceover body for a single-language EPUB uses the declared
  language (D-09 zero-config).
- A combined-workflow body (``translation+voiceover``) still returns
  501 ``phase_not_yet_implemented`` (D-12 — combined-workflow 501
  STAYS in Phase 4).
- A translation body still returns 202 (Phase 2 path preserved).

Test fixtures build synthetic EPUBs in-memory using ebooklib's
``EpubBook`` + ``EpubHtml(lang=...)`` API + ``epub.write_epub`` so
the per-chapter ``xml:lang`` is preserved across the upload-save-
read round-trip (the resolver reads the chapter XHTML directly from
the zip, bypassing ebooklib's per-chapter normalisation).
"""

from __future__ import annotations

import io
from typing import Any

import httpx
import pytest
from ebooklib import epub

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("VOICE-01-UT11")]


# ---------------------------------------------------------------------------
# Synthetic EPUB builders
# ---------------------------------------------------------------------------


def _build_epub(
    *,
    declared_languages: list[str],
    chapter_langs: list[str | None] | None = None,
) -> bytes:
    """Build a minimal EPUB 3 archive in memory.

    Mirrors the helper in ``test_resolve_voiceover_language.py`` so the
    preflight tests can build EPUBs with specific per-chapter
    ``xml:lang`` values. The EPUB has exactly ``len(chapter_langs)``
    ``EpubHtml`` items in the spine, each carrying a unique ``id`` and
    a tiny body. The ``EpubNav`` is omitted to keep the spine purely
    chapter-driven.
    """
    chapters = chapter_langs or [None] * max(len(declared_languages), 1)

    book = epub.EpubBook()
    book.set_identifier(f"test-{id(chapters)}")
    book.set_title("Test EPUB")
    for lang in declared_languages:
        book.set_language(lang)

    items: list[epub.EpubHtml] = []
    for idx, chap_lang in enumerate(chapters, start=1):
        ch = epub.EpubHtml(
            title=f"Chapter {idx}",
            file_name=f"chap_{idx}.xhtml",
            lang=chap_lang or "",
        )
        ch.content = (
            f'<html xmlns="http://www.w3.org/1999/xhtml">'
            f"<head><title>Chapter {idx}</title></head>"
            f"<body><p>Chapter {idx} content.</p></body>"
            f"</html>"
        )
        book.add_item(ch)
        items.append(ch)

    nav = epub.EpubNav()
    book.add_item(nav)

    book.toc = ()
    book.spine = ["nav", *items]

    buf = io.BytesIO()
    epub.write_epub(buf, book, {})
    return buf.getvalue()


def _build_epub_no_declared_languages(*, chapter_lang: str) -> bytes:
    """Build a minimal EPUB 3 archive with NO ``<dc:language>`` in the OPF.

    ebooklib's ``set_language`` API requires at least one language
    for a parseable EPUB, so we build with one language then strip
    the ``<dc:language>`` lines from the OPF post-write (mirrors the
    resolver test's approach for the 0-declared branch).
    """
    epub_bytes = _build_epub(
        declared_languages=[chapter_lang],
        chapter_langs=[chapter_lang],
    )
    import zipfile

    buf = io.BytesIO(epub_bytes)
    out_buf = io.BytesIO()
    with zipfile.ZipFile(buf, "r") as zin, zipfile.ZipFile(out_buf, "w") as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename.endswith(".opf"):
                text = data.decode("utf-8")
                lines = [ln for ln in text.splitlines() if "<dc:language>" not in ln]
                data = "\n".join(lines).encode("utf-8")
            zout.writestr(item, data)
    return out_buf.getvalue()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _upload_epub_bytes(client: httpx.AsyncClient, epub_bytes: bytes, name: str) -> str:
    """Upload a synthetic EPUB fixture and return its ``epub_id``."""
    r = await client.post(
        "/api/v1/epubs",
        files={"file": (name, epub_bytes, "application/epub+zip")},
    )
    assert r.status_code == 200, f"upload failed: {r.status_code} {r.text!r}"
    return str(r.json()["epub_id"])


# ---------------------------------------------------------------------------
# D-11 + D-13: 501 REMOVED for voiceover; body reaches create_job
# ---------------------------------------------------------------------------


async def test_voiceover_body_with_voice_in_catalog_returns_202(app: Any, db_path: Any) -> None:
    """POST a voiceover body with a valid voice → 202 + JobView (D-11 + D-13)."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        # Single-language en EPUB → en catalog voice is "alloy".
        epub_id = await _upload_epub_bytes(
            ac,
            _build_epub(declared_languages=["en"], chapter_langs=["en"]),
            "synthetic-en.epub",
        )
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "voiceover",
                "epub_id": epub_id,
                "voice": "alloy",
                # Phase 1 / BACK-09: voiceover bodies require
                # ``provider`` + ``model`` (TTS provider + TTS model).
                # TTS is OpenAI-only per TTS-02.
                "provider": "openai-compatible",
                "model": "tts-1",
            },
        )
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["job_type"] == "voiceover"
    assert body["status"] == "queued"
    assert body["voice"] == "alloy", f"voice should be 'alloy', got {body['voice']!r}"
    assert body["source_language"] == "en", (
        f"source_language should be auto-filled 'en', got {body['source_language']!r}"
    )
    assert body["target_language"] is None
    assert body["provider"] == "openai-compatible", (
        f"JobView.provider should be 'openai-compatible', got {body.get('provider')!r}"
    )
    assert body["model"] == "tts-1", f"JobView.model should be 'tts-1', got {body.get('model')!r}"
    assert "id" in body and len(body["id"]) > 0


# ---------------------------------------------------------------------------
# F4-AC1 + D-15: schema-level gate rejects translation fields
# ---------------------------------------------------------------------------


# Note: the previous ``test_voiceover_body_with_stray_provider_returns_422_at_parse_time``
# test was removed in plan 01-03 / BACK-09 because ``provider`` is now a
# REQUIRED field on the voiceover body (the TTS provider key per TTS-02);
# the test no longer makes sense. The remaining
# ``test_voiceover_body_with_stray_target_language_returns_422_at_parse_time``
# covers the stray-field contract (a translation field on a voiceover
# body is rejected at parse time per F4-AC1 + D-15).


async def test_voiceover_body_with_stray_target_language_returns_422_at_parse_time(
    app: Any, db_path: Any
) -> None:
    """Voiceover body with a stray ``target_language`` field → 422 (F4-AC1 gate)."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub_bytes(
            ac,
            _build_epub(declared_languages=["en"], chapter_langs=["en"]),
            "synthetic-en.epub",
        )
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "voiceover",
                "epub_id": epub_id,
                "voice": "alloy",
                "provider": "openai-compatible",
                "model": "tts-1",
                "target_language": "de",  # schema-level gate
            },
        )
    assert r.status_code == 422
    body = r.json()
    assert "detail" in body, f"expected Pydantic 422 envelope, got: {body!r}"


# ---------------------------------------------------------------------------
# D-06: voice catalog check (forward-compat for Phase 4 real-TTS)
# ---------------------------------------------------------------------------


async def test_voiceover_body_with_voice_not_in_catalog_returns_422(app: Any, db_path: Any) -> None:
    """Voiceover body with ``voice='unknown-voice'`` → 422 ``validation_error``.

    The Pydantic ``min_length=1`` passes (voice is non-empty), but
    the router preflight rejects the voice as not in the canonical
    ``VOICES`` catalog.
    """
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub_bytes(
            ac,
            _build_epub(declared_languages=["en"], chapter_langs=["en"]),
            "synthetic-en.epub",
        )
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "voiceover",
                "epub_id": epub_id,
                "voice": "unknown-voice",
                "provider": "openai-compatible",
                "model": "tts-1",
            },
        )
    assert r.status_code == 422, r.text
    body = r.json()
    assert body["error"]["code"] == "validation_error", (
        f"expected 'validation_error' code, got: {body!r}"
    )
    assert body["error"]["details"]["voice"] == "unknown-voice"
    assert body["error"]["details"]["language"] == "en"


async def test_voiceover_body_with_empty_voice_returns_422(app: Any, db_path: Any) -> None:
    """Voiceover body with ``voice=''`` → 422 at parse time (Pydantic min_length=1)."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub_bytes(
            ac,
            _build_epub(declared_languages=["en"], chapter_langs=["en"]),
            "synthetic-en.epub",
        )
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "voiceover",
                "epub_id": epub_id,
                "voice": "",
                "provider": "openai-compatible",
                "model": "tts-1",
            },
        )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# D-08 + D-09: source_language auto-resolve
# ---------------------------------------------------------------------------


async def test_voiceover_body_for_single_language_epub_uses_declared(
    app: Any, db_path: Any
) -> None:
    """Single-language EPUB (declares ['fr']) → source_language='fr' (D-09 zero-config)."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        # fr EPUB → fr catalog voice is "alloy".
        epub_id = await _upload_epub_bytes(
            ac,
            _build_epub(declared_languages=["fr"], chapter_langs=["fr"]),
            "synthetic-fr.epub",
        )
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
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["source_language"] == "fr", (
        f"source_language should be auto-filled 'fr' from declared, got {body['source_language']!r}"
    )
    assert body["voice"] == "alloy"


async def test_voiceover_body_for_multi_language_epub_uses_first_spine(
    app: Any, db_path: Any
) -> None:
    """Multi-language EPUB (declares [en, de], first chapter xml:lang=de) → 'de' (D-08)."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        # Declares [en, de] but the first spine chapter carries
        # xml:lang="de" — the D-08 first-spine rule picks "de".
        epub_id = await _upload_epub_bytes(
            ac,
            _build_epub(
                declared_languages=["en", "de"],
                chapter_langs=["de"],
            ),
            "synthetic-multi.epub",
        )
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "voiceover",
                "epub_id": epub_id,
                "voice": "fable",
                "provider": "openai-compatible",
                "model": "tts-1",
            },
        )
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["source_language"] == "de", (
        f"source_language should be 'de' (first-spine xml:lang), got {body['source_language']!r}"
    )
    assert body["voice"] == "fable"


async def test_voiceover_body_for_zero_declared_language_epub_returns_422(
    app: Any, db_path: Any
) -> None:
    """0-language EPUB + no client source → 422 ``source_language_required`` (D-09)."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        # Hand-roll an EPUB with NO declared languages (the OPF has
        # no ``<dc:language>`` element). The chapter carries
        # ``xml:lang="en"`` so the resolver short-circuits to the
        # chapter xml:lang branch — strip the chapter xml:lang too to
        # force the ``None`` return.
        # We use a different approach: build a normal EPUB then strip
        # BOTH the OPF dc:language AND the chapter xml:lang. The
        # resolver returns ``None`` → router raises 422.
        epub_bytes = _build_epub(
            declared_languages=["en"],
            chapter_langs=["en"],
        )
        import zipfile

        buf = io.BytesIO(epub_bytes)
        out_buf = io.BytesIO()
        with zipfile.ZipFile(buf, "r") as zin, zipfile.ZipFile(out_buf, "w") as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename.endswith(".opf"):
                    text = data.decode("utf-8")
                    lines = [ln for ln in text.splitlines() if "<dc:language>" not in ln]
                    data = "\n".join(lines).encode("utf-8")
                if item.filename.endswith(".xhtml") and "chap_" in item.filename:
                    # Strip xml:lang + lang from the chapter root.
                    text = data.decode("utf-8")
                    import re

                    text = re.sub(r' xml:lang="[^"]*"', "", text)
                    text = re.sub(r' lang="[^"]*"', "", text)
                    data = text.encode("utf-8")
                zout.writestr(item, data)
        stripped_bytes = out_buf.getvalue()

        epub_id = await _upload_epub_bytes(ac, stripped_bytes, "synthetic-zero-lang.epub")
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
    assert r.status_code == 422, r.text
    body = r.json()
    assert body["error"]["code"] == "source_language_required", (
        f"expected 'source_language_required' code, got: {body!r}"
    )
    assert body["error"]["details"]["epub_id"] == epub_id
    assert body["error"]["details"]["declared_languages"] == []


# ---------------------------------------------------------------------------
# D-12 follow-up (Phase 4 / plan 04-02): combined-workflow 501 REMOVED
# ---------------------------------------------------------------------------


async def test_translation_plus_voiceover_body_is_accepted(app: Any, db_path: Any) -> None:
    """Combined-workflow (translation+voiceover) body is accepted (Phase 4 / plan 04-02).

    Phase 4 / plan 04-02 follow-up: the combined-workflow 501 from
    Phase 2/3 is REMOVED. The router now reaches ``create_job`` for
    combined bodies and returns 202 + ``JobView``. The body must
    pass the D-06 voice catalog check (an "en" EPUB + "alloy"
    voice — the "alloy" voice is in the "en" catalog per D-07).
    """
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub_bytes(
            ac,
            _build_epub(declared_languages=["en"], chapter_langs=["en"]),
            "synthetic-en.epub",
        )
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "translation+voiceover",
                "epub_id": epub_id,
                "provider": "ollama",
                "model": "translategemma:12b",
                "target_language": "de",
                "voice": "alloy",
            },
        )
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["job_type"] == "translation+voiceover"
    assert body["source_language"] == "en"
    assert body["target_language"] == "de"
    assert body["voice"] == "alloy"


# ---------------------------------------------------------------------------
# Phase 1 plan 01-03 / BACK-10: voiceover preflight gate (provider check)
# ---------------------------------------------------------------------------


async def test_voiceover_with_ollama_provider_returns_422(app: Any, db_path: Any) -> None:
    """A voiceover body with ``provider='ollama'`` is rejected at the router (BACK-10).

    The router's preflight gate is the user-facing 422 surface
    for an unsupported TTS provider. Ollama has no TTS endpoint
    per PRD §6; the worker-drain path would also return 422 via
    the orchestrator's HTTPException, but a 422 surfaced from a
    worker task does NOT propagate to the HTTP response (the
    request has already returned 202). The preflight gate is the
    synchronous user-facing 422.
    """
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub_bytes(
            ac,
            _build_epub(declared_languages=["en"], chapter_langs=["en"]),
            "synthetic-en.epub",
        )
        r = await ac.post(
            "/api/v1/jobs",
            json={
                "job_type": "voiceover",
                "epub_id": epub_id,
                "voice": "alloy",
                "provider": "ollama",  # TTS is OpenAI-only
                "model": "llama2",
            },
        )
    assert r.status_code == 422, r.text
    body = r.json()
    # Per WR-01 the ``VoiceoverJobBody.provider`` field is now
    # ``Literal["openai-compatible"]`` — an ``"ollama"`` value is
    # rejected at Pydantic parse time. The router's preflight
    # gate (the per-job-type provider allowlist) is a redundant
    # 2nd layer; the stricter Literal gate surfaces first.
    # Pydantic's default 422 envelope (``{"detail": [...]}``) is
    # the response shape for parse-time rejections.
    assert "detail" in body, f"expected 422 envelope with 'detail' key, got: {body!r}"
    assert any(
        "ollama" in str(item.get("msg", "")).lower()
        or "openai-compatible" in str(item.get("msg", "")).lower()
        or "provider" in str(item.get("loc", []))
        for item in body["detail"]
    ), f"expected provider=ollama rejection in 422 detail, got: {body!r}"


async def test_voiceover_with_openai_provider_persists_columns(app: Any, db_path: Any) -> None:
    """A voiceover body with ``provider='openai-compatible'`` persists the columns (BACK-09 + BACK-10).

    The router forwards ``provider`` + ``model`` to
    ``job_repo.create_job(...)``. ``GET /api/v1/jobs/{id}`` returns
    the two new fields in the ``JobView``. The persistence surface
    is the user-facing contract for plan 01-03.
    """
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub_bytes(
            ac,
            _build_epub(declared_languages=["en"], chapter_langs=["en"]),
            "synthetic-en.epub",
        )
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
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["provider"] == "openai-compatible"
    assert body["model"] == "tts-1"
    job_id = body["id"]

    # Read back via GET /api/v1/jobs/{id}.
    transport2 = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport2, base_url="http://test") as ac2,
        app.router.lifespan_context(app),
    ):
        r2 = await ac2.get(f"/api/v1/jobs/{job_id}")
    assert r2.status_code == 200
    body2 = r2.json()
    assert body2["provider"] == "openai-compatible"
    assert body2["model"] == "tts-1"


# ---------------------------------------------------------------------------
# Phase 2 path preserved (translation regression)
# ---------------------------------------------------------------------------


async def test_translation_body_still_works(app: Any, db_path: Any) -> None:
    """A translation body still returns 202 (Phase 2 path preserved)."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        epub_id = await _upload_epub_bytes(
            ac,
            _build_epub(declared_languages=["en"], chapter_langs=["en"]),
            "synthetic-en.epub",
        )
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
    assert body["job_type"] == "translation"
    assert body["source_language"] == "en"
    assert body["target_language"] == "de"
    assert body["voice"] is None, f"voice should be None for translation job, got {body['voice']!r}"


# ---------------------------------------------------------------------------
# D-11 + D-13 regression: voiceover 501 is REMOVED for the voiceover-only body
# ---------------------------------------------------------------------------


async def test_voiceover_501_is_removed_for_voiceover_only(app: Any, db_path: Any) -> None:
    """The Phase 2 501 for ``voiceover`` is REMOVED; the body reaches create_job.

    Regression: previously this test asserted 501
    (``test_post_voiceover_without_provider_returns_501`` in
    ``test_jobs_router.py``). Phase 3 ships the voiceover pipeline,
    so the body MUST succeed.
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

        # Voiceover body now reaches create_job.
        epub_id = await _upload_epub_bytes(
            ac,
            _build_epub(declared_languages=["en"], chapter_langs=["en"]),
            "synthetic-en.epub",
        )
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
        assert r.status_code == 202, r.text

        # The job row is persisted with voice="alloy".
        r1 = await ac.get("/api/v1/jobs")
        assert r1.status_code == 200
        jobs = r1.json()["jobs"]
        assert len(jobs) == 1, f"expected 1 job, got {len(jobs)}"
        assert jobs[0]["job_type"] == "voiceover"
        assert jobs[0]["voice"] == "alloy"
        assert jobs[0]["source_language"] == "en"
        # Phase 1 / BACK-09: the persisted provider + model surface on
        # the list view.
        assert jobs[0]["provider"] == "openai-compatible"
        assert jobs[0]["model"] == "tts-1"
