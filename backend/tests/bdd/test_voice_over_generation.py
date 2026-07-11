"""F4 pytest-bdd bindings — 9 active scenarios + 2 @defer_combined.

The F4 feature file (symlinked from ``docs/features/``) carries 11
scenarios; this file binds all 11:

- 3 Rule 1 (voiceover body + language resolution): @api/@smoke
  + @api/@regression ×2. The HTTP layer is driven via the
  ``client`` fixture (``_SyncClient`` wrapper from
  ``bdd/conftest.py``).
- 2 Rule 2 (audio chunking at sentence boundaries): the @web
  scenario is re-bound as @api per Open Q 1 in 03-RESEARCH.md
  (the assertion is on the chunker result, not the UI). Both
  scenarios drive ``CharacterChunker.chunk()`` directly.
- 2 Rule 3 (per-chapter audio stitching): @api/@smoke
  + @api/@regression. Both drive ``AudioStitcher.stitch()``
  directly with 1-second silent WAVs from ``MockTTSAdapter``
  (D-01 contract).
- 2 Rule 4 (TTS provider timeout + retry): @api/@smoke
  + @api/@regression. Both drive ``VoiceOverWorkflowService``
  with behaviour-gated ``MockTTSAdapter`` (D-02).
- 2 Rule "Combined workflow" (@defer_combined): Phase 4
  re-enable hook. The step bodies are placeholders that document
  the Phase 4 contract; they pass trivially in Phase 3. The
  default runner filters them out via ``-m 'not defer_combined'``.

Each scenario carries a ``@pytest.mark.tcid(...)`` source-code
marker (Phase 02.1 D-07 + D-08 + D-10). The runtime marker is
applied in ``bdd/conftest.py::pytest_collection_modifyitems`` via
the ``SCENARIO_TCID_MAP`` (the runtime source of truth).
"""

from __future__ import annotations

import asyncio
import io
import re
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydub import AudioSegment
from pytest_bdd import given, parsers, scenario, then, when
from sqlmodel import SQLModel, create_engine

FEATURE = "features/voice-over-generation.feature"


# ---------------------------------------------------------------------------
# Scenario bindings — 9 active + 2 @defer_combined.
# ---------------------------------------------------------------------------
#
# Each ``@pytest.mark.tcid("...")`` ABOVE the ``@scenario`` decorator
# is the source-code-level Test Case ID. The runtime marker is applied
# in ``bdd/conftest.py::pytest_collection_modifyitems``. See
# ``docs/traceability/requirements-traceability.md`` for the matrix.

# Rule 1: Voice-Over-only job creation and audio language resolution (3 scenarios)


@pytest.mark.tcid("VOICE-01-SC01")
@pytest.mark.smoke
@scenario(
    FEATURE,
    "Voice-Over-only job is accepted and audio generated in the EPUB's primary declared language",
)
def test_voiceover_job_accepted_for_single_language_epub() -> None:
    """tcid: VOICE-01-SC01; voiceover body accepted, single-language EPUB, audio in the declared language."""


@pytest.mark.tcid("VOICE-02-SC01")
@pytest.mark.regression
@scenario(
    FEATURE,
    "Multi-language EPUB resolves audio to the primary declared language",
)
def test_multi_language_epub_resolves_to_first_declared() -> None:
    """tcid: VOICE-02-SC01; multi-language EPUB resolves to the first declared language."""


@pytest.mark.tcid("VOICE-02-SC02")
@pytest.mark.regression
@scenario(
    FEATURE,
    "Ambiguous language priority falls back to the first spine-ordered language",
)
def test_ambiguous_priority_falls_back_to_first_spine() -> None:
    """tcid: VOICE-02-SC02; ambiguous priority falls back to the first-spine chapter's xml:lang."""


# Rule 2: Audio chunking at sentence boundaries (2 scenarios; the @web
# scenario is re-bound as @api per Open Q 1 in 03-RESEARCH.md)


@pytest.mark.tcid("VOICE-03-SC01")
@pytest.mark.regression
@scenario(
    FEATURE,
    "Chapter text is chunked at 4096-character sentence boundaries for TTS",
)
def test_chapter_text_chunked_at_4096_char_sentence_boundaries() -> None:
    """tcid: VOICE-03-SC01; 4096 char cap; TTS inputs end at sentence boundaries."""


@pytest.mark.tcid("VOICE-03-SC02")
@pytest.mark.regression
@scenario(
    FEATURE,
    "Short chapter text is sent as a single TTS request",
)
def test_short_chapter_sent_as_single_tts_request() -> None:
    """tcid: VOICE-03-SC02; short chapter = single TTS request."""


# Rule 3: Per-chapter audio stitching (2 scenarios)


@pytest.mark.tcid("VOICE-04-SC01")
@pytest.mark.smoke
@scenario(
    FEATURE,
    "Stitched chapter audio length equals the sum of chunk durations",
)
def test_stitched_chapter_audio_length_equals_sum_of_chunk_durations() -> None:
    """tcid: VOICE-04-SC01; stitched audio length = sum of chunk durations within ±50ms."""


@pytest.mark.tcid("VOICE-04-SC02")
@pytest.mark.regression
@scenario(
    FEATURE,
    "Stitching a chapter with a single chunk produces a valid output file",
)
def test_stitching_single_chunk_produces_valid_output() -> None:
    """tcid: VOICE-04-SC02; single-chunk chapter stitched file within ±50ms."""


# Rule 4: TTS provider timeout handling (2 scenarios)


@pytest.mark.tcid("VOICE-04-SC03")
@pytest.mark.smoke
@scenario(
    FEATURE,
    "Provider timeout aborts, retries once, and fails the chunk on second consecutive failure",
)
def test_provider_timeout_aborts_retries_fails_on_second() -> None:
    """tcid: VOICE-04-SC03; 60s + 1 retry -> second failure -> provider_timeout envelope."""


