"""Regression: the repo-root ``Dockerfile`` must wire the Phase 1 plan 05
buildtime constants + NLTK bake (D-06).

The Dockerfile declares:
- ``ARG DEFAULT_OLLAMA_URL`` + ``ARG DEFAULT_OPENAI_URL`` (the
  buildtime default provider base URLs)
- ``ARG NEXT_PUBLIC_DEFAULT_OLLAMA_URL`` +
  ``ARG NEXT_PUBLIC_DEFAULT_OPENAI_URL`` (the same values exposed to
  the frontend static export at build time)
- A ``RUN python -m epubtv.tools.bake_nltk`` step that bakes the NLTK
  ``punkt_tab`` data into the image (D-01 + Open Q 10 —
  the SentenceChunker no longer triggers a network download on the
  first chunk)

These tests assert the Dockerfile *source* is correct so a future
maintainer removing the line fails the test. The runtime assertion is
``docker build -t epubtv .`` + the runtime checks in
``test_nltk_health.py`` (the health endpoint reports the baked state).
The 4 tests cover the 2 ARGs + the bake invocation + the
``NEXT_PUBLIC_*`` env-var exposure (Stage 1).
"""

from __future__ import annotations

import pathlib
import re

_DOCKERFILE = pathlib.Path(__file__).parent.parent.parent.parent / "Dockerfile"


def test_root_dockerfile_declares_default_ollama_url_arg() -> None:
    """The Dockerfile must declare ``ARG DEFAULT_OLLAMA_URL`` (D-06)."""
    content = _DOCKERFILE.read_text()
    # The ARG declaration has a default value (the mock-friendly
    # URL) — the regex matches ``ARG DEFAULT_OLLAMA_URL=http://...``.
    assert re.search(r"^ARG\s+DEFAULT_OLLAMA_URL=\S+", content, re.MULTILINE), (
        "Repo-root Dockerfile must declare ARG DEFAULT_OLLAMA_URL (D-06)"
    )


def test_root_dockerfile_declares_default_openai_url_arg() -> None:
    """The Dockerfile must declare ``ARG DEFAULT_OPENAI_URL`` (D-06)."""
    content = _DOCKERFILE.read_text()
    assert re.search(r"^ARG\s+DEFAULT_OPENAI_URL=\S+", content, re.MULTILINE), (
        "Repo-root Dockerfile must declare ARG DEFAULT_OPENAI_URL (D-06)"
    )


def test_root_dockerfile_bakes_nltk_punkt_tab() -> None:
    """The Dockerfile must invoke ``epubtv.tools.bake_nltk`` (D-06)."""
    content = _DOCKERFILE.read_text()
    # Match ``python -m epubtv.tools.bake_nltk`` (with optional `uv run`
    # prefix — the Dockerfile uses ``uv run python -m ...``).
    assert "epubtv.tools.bake_nltk" in content, (
        "Repo-root Dockerfile must invoke python -m epubtv.tools.bake_nltk "
        "to bake the NLTK punkt_tab data into the image (D-06)"
    )
    # The invocation must be in a RUN step (not a comment). Find
    # the RUN line + its continuations (Dockerfile continuations are
    # lines that start with whitespace and ``\``; the bake invocation
    # lives on a continuation line of a multi-line RUN).
    in_run_block = False
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("RUN") or stripped.startswith("ENV"):
            in_run_block = True
        elif stripped.startswith("#") or not stripped:
            in_run_block = False
        elif in_run_block and "epubtv.tools.bake_nltk" in line:
            return
        # A non-continuation line ends the RUN block.
        elif in_run_block and not line.startswith(" ") and not line.startswith("\t"):
            in_run_block = False
    raise AssertionError("epubtv.tools.bake_nltk must be invoked in a RUN step (not a comment)")


def test_root_dockerfile_exposes_next_public_defaults() -> None:
    """The Dockerfile must expose the same values as ``NEXT_PUBLIC_*`` env vars (D-06).

    The SPA's ``lib/buildtimeDefaults.ts`` reads
    ``process.env.NEXT_PUBLIC_DEFAULT_OLLAMA_URL`` +
    ``process.env.NEXT_PUBLIC_DEFAULT_OPENAI_URL`` at static-export
    build time. The Dockerfile declares these as ARGs in Stage 1
    (the frontend-build stage) so the values land in the
    production image.
    """
    content = _DOCKERFILE.read_text()
    # Both NEXT_PUBLIC_* ARG declarations must be present (the
    # frontend-build stage passes them to `yarn build` via the
    # static-export env-var inlining).
    assert "NEXT_PUBLIC_DEFAULT_OLLAMA_URL" in content, (
        "Repo-root Dockerfile must expose NEXT_PUBLIC_DEFAULT_OLLAMA_URL "
        "to the frontend static-export build (D-06)"
    )
    assert "NEXT_PUBLIC_DEFAULT_OPENAI_URL" in content, (
        "Repo-root Dockerfile must expose NEXT_PUBLIC_DEFAULT_OPENAI_URL "
        "to the frontend static-export build (D-06)"
    )
