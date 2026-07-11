"""BDD test harness — shared helpers for the F2 / F3 / F4 / F5 pytest-bdd suite.

Re-exports the ``MockTranslatorDropsNthTag`` test profile from
``tests/unit/_harness.py`` (plan 02-01) so BDD step definitions can
exercise the F3 "exactly 95%" / "<95% rejected" regressions without
importing the unit-test harness directly. Adds BDD-specific helpers:

- ``wait_for_ws_event(bus, job_id, timeout=1.0)`` — subscribe to the
  ``JobProgressBus`` and await the next event. Used by the F5 WS
  @integration scenarios (on-time subscriber + late subscriber).
- ``setup_translation_job(client, epub_id, ...)`` — POST
  ``/api/v1/jobs`` with a translation body and return the new
  ``job_id``. Used by the F3 + F5 BDD scenarios that need a job row
  for resume / progress / WS tests.
- ``setup_voiceover_job(client, epub_id, *, voice, source_language=None)`` —
  POST ``/api/v1/jobs`` with a voiceover body and return the new
  ``job_id`` (Phase 3 / D-06 + D-09). Mirrors
  ``setup_translation_job``; the ``voice`` field is REQUIRED (D-06),
  the ``source_language`` is OPTIONAL (the router preflight
  auto-resolves it from the EPUB metadata per D-08 + D-09).
- ``wait_for_voiceover_audio_file(job_repo, job_id, timeout=5.0)`` —
  Poll ``job_repo.list_audio_files(job_id)`` every 100ms until at
  least one row is present (or ``timeout`` elapses). Used by the F4
  BDD scenarios that assert the per-chapter WAV was registered
  (D-13 + D-16). The async polling requires a running event loop;
  the F4 step bodies call it from ``_run_async``.

Lives under ``tests/bdd/`` (per ``bdd/conftest.py`` Phase 1
convention) so the BDD step bodies can import without changing the
import paths from the F1 BDD tests.
"""

from __future__ import annotations

import asyncio
import sys
import time
from pathlib import Path
from typing import Any

# Make ``_harness`` (a test-only seam at tests/unit/_harness.py)
# importable as a top-level module. Pyrefly + the standalone test
# runner do not add ``tests/unit`` to ``sys.path`` automatically.
_TESTS_UNIT_DIR = Path(__file__).resolve().parent.parent / "unit"
if str(_TESTS_UNIT_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_UNIT_DIR))

from _harness import (  # noqa: E402
    MockTranslatorDropsNthTag,
)

__all__ = [
    "MockTranslatorDropsNthTag",
    "setup_combined_job",
    "setup_translation_job",
    "setup_voiceover_job",
    "wait_for_voiceover_audio_file",
    "wait_for_ws_event",
]


async def wait_for_ws_event(
    bus: Any,
    job_id: str,
    timeout: float = 1.0,
) -> dict[str, Any]:
    """Subscribe to ``bus`` and await the next event for ``job_id``.

    Returns the event dict on first emit; raises ``asyncio.TimeoutError``
    if no event arrives within ``timeout`` seconds. Used by the F5
    @integration BDD scenarios (the 6-field WS envelope must arrive
    within 1 second of a chunk completion per F5-AC5).
    """
    q = bus.subscribe(job_id)
    try:
        return await asyncio.wait_for(q.get(), timeout=timeout)
    finally:
        bus.unsubscribe(job_id, q)


def setup_translation_job(
    client: Any,
    epub_id: str,
    *,
    provider: str,
    model: str,
    source_language: str | None,
    target_language: str,
) -> str:
    """POST ``/api/v1/jobs`` with a translation body and return the new job_id.

    The ``client`` is a ``_SyncClient`` (BDD step bodies are sync; see
    ``bdd/conftest.py``). Asserts the POST returns 202 + a non-empty
    ``id``; surfaces the response text on failure for debug clarity.

    Used by the F3 + F5 BDD scenarios that need a job row. The
    ``source_language`` parameter accepts ``None`` for the
    D-06-pre-flight paths.
    """
    payload: dict[str, Any] = {
        "job_type": "translation",
        "epub_id": epub_id,
        "provider": provider,
        "model": model,
        "source_language": source_language,
        "target_language": target_language,
    }
    resp = client.post("/api/v1/jobs", json=payload)
    assert resp.status_code == 202, resp.text
    return resp.json()["id"]