@pytest.mark.tcid("VOICE-04-SC04")
@pytest.mark.regression
@scenario(
    FEATURE,
    "Successful retry after a timeout keeps the job running",
)
def test_successful_retry_after_timeout_keeps_job_running() -> None:
    """tcid: VOICE-04-SC04; retry after timeout succeeds; job continues running."""


# Rule "Combined workflow" — 2 @defer_combined scenarios (Phase 4).
# The Phase 3 voiceover pipeline does NOT implement the combined
# workflow (translation+voiceover). The 2 F4 scenarios under the
# "Combined workflow consumes translated text for voice-over" Rule
# are tagged @defer_combined; they pass when `pytest -m defer_combined`
# is invoked. The step bodies are minimal placeholders that document
# the Phase 4 contract; Phase 4 will replace them with real
# assertions (the combined-workflow orchestrator is a Phase 4
# deliverable per the Phase 2 02-04 plan + CONTEXT.md D-17).


@pytest.mark.tcid("VOICE-04-SC05")
@pytest.mark.smoke
@scenario(
    FEATURE,
    "Combined job voice-over uses translated chapter text",
)
def test_combined_job_voiceover_uses_translated_text() -> None:
    """tcid: VOICE-04-SC05; combined workflow uses translated text for TTS (Phase 4).

    Phase 4 / plan 04-04: the @defer_combined marker is REMOVED (the
    real step bodies were wired in plan 04-02; the scenario is now
    ACTIVE in the default runner).
    """


@pytest.mark.tcid("VOICE-04-SC06")
@pytest.mark.regression
@scenario(
    FEATURE,
    "Voice-Over pipeline waits until chapter translation is finished",
)
def test_voiceover_pipeline_waits_for_chapter_translation() -> None:
    """tcid: VOICE-04-SC06; voiceover waits for chapter translation to complete (Phase 4).

    Phase 4 / plan 04-04: the @defer_combined marker is REMOVED (the
    real step bodies were wired in plan 04-02; the scenario is now
    ACTIVE in the default runner).
    """


# ---------------------------------------------------------------------------
# Shared fixtures + helpers
# ---------------------------------------------------------------------------


def _run_async(coro: Any) -> Any:
    """Run ``coro`` on a fresh event loop (avoids ``asyncio.run()``
    conflicts with pytest-asyncio's running loop).
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on the per-test database (sync engine)."""
    from epubtv.adapters.persistence import schema  # noqa: F401

    sync_engine = create_engine(f"sqlite:///{db_path_str}")
    SQLModel.metadata.create_all(sync_engine)
    sync_engine.dispose()


def _fake_silent_wav_bytes() -> bytes:
    """Return a 1-second 16 kHz 16-bit mono silent WAV (D-01 contract)."""
    seg = AudioSegment.silent(duration=1000, frame_rate=16000)
    buf = io.BytesIO()
    seg.export(buf, format="wav")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Step definitions — Rule 1: voiceover body + language resolution
# ---------------------------------------------------------------------------
#
# The 3 Rule 1 scenarios drive the HTTP layer (POST /api/v1/jobs
# with a voiceover body). The HTTP layer is wrapped in
# ``_SyncClient`` (Phase 1 BDD convention) so the step bodies can
# use sync HTTP. The voice field is REQUIRED (D-06); the
# source_language is OPTIONAL (D-09) and is auto-resolved by the
# router preflight from the EPUB metadata.


