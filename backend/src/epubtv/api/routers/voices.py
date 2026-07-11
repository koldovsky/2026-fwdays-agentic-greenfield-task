"""Voices router — TTS voice catalog (D-07).

OpenAI's TTS voice catalog is a fixed set; there is no per-language
provider endpoint to call. The catalog is exposed as a single flat
``{voices: [...]}`` response (no ``language`` query parameter —
per-language matching was retired when the canned provider voices
were dropped).

Endpoints (mounted at ``/api/v1`` in ``api/app.py``):

- ``GET /api/v1/voices`` — returns the full voice list
  ``{"voices": ["alloy", "ash", ...]}`` for SPA bootstrap. The SPA
  renders the full list in the voice dropdown (D-07 + D-06).

The ``VOICES`` module constant is the single source of truth for
the canonical voice set; the ``GET /voices`` route returns it as
a JSON list. Job dispatch validates ``body.voice in VOICES`` to
gate unsupported voice values (D-06 catalog check).
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()

__all__ = ["VOICES", "router"]


# Canonical OpenAI-compatible voice catalog. The list is a
# frozen tuple so it is hashable + immutable; ``list(VOICES)`` is
# the JSON-friendly form.
VOICES: tuple[str, ...] = (
    "alloy",
    "ash",
    "ballad",
    "coral",
    "echo",
    "fable",
    "onyx",
    "nova",
    "sage",
    "shimmer",
    "verse",
    "marin",
    "cedar",
)


@router.get("/voices")
async def list_voices() -> dict[str, list[str]]:
    """Return the full voice list ``{"voices": [...]}`` (D-07).

    The response is a single-key envelope: the SPA renders the
    full list in the voice dropdown (no per-language matching —
    OpenAI voices are a fixed set, not a per-language matrix).
    """
    return {"voices": list(VOICES)}