def setup_voiceover_job(
    client: Any,
    epub_id: str,
    *,
    voice: str,
    source_language: str | None = None,
    provider: str = "openai-compatible",
    model: str = "tts-1",
) -> str:
    """POST ``/api/v1/jobs`` with a voiceover body and return the new job_id.

    Mirrors ``setup_translation_job`` (Phase 3 plan 03-05). Used by
    the F4 BDD scenarios + the 2 F5 voiceover resume scenarios (the
    voiceover-only ``POST /api/v1/jobs`` path — D-11 + D-13).

    The ``voice`` field is REQUIRED (D-06: ``Field(..., min_length=1)``);
    the ``source_language`` is OPTIONAL (D-09: the router preflight
    auto-resolves it from ``EpubService.resolve_voiceover_language``
    when omitted). The ``provider`` + ``model`` fields are REQUIRED
    (Phase 1 plan 01-03 / BACK-09: the TTS provider + TTS model
    key). The defaults are ``"openai-compatible"`` / ``"tts-1"`` (TTS
    is OpenAI-only per TTS-02); tests can override per-call.
    The returned ``job_id`` is a uuid4 hex string suitable for
    ``GET /api/v1/jobs/{id}`` and WS subscription.
    """
    payload: dict[str, Any] = {
        "job_type": "voiceover",
        "epub_id": epub_id,
        "voice": voice,
        "provider": provider,
        "model": model,
    }
    if source_language is not None:
        payload["source_language"] = source_language
    resp = client.post("/api/v1/jobs", json=payload)
    assert resp.status_code == 202, resp.text
    return resp.json()["id"]


def setup_combined_job(
    client: Any,
    epub_id: str,
    *,
    voice: str = "alloy",
    provider: str = "ollama",
    model: str = "translategemma:12b",
    source_language: str | None = None,
    target_language: str = "en",
) -> str:
    """POST ``/api/v1/jobs`` with a ``translation+voiceover`` body and return the new job_id.

    Mirrors ``setup_translation_job`` + ``setup_voiceover_job`` (Phase 4
    / plan 04-04). The combined body includes BOTH the translation
    fields (provider / model / source / target) AND the voice field;
    the router preflight (D-06 + D-08 + D-09) handles the source
    language auto-resolve + voice catalog check.

    The defaults are ``provider='ollama'`` / ``model='translategemma:12b'``
    (translation defaults) — Phase 1 plan 01-03 / BACK-09 wired the
    persisted provider + model on every new job.

    The returned ``job_id`` is a uuid4 hex string suitable for
    ``GET /api/v1/jobs/{id}`` + WS subscription + the download
    endpoint. The helper does NOT wait for the workflow to
    complete (the BDD step body drives the workflow directly
    via the single-workflow collaborators + the per-chapter gate
    — see ``test_voice_over_generation._given_combined_*`` for
    the pattern).
    """
    payload: dict[str, Any] = {
        "job_type": "translation+voiceover",
        "epub_id": epub_id,
        "provider": provider,
        "model": model,
        "target_language": target_language,
        "voice": voice,
    }
    if source_language is not None:
        payload["source_language"] = source_language
    resp = client.post("/api/v1/jobs", json=payload)
    assert resp.status_code == 202, resp.text
    return resp.json()["id"]


async def wait_for_voiceover_audio_file(
    job_repo: Any,
    job_id: str,
    *,
    timeout: float = 5.0,
) -> dict[str, Any]:
    """Wait for the voiceover workflow to write the first ``audio_files`` row.

    Polls ``job_repo.list_audio_files(job_id)`` every 100ms until at
    least one row is present (or ``timeout`` elapses). Returns the
    first row (the per-chapter WAV metadata) so the F4 BDD scenario
    ``Then`` step can assert the file path / format. Raises
    ``AssertionError`` on timeout so the failure mode is loud.

    The polling loop uses ``asyncio.sleep`` so the async event loop
    is not blocked; the F4 step bodies call this from
    ``_run_async`` (the same pattern as the other BDD async
    step bodies).
    """
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        rows = await job_repo.list_audio_files(job_id)
        if rows:
            return rows[0]
        await asyncio.sleep(0.1)
    raise AssertionError(f"No audio_files row for job {job_id!r} within {timeout}s")