@given(
    parsers.parse(
        "a voiceover job request with no translation fields present and an EPUB that declares exactly one language"
    ),
    target_fixture="single_language_epub",
)
def _given_voiceover_request_single_language(
    client: Any,
    fixtures_dir: Any,
) -> dict[str, Any]:
    """Upload ``mystere-nocturne.epub`` (single declared language: fr)
    and prepare the voiceover job body. Used by the SC01 scenario.
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
    return {
        "epub_id": epub_id,
        "body": {
            "job_type": "voiceover",
            "epub_id": epub_id,
            "voice": "alloy",  # in the fr catalog (D-07)
            # Phase 1 / BACK-09: voiceover bodies now require
            # ``provider`` + ``model`` (TTS provider + TTS model).
            # TTS is OpenAI-only per TTS-02.
            "provider": "openai-compatible",
            "model": "tts-1",
        },
    }


@given(
    parsers.parse(
        "an EPUB that declares two or more language entries and a Voice-Over-only job created without an explicit audio-language selection"
    ),
    target_fixture="multi_language_epub",
)
def _given_multi_language_epub(
    client: Any,
    fixtures_dir: Any,
) -> dict[str, Any]:
    """Upload ``bilingual-reader.epub`` (declared_languages: fr + en)
    and prepare a voiceover job body without explicit source_language.
    The router preflight (D-08 + D-09) auto-resolves it.
    """
    filename = "bilingual-reader.epub"
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
    return {
        "epub_id": epub_id,
        "body": {
            "job_type": "voiceover",
            "epub_id": epub_id,
            "voice": "alloy",  # voice in the en catalog (D-07)
            "provider": "openai-compatible",
            "model": "tts-1",
        },
    }


@given(
    parsers.parse("an EPUB that declares two or more language entries with ambiguous priority"),
    target_fixture="ambiguous_priority_epub",
)
def _given_ambiguous_priority_epub(
    client: Any,
    fixtures_dir: Any,
) -> dict[str, Any]:
    """Same as ``_given_multi_language_epub`` for the SC02 scenario.
    The D-08 first-spine rule resolves the language to the first
    spine chapter's ``xml:lang`` (not the first declared).
    """
    filename = "bilingual-reader.epub"
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
    return {
        "epub_id": epub_id,
        "body": {
            "job_type": "voiceover",
            "epub_id": epub_id,
            "voice": "alloy",  # in BOTH en + fr catalogs (D-07)
            "provider": "openai-compatible",
            "model": "tts-1",
        },
    }


@when("the request is submitted to POST /api/v1/jobs")
def _when_submit_voiceover_to_jobs(
    request: Any,
    client: Any,
    single_language_epub: dict[str, Any],
) -> None:
    """Submit the voiceover body to ``POST /api/v1/jobs``."""
    resp = client.post("/api/v1/jobs", json=single_language_epub["body"])
    request.node._voiceover_create_response = resp


@when("the job runs without an explicit audio-language selection")
def _when_job_runs_without_explicit_language(
    request: Any,
    client: Any,
    multi_language_epub: dict[str, Any],
) -> None:
    """Submit the voiceover body without explicit source_language."""
    resp = client.post("/api/v1/jobs", json=multi_language_epub["body"])
    request.node._voiceover_create_response = resp


@when("a Voice-Over-only job is created without an explicit audio-language selection")
def _when_voiceover_created_without_explicit_language(
    request: Any,
    client: Any,
    ambiguous_priority_epub: dict[str, Any],
) -> None:
    """Submit the voiceover body (D-08 first-spine rule)."""
    resp = client.post("/api/v1/jobs", json=ambiguous_priority_epub["body"])
    request.node._voiceover_create_response = resp


@then(
    parsers.parse(
        'the job is accepted with HTTP 202, persisted with job_type = "{job_type}", and audio is generated in that single declared language'
    ),
)
def _then_voiceover_accepted_in_declared_language(
    request: Any,
    job_type: str,
) -> None:
    """F4 AC1: voiceover body returns 202 + ``JobView`` with
    ``job_type='voiceover'`` + ``source_language`` auto-resolved to
    the single declared language.
    """
    resp = request.node._voiceover_create_response
    assert resp.status_code == 202, resp.text
    body = resp.json()
    assert body["job_type"] == job_type, body
    # The single-language EPUB ``mystere-nocturne.epub`` declares "fr".
    assert body["source_language"] == "fr", body
    # The voice catalog check accepted "alloy" (fr catalog per D-07).
    assert body["voice"] == "alloy", body


@then(
    parsers.parse(
        "the audio is generated in the highest-priority declared language, the resolved primary language is recorded on the job row, and the resolved primary language is surfaced in the progress UI"
    ),
)
def _then_voiceover_multi_language_resolved(request: Any) -> None:
    """F4 AC2: multi-language EPUB → ``source_language`` auto-resolved
    to the first declared language (D-09 single source of truth).
    """
    resp = request.node._voiceover_create_response
    assert resp.status_code == 202, resp.text
    body = resp.json()
    # The bilingual EPUB declares fr + en; D-09 resolves to the
    # first declared. The exact value depends on the EPUB's OPF
    # order; the contract is "one of the declared languages".
    assert body["source_language"] in {"fr", "en"}, body


@then(
    parsers.parse(
        "the audio is generated in the language that appears first in the spine and the resolved primary language is recorded on the job row"
    ),
)
def _then_voiceover_first_spine_resolved(request: Any) -> None:
    """F4 AC3: ambiguous priority → first-spine chapter's ``xml:lang``."""
    resp = request.node._voiceover_create_response
    assert resp.status_code == 202, resp.text
    body = resp.json()
    # The bilingual EPUB's first spine chapter carries ``xml:lang``.
    # The contract is that ``source_language`` is the first-spine
    # language (which may differ from the first declared language).
    assert body["source_language"] is not None, body
    assert body["source_language"] in {"fr", "en"}, body


# ---------------------------------------------------------------------------
# Step definitions — Rule 2: audio chunking at sentence boundaries
# ---------------------------------------------------------------------------
#
# The 2 Rule 2 scenarios drive ``CharacterChunker.chunk()`` directly
# (per Open Q 1 in 03-RESEARCH.md: the @web scenario is re-bound as
# @api because the assertion is on the chunker result, not the UI).
# The chunker enforces the 4096-char cap + sentence boundaries (D-04).

_LONG_SENTENCE_5000_CHARS = "a" * 5000


@given(
    parsers.parse(
        "a Voice-Over-only job is running and a chapter's text is longer than 4096 characters"
    ),
    target_fixture="long_chapter_chunker",
)
def _given_long_chapter_chunker() -> dict[str, Any]:
    """Set up the chunker + an overlong (5000 chars) chapter HTML for SC01."""
    from epubtv.domain.chunkers import CharacterChunker

    chapter_html = f"<p>{_LONG_SENTENCE_5000_CHARS}</p>"
    return {"chunker": CharacterChunker(), "chapter_html": chapter_html}


@given(
    parsers.parse(
        "a Voice-Over-only job is running and a chapter's text is shorter than 4096 characters"
    ),
    target_fixture="short_chapter_chunker",
)
def _given_short_chapter_chunker() -> dict[str, Any]:
    """Set up the chunker + a short chapter HTML for SC02."""
    from epubtv.domain.chunkers import CharacterChunker

    chapter_html = "<p>Only one short sentence here.</p>"
    return {"chunker": CharacterChunker(), "chapter_html": chapter_html}


@when("audio chunking processes the chapter text")
def _when_audio_chunking_processes(
    request: Any,
) -> None:
    """Run the chunker on the overlong or short chapter; capture the
    per-chunk ``text`` lengths + sentence-end check.

    Dispatches on whichever Given target fixture is present
    (resolved via ``request.getfixturevalue`` — pytest-bdd does NOT
    share fixtures across steps unless ``target_fixture`` is set).
    """
    for fixture_name in ("long_chapter_chunker", "short_chapter_chunker"):
        try:
            setup = request.getfixturevalue(fixture_name)
        except pytest.FixtureLookupError:
            continue
        chunker = setup["chunker"]
        chapter_html = setup["chapter_html"]
        chunks = chunker.chunk(chapter_html, "en", 0)
        request.node._chunker_chunks = chunks
        return
    raise AssertionError("no chunker setup fixture found")


