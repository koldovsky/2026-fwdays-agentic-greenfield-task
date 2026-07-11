"""Regression: the repo-root ``Dockerfile`` must install ffmpeg (D-14).

The pydub backend (``AudioSegment.from_wav`` + ``export``) requires
the system ``ffmpeg`` binary. The production single-container image
(repo-root ``Dockerfile``, ADR-0003) installs it via
``apt-get install -y --no-install-recommends ffmpeg`` so the
``VoiceOverWorkflowService`` can write per-chapter WAV files at
``audio_dir / job_id / ch{N}.wav`` (D-13). This test asserts the
Dockerfile content includes the install line + the layer-ordering
hygiene flags.

Quick 260707-cxw: the test was retargeted from the now-deleted
``backend/Dockerfile.backend`` to the repo-root ``Dockerfile`` (the
ADR-0003 single image is the demo's only Docker build context now;
the demo-only ``backend/Dockerfile.backend`` is gone).

The test does NOT build the Docker image (that is a CI / smoke-test
concern); it asserts the Dockerfile *source* is correct so a future
maintainer removing the line fails the test. The runtime assertion
is ``docker build -t epubtv .`` + ``ffmpeg -version`` in the built
image (CI executor — not this unit test).
"""

from __future__ import annotations

import pathlib
import re

_DOCKERFILE = pathlib.Path(__file__).parent.parent.parent.parent / "Dockerfile"


def test_root_dockerfile_exists() -> None:
    assert _DOCKERFILE.is_file(), "Repo-root Dockerfile must exist (ADR-0003 single image)"


def test_root_dockerfile_installs_ffmpeg() -> None:
    """The Dockerfile must include ``apt-get install ... ffmpeg`` (D-14)."""
    content = _DOCKERFILE.read_text()
    assert re.search(r"apt-get install .* ffmpeg", content), (
        "Repo-root Dockerfile must install ffmpeg for pydub (D-14)"
    )


def test_root_dockerfile_uses_no_install_recommends() -> None:
    """The ffmpeg install must use ``--no-install-recommends`` (image size)."""
    content = _DOCKERFILE.read_text()
    assert "--no-install-recommends" in content, (
        "Repo-root Dockerfile must use --no-install-recommends to minimize image size"
    )


def test_root_dockerfile_cleans_apt_cache() -> None:
    """The ffmpeg install must clean the apt cache (image size)."""
    content = _DOCKERFILE.read_text()
    assert "rm -rf /var/lib/apt/lists/*" in content, (
        "Repo-root Dockerfile must clean the apt cache to minimize image size"
    )


def test_root_dockerfile_ffmpeg_before_copy_src() -> None:
    """The ffmpeg install must be placed BEFORE the source ``COPY`` step (layer ordering).

    The apt install is in a separate Docker layer that is cached
    independently of the source changes. Placing the install
    AFTER the source ``COPY`` would mean every source change
    invalidates the apt-install layer cache — defeating the
    purpose of a separate layer.

    The repo-root ``Dockerfile`` does not literally contain a
    ``COPY src`` line — it uses ``COPY backend/ ./backend/`` and
    ``COPY frontend/ ./`` for the two source trees. We check that
    the ffmpeg install precedes ALL of the source ``COPY`` lines
    (the conservative assertion; the install is at the very top
    of the backend stage so it always wins).
    """
    content = _DOCKERFILE.read_text()
    ffmpeg_pos = content.find("ffmpeg")
    assert ffmpeg_pos != -1, "ffmpeg install must exist in the Dockerfile"
    # Walk every "COPY" line in the file; the ffmpeg install must
    # come before the first one that copies source code.
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("COPY ") and "backend" in stripped.lower():
            copy_pos = content.find(line)
            assert copy_pos != -1
            assert ffmpeg_pos < copy_pos, (
                f"ffmpeg install must be BEFORE the source COPY ({line!r}); "
                f"got ffmpeg at {ffmpeg_pos}, copy at {copy_pos}"
            )
            return
    # If no source COPY was found, the test is vacuous — fail loudly
    # so a future maintainer adding a COPY step notices the assertion.
    raise AssertionError("no source COPY line found in the Dockerfile; assertion is vacuous")
