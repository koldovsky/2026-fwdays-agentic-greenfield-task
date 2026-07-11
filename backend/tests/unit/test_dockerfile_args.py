"""DOCKER-02 — Dockerfile ARG defaults (Phase 1 plan 05).

The repo-root `Dockerfile` defaults for `DEFAULT_OLLAMA_URL` +
`DEFAULT_OPENAI_URL` (the buildtime ARG constants the runtime
container sees as `ENV DEFAULT_OLLAMA_URL` + `ENV DEFAULT_OPENAI_URL`
+ the SPA consumes as `NEXT_PUBLIC_DEFAULT_OLLAMA_URL` +
`NEXT_PUBLIC_DEFAULT_OPENAI_URL` via Next.js's static-export
`process.env.NEXT_PUBLIC_*` inlining) point at the in-network
`http://mock-llm:8765/` (Ollama, no `/v1` — Ollama's native
endpoints are at `/api/generate` + `/api/tags`) and
`http://mock-llm:8765/v1` (OpenAI-compatible, `/v1` prefix
because the OpenAI wire shape mounts chat + speech + models
under `/v1/...`).

The `mock-llm` compose service binds 8765 inside the container
(per plan 01-05 Task 1); the in-network DNS name `mock-llm`
resolves to the `mock-llm` service's IP.

tcid: DOCKER-02-UT30
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

# Repo-root Dockerfile — resolved relative to this test file
# (backend/tests/unit/test_dockerfile_args.py → 3 parents up).
REPO_ROOT = Path(__file__).parent.parent.parent.parent
DOCKERFILE_PATH = REPO_ROOT / "Dockerfile"


@pytest.fixture(scope="module")
def dockerfile_text() -> str:
    """Read the repo-root Dockerfile as text.

    The whole module shares the file contents (one I/O read per
    test run; the file is small and stable).
    """
    assert DOCKERFILE_PATH.is_file(), f"Dockerfile not found at {DOCKERFILE_PATH}"
    return DOCKERFILE_PATH.read_text(encoding="utf-8")


def _assert_arg_value(
    dockerfile_text: str,
    arg_name: str,
    expected_value: str,
) -> None:
    """Assert `ARG <arg_name>=<expected_value>` is present in the Dockerfile.

    The regex matches the FIRST occurrence of `ARG <name>=<value>` at
    line start (Dockerfile ARG declarations are at the start of a
    line). The expected value must match the whole RHS up to the
    next whitespace / newline.
    """
    pattern = rf"^ARG {re.escape(arg_name)}={re.escape(expected_value)}\s*$"
    assert re.search(pattern, dockerfile_text, re.MULTILINE), (
        f"Dockerfile does not contain `ARG {arg_name}={expected_value}` line; "
        f"check the buildtime-constants block at the top of the file."
    )


def test_dockerfile_default_ollama_url_arg(dockerfile_text: str) -> None:
    """`ARG DEFAULT_OLLAMA_URL=http://mock-llm:8765/` is present (Ollama native, no `/v1`)."""
    _assert_arg_value(
        dockerfile_text,
        "DEFAULT_OLLAMA_URL",
        "http://mock-llm:8765/",
    )


def test_dockerfile_default_openai_url_arg(dockerfile_text: str) -> None:
    """`ARG DEFAULT_OPENAI_URL=http://mock-llm:8765/v1` is present (OpenAI-compatible, with `/v1`)."""
    _assert_arg_value(
        dockerfile_text,
        "DEFAULT_OPENAI_URL",
        "http://mock-llm:8765/v1",
    )


def test_dockerfile_next_public_ollama_url_arg(dockerfile_text: str) -> None:
    """`ARG NEXT_PUBLIC_DEFAULT_OLLAMA_URL=http://mock-llm:8765/` is present (Ollama native, no `/v1`).

    The SPA's static-export build inlines `NEXT_PUBLIC_*` at build time per
    the static-export configuration. Ollama's SPA-rendered Base URL field
    must use the bare-service-root shape (Ollama's native endpoints are
    at `/api/generate` + `/api/tags`).
    """
    _assert_arg_value(
        dockerfile_text,
        "NEXT_PUBLIC_DEFAULT_OLLAMA_URL",
        "http://mock-llm:8765/",
    )


def test_dockerfile_next_public_openai_url_arg(dockerfile_text: str) -> None:
    """`ARG NEXT_PUBLIC_DEFAULT_OPENAI_URL=http://mock-llm:8765/v1` is present."""
    _assert_arg_value(
        dockerfile_text,
        "NEXT_PUBLIC_DEFAULT_OPENAI_URL",
        "http://mock-llm:8765/v1",
    )


def test_dockerfile_no_legacy_default_urls(dockerfile_text: str) -> None:
    """The old defaults (`http://localhost:11434/v1` + `https://api.openai.com/v1`) are gone from all ARG lines.

    Cross-checks that the buildtime-constants block does not
    regress to the v1.1 defaults. The legacy defaults could
    re-appear in a 2-line `ARG` re-declaration block after a
    `FROM` if the developer copies the Stage 1 block without
    updating; this test catches that.

    The Dockerfile declares the 4 ARG constants once at the top,
    then re-declares 2 of them (`DEFAULT_OLLAMA_URL` +
    `DEFAULT_OPENAI_URL`) after the Stage 2 `FROM` line so the
    runtime stage can re-export them as `ENV`. The re-declared
    lines are also matched by the regex; the assertion checks
    that all matched ARG lines point at the in-network default.
    """
    arg_section_pattern = re.compile(
        r"^(ARG (?:DEFAULT_OLLAMA_URL|DEFAULT_OPENAI_URL|"
        r"NEXT_PUBLIC_DEFAULT_OLLAMA_URL|NEXT_PUBLIC_DEFAULT_OPENAI_URL)=[^\n]+)$",
        re.MULTILINE,
    )
    arg_lines = arg_section_pattern.findall(dockerfile_text)
    # 4 global ARGs (top of file) + 2 Stage-2 re-declarations
    # (DEFAULT_OLLAMA_URL + DEFAULT_OPENAI_URL after the second
    # `FROM`) = 6 total. The Stage-2 re-declarations are required
    # for the runtime stage to see the values (Dockerfile ARGs
    # go out of scope after `FROM`).
    assert len(arg_lines) >= 4, (
        f"expected at least 4 ARG lines (one per global constant), got {len(arg_lines)}: {arg_lines}"
    )
    for line in arg_lines:
        assert "localhost:11434" not in line, (
            f"legacy default localhost:11434 still present in ARG line: {line}"
        )
        assert "api.openai.com" not in line, (
            f"legacy default api.openai.com/v1 still present in ARG line: {line}"
        )
        # Ollama points at the bare service root (Ollama native
        # endpoints are at /api/generate + /api/tags); OpenAI points
        # at the /v1 prefix (OpenAI-compatible wire shape). Both
        # shapes resolve to the same in-network `mock-llm` service.
        assert "http://mock-llm:8765" in line, (
            f"ARG line does not point at in-network mock-llm URL: {line}"
        )