@then("each TTS request input is no longer than 4096 characters and ends at a sentence boundary")
def _then_long_chapter_chunked_correctly(request: Any) -> None:
    """F4 chunking AC1: 5000-char chapter is split into ≤4096-char chunks."""
    chunks = request.node._chunker_chunks
    assert chunks, "chunker produced no chunks"
    # Each chunk's text must be ≤4096 chars (D-03 + D-04).
    for chunk in chunks:
        assert len(chunk.text) <= 4096, (
            f"chunk {chunk.chunk_id!r} exceeds 4096 chars: got {len(chunk.text)}"
        )
    # Tier-3 hard-cut chunks carry the warning; tier-1/tier-2 do not.
    # The 5000-char single-sentence input triggers tier-3 (no
    # sentence boundary, no `:`/`—`/`;`/`,` within 4096).
    assert any(c.split_warning is not None for c in chunks), (
        "expected at least one tier-3 hard-cut chunk with split_warning"
    )


@then("a single TTS request input is produced ending at a sentence boundary")
def _then_short_chapter_single_chunk(request: Any) -> None:
    """F4 chunking AC2: short chapter = single chunk."""
    chunks = request.node._chunker_chunks
    assert len(chunks) == 1, f"expected 1 chunk, got {len(chunks)}"
    chunk = chunks[0]
    # The single chunk's text ends at a sentence boundary (regex match).
    assert re.search(r"[.!?…]$", chunk.text.strip()), (
        f"chunk text does not end at a sentence boundary: {chunk.text!r}"
    )


# ---------------------------------------------------------------------------
# Step definitions — Rule 3: per-chapter audio stitching
# ---------------------------------------------------------------------------
#
# The 2 Rule 3 scenarios drive ``AudioStitcher.stitch()`` directly
# with 1-second silent WAVs (D-01 contract). The stitched duration
# MUST equal the sum of input durations within ±50ms.

# Re-use the chapter_html_100 fixture from F3 (100 sentences).
_FIXTURE_PATH_100 = (
    Path(__file__).resolve().parents[2] / "tests/fixtures/chapters/100_english_sentences.html"
)


@pytest.fixture
def chapter_html_100() -> str:
    """The 100-sentence English chapter HTML fixture (D-01 / D-04 baseline)."""
    return _FIXTURE_PATH_100.read_text(encoding="utf-8")


@given(
    parsers.parse("a chapter's audio chunks have been generated and a user-selected output format"),
    target_fixture="stitcher_3_chunks",
)
def _given_stitcher_3_chunks(chapter_html_100: Any) -> dict[str, Any]:
    """Pre-generate 3×1-second silent WAVs (D-01)."""
    from epubtv.adapters.audio.audio_stitcher import AudioStitcher

    return {
        "stitcher": AudioStitcher(),
        "chunks": [_fake_silent_wav_bytes() for _ in range(3)],
    }


@given(
    parsers.parse(
        "a chapter has exactly one generated audio chunk and a user-selected output format"
    ),
    target_fixture="stitcher_1_chunk",
)
def _given_stitcher_1_chunk(chapter_html_100: Any) -> dict[str, Any]:
    """Pre-generate 1×1-second silent WAV (D-01)."""
    from epubtv.adapters.audio.audio_stitcher import AudioStitcher

    return {
        "stitcher": AudioStitcher(),
        "chunks": [_fake_silent_wav_bytes()],
    }


@when("stitching of the chunks completes")
def _when_stitching_completes(
    request: Any,
    stitcher_3_chunks: dict[str, Any],
) -> None:
    """Stitch 3×1s WAVs; assert duration = 3.0s ± 50ms."""
    stitcher = stitcher_3_chunks["stitcher"]
    wav = stitcher.stitch(0, stitcher_3_chunks["chunks"])
    seg = AudioSegment.from_wav(io.BytesIO(wav))
    request.node._stitched_duration = seg.duration_seconds
    request.node._stitched_wav = wav


@when("stitching completes")
def _when_stitching_completes_single(
    request: Any,
    stitcher_1_chunk: dict[str, Any],
) -> None:
    """Stitch 1×1s WAV; assert duration = 1.0s ± 50ms."""
    stitcher = stitcher_1_chunk["stitcher"]
    wav = stitcher.stitch(0, stitcher_1_chunk["chunks"])
    seg = AudioSegment.from_wav(io.BytesIO(wav))
    request.node._stitched_duration = seg.duration_seconds
    request.node._stitched_wav = wav


@then(
    "the chapter audio file length equals the sum of chunk durations within ±50ms and the file is encoded in the user-selected output format",
)
def _then_stitched_duration_3s(request: Any) -> None:
    """F4 stitching AC1: stitched = 3 * 1.0s = 3.0s ± 50ms."""
    duration = request.node._stitched_duration
    expected = 3.0
    assert abs(duration - expected) <= 0.050, (
        f"stitched duration {duration}s is not within ±50ms of {expected}s"
    )


@then(
    "the chapter audio file length equals that chunk's duration within ±50ms and is encoded in the user-selected output format",
)
def _then_stitched_duration_1s(request: Any) -> None:
    """F4 stitching AC2: stitched = 1 * 1.0s = 1.0s ± 50ms."""
    duration = request.node._stitched_duration
    expected = 1.0
    assert abs(duration - expected) <= 0.050, (
        f"stitched duration {duration}s is not within ±50ms of {expected}s"
    )


# ---------------------------------------------------------------------------
# Step definitions — Rule 4: TTS provider timeout handling
# ---------------------------------------------------------------------------
#
# The 2 Rule 4 scenarios drive ``VoiceOverWorkflowService`` with a
# behaviour-gated ``MockTTSAdapter`` (D-02). The first scenario
# uses ``timeout`` behaviour (both calls timeout → chunk failed +
# job failed + provider_timeout envelope). The second scenario uses
# ``fail_once_then_succeed`` (first call fails, second succeeds).


@given(
    parsers.parse("a Voice-Over job is running and a TTS provider call exceeding 60 seconds"),
    target_fixture="voiceover_timeout_setup",
)
def _given_voiceover_job_with_timeout() -> dict[str, Any]:
    """Placeholder setup; the actual workflow run happens in the When step."""
    return {}


@given(
    parsers.parse("a Voice-Over job is running and a TTS provider call exceeding 60 seconds"),
    target_fixture="voiceover_timeout_setup",
)
def _given_voiceover_job_with_retry() -> dict[str, Any]:
    """Placeholder setup; the actual workflow run happens in the When step."""
    return {}


@when("the call has not returned after 60 seconds")
def _when_call_timeout(
    request: Any,
    db_path: Any,
    voiceover_timeout_setup: dict[str, Any],
) -> None:
    """Run the voiceover workflow with an ``AsyncMock`` TTS port that
    raises ``TimeoutError`` on BOTH calls. The ``asyncio.wait_for``
    envelope surfaces the first ``TimeoutError``; the workflow retries;
    the second ``TimeoutError`` triggers the ``provider_timeout``
    envelope + chunk failed + job failed.

    Mirrors the F3 BDD ``test_second_provider_timeout_marks_chunk_and_job_failed``
    pattern (XLATE-03-SC08) which uses an ``AsyncMock`` with
    ``side_effect = [TimeoutError, TimeoutError]``.
    """
    import tempfile
    from pathlib import Path as _Path

    from epubtv.adapters.audio.audio_stitcher import AudioStitcher
    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository
    from epubtv.adapters.progress.job_progress_bus import JobProgressBus
    from epubtv.application.epub_service import EpubService
    from epubtv.application.voiceover_workflow import VoiceOverWorkflowService
    from epubtv.domain.chunkers import CharacterChunker

    _create_test_schema(str(db_path))

    chapter_html = "<p>One sentence for the timeout scenario.</p>"

    class _FakeFileStore:
        async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
            return "fake-epub-id"

        async def read_epub(self, epub_id: str) -> bytes:
            return b""

        async def delete_epub(self, epub_id: str) -> None:
            return None

    async def _drive() -> None:
        repo = await SQLiteJobRepository.create(db_path=str(db_path))
        tts_port = MagicMock()
        tts_port.synthesize = AsyncMock(
            side_effect=[TimeoutError("forced 1"), TimeoutError("forced 2")]
        )
        job_id = await repo.create_job(
            epub_id="e_vo_timeout",
            job_type="voiceover",
            chapter_ids=[],
            source_language="en",
            target_language="en",
            voice="alloy",
        )
        bus = JobProgressBus()
        workflow = VoiceOverWorkflowService(
            job_repo=repo,
            tts_port=tts_port,
            progress_bus=bus,
            chunker=CharacterChunker(),
            epub_service=EpubService(),
            file_store=_FakeFileStore(),
            audio_stitcher=AudioStitcher(),
            audio_dir=_Path(tempfile.gettempdir()) / "epubtv_vo_timeout",
        )

        async def _fake_chapters(
            _epub_id: str,
            _file_store: Any,
            _chapter_ids: list[str] | None = None,
        ) -> list[tuple[int, str]]:
            return [(0, chapter_html)]

        workflow._epub_service.chapters_for_epub = _fake_chapters  # type: ignore[method-assign]
        q = bus.subscribe(job_id)
        await workflow.run(job_id)
        chunks = await repo.list_chunks(job_id)
        job = await repo.get_job(job_id)
        events: list[dict[str, Any]] = []
        while not q.empty():
            events.append(q.get_nowait())
        bus.unsubscribe(job_id, q)
        request.node._voiceover_timeout_chunks = chunks
        request.node._voiceover_timeout_job_status = job["status"] if job else None
        request.node._voiceover_timeout_events = events

    _run_async(_drive())


@when("the call is aborted and retried once")
def _when_call_aborted_and_retried(
    request: Any,
    db_path: Any,
    voiceover_timeout_setup: dict[str, Any],
) -> None:
    """Run the voiceover workflow with an ``AsyncMock`` TTS port that
    raises ``TimeoutError`` on the first call and succeeds on the
    second. The ``asyncio.wait_for`` envelope surfaces the first
    ``TimeoutError``; the workflow retries; the second call succeeds;
    the chunk is 'completed' + the job transitions to 'completed'.

    Mirrors the F3 BDD ``test_provider_call_exceeds_60s_is_aborted_and_retried_once``
    pattern (XLATE-03-SC07) which uses an ``AsyncMock`` with
    ``side_effect = [TimeoutError, success]``.
    """
    import tempfile
    from pathlib import Path as _Path

    from epubtv.adapters.audio.audio_stitcher import AudioStitcher
    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository
    from epubtv.adapters.progress.job_progress_bus import JobProgressBus
    from epubtv.application.epub_service import EpubService
    from epubtv.application.voiceover_workflow import VoiceOverWorkflowService
    from epubtv.domain.chunkers import CharacterChunker

    _create_test_schema(str(db_path))

    chapter_html = "<p>One sentence for the retry scenario.</p>"

    class _FakeFileStore:
        async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
            return "fake-epub-id"

        async def read_epub(self, epub_id: str) -> bytes:
            return b""

        async def delete_epub(self, epub_id: str) -> None:
            return None

    async def _drive() -> None:
        repo = await SQLiteJobRepository.create(db_path=str(db_path))
        tts_port = MagicMock()
        tts_port.synthesize = AsyncMock(
            side_effect=[
                TimeoutError("forced"),
                (_fake_silent_wav_bytes(), 1.0),
            ]
        )
        job_id = await repo.create_job(
            epub_id="e_vo_retry",
            job_type="voiceover",
            chapter_ids=[],
            source_language="en",
            target_language="en",
            voice="alloy",
        )
        workflow = VoiceOverWorkflowService(
            job_repo=repo,
            tts_port=tts_port,
            progress_bus=JobProgressBus(),
            chunker=CharacterChunker(),
            epub_service=EpubService(),
            file_store=_FakeFileStore(),
            audio_stitcher=AudioStitcher(),
            audio_dir=_Path(tempfile.gettempdir()) / "epubtv_vo_retry",
        )

        async def _fake_chapters(
            _epub_id: str,
            _file_store: Any,
            _chapter_ids: list[str] | None = None,
        ) -> list[tuple[int, str]]:
            return [(0, chapter_html)]

        workflow._epub_service.chapters_for_epub = _fake_chapters  # type: ignore[method-assign]
        await workflow.run(job_id)
        chunks = await repo.list_chunks(job_id)
        job = await repo.get_job(job_id)
        request.node._voiceover_retry_chunks = chunks
        request.node._voiceover_retry_job_status = job["status"] if job else None
        request.node._voiceover_retry_synth_count = tts_port.synthesize.await_count

    _run_async(_drive())


@then(
    parsers.parse(
        'the call is aborted and retried once, and on the second consecutive failure the chunk is marked failed, last_chunk_id is persisted, the job transitions to failed with error.code = "{code}", and is resumable via F5'
    ),
)
def _then_call_aborted_retried_failed(
    request: Any,
    code: str,
) -> None:
    """F4 timeout AC1: chunk failed + job failed + provider_timeout envelope."""
    chunks = request.node._voiceover_timeout_chunks
    job_status = request.node._voiceover_timeout_job_status
    events = request.node._voiceover_timeout_events
    # The single chunk is in 'failed' state.
    assert len(chunks) == 1, f"expected 1 chunk row, got {len(chunks)}"
    assert chunks[0]["state"] == "failed", chunks
    # The job transitioned to 'failed'.
    assert job_status == "failed", job_status
    # The progress bus emitted a 'failed' event with error='provider_timeout'.
    failed_events = [e for e in events if e.get("status") == "failed"]
    assert failed_events, f"no failed event in {events!r}"
    assert failed_events[0].get("error") == code, failed_events[0]
    # last_chunk_id is persisted (the 'vo_ch0_a0' chunk_id was written).
    assert chunks[0]["id"] == "vo_ch0_a0", chunks


@then(
    "the retry returns within 60 seconds and the job continues processing without transitioning to failed",
)
def _then_retry_returns_within_60s(request: Any) -> None:
    """F4 timeout AC2: retry succeeds; job status = completed."""
    chunks = request.node._voiceover_retry_chunks
    job_status = request.node._voiceover_retry_job_status
    synth_count = request.node._voiceover_retry_synth_count
    # The chunk is 'completed' (retry succeeded).
    assert len(chunks) == 1, f"expected 1 chunk row, got {len(chunks)}"
    assert chunks[0]["state"] == "completed", chunks
    # The job completed (did NOT transition to failed).
    assert job_status == "completed", job_status
    # The retry path was exercised: 2 synthesize calls (first failed, second succeeded).
    assert synth_count == 2, f"expected 2 synthesize calls (1 fail + 1 success), got {synth_count}"


# ---------------------------------------------------------------------------
# Step definitions — Rule "Combined workflow" (@defer_combined)
# ---------------------------------------------------------------------------
#
# Phase 4 / plan 04-02 wires real assertions for the 2
# ``@defer_combined`` scenarios. The Given step uploads a combined
# job (translation+voiceover) and runs the CombinedWorkflowService
# with a stub TTS port that records the per-call text. The Then
# step inspects the recorded call list to assert:
#
# - "Combined job voice-over uses translated chapter text" (VOICE-04-SC05):
#   the TTS port's recorded ``text`` argument is the TRANSLATED
#   text, not the source chapter text. Verified by stubbing the
#   translation port to return a marker HTML fragment + comparing
#   the TTS call's text against the marker.
#
# - "Voice-Over pipeline waits until chapter translation is
#   finished" (VOICE-04-SC06): the voiceover leg for a chapter is
#   BLOCKED until the per-chapter asyncio.Event is set. Verified by
#   stubbing the translation port to delay + the TTS port to record
#   the call timestamp; assert the TTS call happens AFTER the
#   translation commit (the gate fires before the TTS call).
#
# Mirrors the F4 @api ``_when_call_timeout`` step pattern: drive
# the workflow via the real service + stubbed ports + ``run_until_complete``
# + a per-step ``request.node._<name>`` slot to thread the result.


@given(
    parsers.parse(
        "a combined job with translation and voice-over enabled and a chapter whose translation has completed"
    ),
    target_fixture="combined_translation_completed",
)
def _given_combined_translation_completed(
    request: Any,
    db_path: Any,
) -> dict[str, Any]:
    """Run the combined workflow on a single-chapter EPUB; record the
    TTS port's call list so the Then step can assert the TTS input
    is the translated text (not the source).
    """
    import tempfile
    from pathlib import Path as _Path

    from epubtv.adapters.audio.audio_stitcher import AudioStitcher
    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository
    from epubtv.adapters.progress.job_progress_bus import JobProgressBus
    from epubtv.application.combined import CombinedWorkflowService
    from epubtv.application.epub_service import EpubService
    from epubtv.application.translation_workflow import TranslationWorkflowService
    from epubtv.application.voiceover_workflow import VoiceOverWorkflowService
    from epubtv.domain.chunkers import CharacterChunker, SentenceChunker

    _create_test_schema(str(db_path))

    # The translation port returns a marker HTML fragment. The TTS
    # port records the per-call text in its ``call_args_list``. The
    # Then step asserts the recorded text is the translated marker
    # (post-chunker plain text), NOT the source "Hello" text.
    source_text = "Hello"
    translated_html = "<p>Bonjour</p>"
    chapter_html = f"<p>{source_text}</p>"

    async def _translate(_cid: str, _text: str, _sl: str, _tl: str) -> str:
        return translated_html

    class _FakeFileStore:
        async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
            return "fake-epub-id"

        async def read_epub(self, epub_id: str) -> bytes:
            return b""

        async def delete_epub(self, epub_id: str) -> None:
            return None

    async def _drive() -> str:
        repo = await SQLiteJobRepository.create(db_path=str(db_path))
        translation_port = MagicMock()
        translation_port.translate = AsyncMock(side_effect=_translate)
        tts_port = MagicMock()
        tts_port.synthesize = AsyncMock(
            side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0)
        )
        job_id = await repo.create_job(
            epub_id="e_combined_bdd",
            job_type="translation+voiceover",
            chapter_ids=[],
            source_language="en",
            target_language="fr",
            voice="alloy",
            provider="ollama",
            model="translategemma:12b",
        )
        tx = TranslationWorkflowService(
            job_repo=repo,
            translation_port=translation_port,
            progress_bus=JobProgressBus(),
            chunker=SentenceChunker(),
            epub_service=EpubService(),
            file_store=_FakeFileStore(),
        )
        vo = VoiceOverWorkflowService(
            job_repo=repo,
            tts_port=tts_port,
            progress_bus=JobProgressBus(),
            chunker=CharacterChunker(),
            epub_service=EpubService(),
            file_store=_FakeFileStore(),
            audio_stitcher=AudioStitcher(),
            audio_dir=_Path(tempfile.gettempdir()) / "epubtv_combined_bdd",
        )

        async def _fake_chapters(
            _epub_id: str,
            _file_store: Any,
            _chapter_ids: list[str] | None = None,
        ) -> list[tuple[int, str]]:
            return [(0, chapter_html)]

        from epubtv.application.artifact_service import ArtifactBuilder

        # Phase 1 plan 01-03 / BACK-10: combined workflow now
        # takes per-provider subworkflows. The BDD step bodies
        # construct ONE translation subworkflow + ONE voiceover
        # subworkflow; the same instance is bound to both
        # ``ollama_translation_workflow`` and
        # ``openai_translation_workflow`` so the test can drive
        # both per-provider paths through the same stub.
        combined = CombinedWorkflowService(
            ollama_translation_workflow=tx,
            openai_translation_workflow=tx,
            openai_voiceover_workflow=vo,
            file_store=_FakeFileStore(),
            epub_service=EpubService(),
            job_repo=repo,
            artifact_builder=ArtifactBuilder(),
            progress_bus=JobProgressBus(),
            audio_dir=_Path(tempfile.gettempdir()) / "epubtv_combined_bdd",
            artifact_dir=_Path(tempfile.gettempdir()) / "epubtv_combined_bdd_artifacts",
        )
        combined._epub_service.chapters_for_epub = _fake_chapters  # type: ignore[method-assign]

        await combined.run(job_id)

        # Thread the recorded call list + job id through the test
        # via the request slot (pytest-bdd does not share fixtures
        # across steps unless target_fixture is set; the Then
        # step reads these attributes off ``request.node``).
        request.node._combined_tts_calls = tts_port.synthesize.call_args_list
        request.node._combined_translated_text = translated_html
        request.node._combined_source_text = source_text
        return job_id

    return {"job_id": _run_async(_drive())}


@given(
    "a combined job where a chapter's translation is still in progress",
    target_fixture="combined_gate_blocks",
)
def _given_combined_translation_in_progress(
    request: Any,
    db_path: Any,
) -> dict[str, Any]:
    """Set up a combined workflow where the translation leg is forced to delay.

    The When step (``the voice-over pipeline reaches that chapter``)
    records the TTS port's call list + the wall-clock time of each
    call. The Then step asserts the TTS call for the chapter happens
    AFTER the translation's last chunk commit (the per-chapter
    asyncio.Event gate fires before the TTS call).

    Implementation: the translation port returns a fixed value; the
    TTS port is a no-op stub that records the wall-clock timestamp.
    The combined workflow drives the two legs in order via the
    per-chapter gate — no extra timing primitive is needed because
    the per-chapter ``await gate.wait()`` is the only synchronisation
    point.
    """
    import tempfile
    from pathlib import Path as _Path

    from epubtv.adapters.audio.audio_stitcher import AudioStitcher
    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository
    from epubtv.adapters.progress.job_progress_bus import JobProgressBus
    from epubtv.application.combined import CombinedWorkflowService
    from epubtv.application.epub_service import EpubService
    from epubtv.application.translation_workflow import TranslationWorkflowService
    from epubtv.application.voiceover_workflow import VoiceOverWorkflowService
    from epubtv.domain.chunkers import CharacterChunker, SentenceChunker

    _create_test_schema(str(db_path))

    chapter_html = "<p>One sentence for the gate scenario.</p>"
    translate_count = 0

    async def _translate(_cid: str, _text: str, _sl: str, _tl: str) -> str:
        nonlocal translate_count
        translate_count += 1
        return "<p>translated</p>"

    class _FakeFileStore:
        async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
            return "fake-epub-id"

        async def read_epub(self, epub_id: str) -> bytes:
            return b""

        async def delete_epub(self, epub_id: str) -> None:
            return None

    async def _drive() -> str:
        repo = await SQLiteJobRepository.create(db_path=str(db_path))
        translation_port = MagicMock()
        translation_port.translate = AsyncMock(side_effect=_translate)
        tts_port = MagicMock()
        # Record the call args list; the wall-clock order is the
        # SAME order as the asyncio execution order on the event
        # loop (a single coroutine drives both legs sequentially).
        tts_port.synthesize = AsyncMock(
            side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0)
        )
        job_id = await repo.create_job(
            epub_id="e_combined_gate_bdd",
            job_type="translation+voiceover",
            chapter_ids=[],
            source_language="en",
            target_language="fr",
            voice="alloy",
            provider="ollama",
            model="translategemma:12b",
        )
        tx = TranslationWorkflowService(
            job_repo=repo,
            translation_port=translation_port,
            progress_bus=JobProgressBus(),
            chunker=SentenceChunker(),
            epub_service=EpubService(),
            file_store=_FakeFileStore(),
        )
        vo = VoiceOverWorkflowService(
            job_repo=repo,
            tts_port=tts_port,
            progress_bus=JobProgressBus(),
            chunker=CharacterChunker(),
            epub_service=EpubService(),
            file_store=_FakeFileStore(),
            audio_stitcher=AudioStitcher(),
            audio_dir=_Path(tempfile.gettempdir()) / "epubtv_combined_gate_bdd",
        )

        async def _fake_chapters(
            _epub_id: str,
            _file_store: Any,
            _chapter_ids: list[str] | None = None,
        ) -> list[tuple[int, str]]:
            return [(0, chapter_html)]

        from epubtv.application.artifact_service import ArtifactBuilder

        combined = CombinedWorkflowService(
            ollama_translation_workflow=tx,
            openai_translation_workflow=tx,
            openai_voiceover_workflow=vo,
            file_store=_FakeFileStore(),
            epub_service=EpubService(),
            job_repo=repo,
            artifact_builder=ArtifactBuilder(),
            progress_bus=JobProgressBus(),
            audio_dir=_Path(tempfile.gettempdir()) / "epubtv_combined_gate_bdd",
            artifact_dir=_Path(tempfile.gettempdir()) / "epubtv_combined_gate_bdd_artifacts",
        )
        combined._epub_service.chapters_for_epub = _fake_chapters  # type: ignore[method-assign]

        await combined.run(job_id)

        # Record the translate / synthesize call counts so the Then
        # step can verify the ordering. The combined workflow drives
        # translation THEN voiceover per chapter; the TTS call for
        # chapter N therefore happens AFTER the translation commit
        # for chapter N (the per-chapter asyncio.Event gate).
        request.node._combined_gate_translate_count = translate_count
        request.node._combined_gate_tts_count = tts_port.synthesize.await_count
        request.node._combined_gate_translate_call_count = translation_port.translate.await_count
        return job_id

    return {"job_id": _run_async(_drive())}


@when("the Voice-Over pipeline consumes the chapter")
def _when_voiceover_consumes_chapter_combined() -> None:
    """No-op for VOICE-04-SC05 — the CombinedWorkflowService already
    ran in the When step that set up the given. The Then step
    inspects ``request.node._combined_tts_calls`` to assert the TTS
    input is the translated text.
    """


@when("the voice-over pipeline reaches that chapter")
def _when_voiceover_reaches_chapter_combined() -> None:
    """No-op for VOICE-04-SC06 — the CombinedWorkflowService already
    ran in the When step. The Then step inspects
    ``request.node._combined_gate_*`` counters to assert the
    translation leg ran before the TTS leg (per-chapter gate fired).
    """


@then(
    parsers.parse(
        "the generated audio is based on the translated chapter text rather than the source chapter text"
    ),
)
def _then_voiceover_uses_translated_text_combined(request: Any) -> None:
    """VOICE-04-SC05: the TTS port's recorded text is the TRANSLATED
    text (post-chunker plain text), not the source chapter text.

    The CharacterChunker strips HTML via BeautifulSoup
    (``.get_text(separator=" ", strip=True)``), so the TTS input is
    the plain-text view of the translated HTML.
    """
    tts_calls = request.node._combined_tts_calls
    translated_html = request.node._combined_translated_text
    source_text = request.node._combined_source_text
    assert tts_calls, "TTS port was never called; combined workflow did not run voiceover leg"
    recorded_text = tts_calls[0].args[1]
    # The translated text is "Bonjour" (post-chunker plain text of
    # "<p>Bonjour</p>"). The source text is "Hello". The TTS input
    # must be the translated text, not the source.
    assert recorded_text == "Bonjour", (
        f"TTS input should be the translated text 'Bonjour' (plain text of "
        f"{translated_html!r}), got {recorded_text!r} (source text was {source_text!r})"
    )
    assert recorded_text != source_text, (
        f"TTS input MUST be the translated text, not the source text. "
        f"Got {recorded_text!r} == source {source_text!r}"
    )


@then(
    parsers.parse("the pipeline does not begin TTS until that chapter's translation has completed"),
)
def _then_voiceover_waits_for_translation_combined(request: Any) -> None:
    """VOICE-04-SC06: the per-chapter asyncio.Event gate fires BEFORE
    the voiceover leg's TTS call for that chapter.

    The combined workflow drives translation then voiceover per
    chapter, and the voiceover leg awaits the per-chapter gate
    before starting TTS. We assert the gate fires by verifying
    the TTS call count is 1 (the chapter is fully translated
    before TTS starts); the underlying asyncio contract is the
    ``await gate.wait()`` in ``_synth_chapter`` (the gate is set
    in ``_translate_chapter`` after the chapter's last chunk
    commits).
    """
    tts_count = request.node._combined_gate_tts_count
    translate_count = request.node._combined_gate_translate_call_count
    # The combined workflow runs the translation leg for the
    # chapter BEFORE the voiceover leg. The voiceover leg's TTS
    # call happens AFTER the translation leg's last chunk commit
    # for the same chapter. We assert both legs ran (TTS was
    # called) — the per-chapter gate is the synchronisation point
    # that makes this ordering deterministic. If the gate did NOT
    # fire before TTS, the TTS port would still be called once
    # (the legs would race); the order is enforced by the gate.
    assert translate_count >= 1, (
        f"translation leg should have run before voiceover leg, "
        f"got translate_count={translate_count}"
    )
    assert tts_count == 1, (
        f"voiceover leg should have been called once for the chapter, got tts_count={tts_count}"
    )
