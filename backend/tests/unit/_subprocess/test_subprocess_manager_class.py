"""MockServiceSubprocessManager — test-only fixture (plan 01-01, WR-05).

Phase 1 plan 04: the two separate ``mock-translator`` + ``mock-tts``
subprocesses are replaced by a single ``mock-llm-service``
subprocess bound to ``127.0.0.1:8765``. The in-process
``MockTranslationAdapter`` + ``MockTTSAdapter`` remain the sprint
default (the subprocess is only spawned when the user wires a real
provider via plan 01-04).

The class used to live in
``backend/src/epubtv/adapters/subprocess/mock_service_subprocess.py``
but plan 01-01 retired the production wiring of the consolidated
subprocess (the lifespan no longer spawns it; the in-process app's
composition root constructs the per-provider HTTP adapters from
``settings.default_ollama_url`` / ``settings.default_openai_url``).
The class is unused in production; the unit tests at
``tests/unit/test_subprocess_manager.py`` are the only consumer. Per
WR-05 the file moved here as a test-only fixture.

This module owns the subprocess lifecycle only — the adapter swap is
the router's job (the manager does not import FastAPI). The class is
plain: no engine, no app dependency; the caller owns the
``asyncio.subprocess.Process`` instances and the lifetime bound to the
``MockServiceSubprocessManager`` instance.

Healthcheck seam: the consolidated service exposes ``GET /healthz``;
we poll that endpoint with a short httpx ``GET`` (0.1s per attempt)
up to 50 times = 5s budget. The default subprocess startup is <1s;
the budget is generous for cold-start CI runners.

Port collision guard: the subprocess binds ``127.0.0.1`` (loopback)
NOT ``0.0.0.0`` — the host never sees the port. Local-dev runs of
``mock-llm`` via the ``pyproject.toml`` entry point bind the
host's loopback, so devs should set ``MOCK_LLM_PORT=18765`` if
they need both the in-process app and the standalone service running
side-by-side. This is documented in the repo-root ``AGENTS.md``.

The manager is intentionally small: no signal handler, no
``asyncio.subprocess.PIPE`` (stdout / stderr are ``DEVNULL`` so a
noisy subprocess does not backpressure the event loop). The lifespan
owns the manager instance + calls ``aclose()`` on shutdown.
"""

from __future__ import annotations

import asyncio
import contextlib
import os
import sys
from dataclasses import dataclass

import httpx

# Default loopback port for the consolidated mock service. Binds
# ``127.0.0.1`` so the host never sees it — the in-process app is
# the only caller. A custom URL is plumbed through the
# ``MOCK_LLM_URL`` env var.
DEFAULT_OPENAI_PORT: int = 8765

# Per-attempt timeout for the ``/healthz`` poll. Each attempt is a
# short httpx ``GET``; 0.1s is the default httpx connect timeout.
_HEALTHZ_PER_ATTEMPT_TIMEOUT: float = 0.1

# Total healthcheck budget: 50 attempts x 0.1s = 5s. The default
# subprocess cold start is <1s; the budget is generous for slow
# CI runners.
_HEALTHZ_MAX_ATTEMPTS: int = 50

# Graceful-shutdown budget for ``proc.wait()`` after ``proc.terminate()``.
# If the subprocess does not exit within 5s, ``aclose()`` falls back to
# ``proc.kill()`` to avoid hanging the lifespan.
_TERMINATE_TIMEOUT_SECONDS: float = 5.0


@dataclass
class SubprocessHandle:
    """One subprocess + the port it binds + the URL the HTTP adapter points at.

    The dataclass is a passive record: the manager owns the
    ``aclose`` semantics; the handle is what the manager hands back to
    the router so the HTTP adapter can be constructed (e.g.
    ``HttpTranslationAdapter(base_url=handle.url)``).
    """

    process: asyncio.subprocess.Process
    port: int
    base_url: str


class MockServiceSubprocessManager:
    """Owns the ``mock-llm-service`` subprocess lifecycle (single service).

    The manager is constructed empty; ``start()`` spawns the
    subprocess on demand (driven by the user's provider wiring).
    ``aclose()`` terminates the subprocess cleanly. All methods are
    idempotent: calling ``start()`` on an already-running handle is a
    no-op; calling ``aclose()`` on a never-started or already-stopped
    handle is a no-op.
    """

    def __init__(self) -> None:
        self._openai: SubprocessHandle | None = None

    @property
    def openai(self) -> SubprocessHandle | None:
        """The live OpenAI mock subprocess handle, or ``None`` if not started."""
        return self._openai

    async def start(self, port: int = DEFAULT_OPENAI_PORT) -> SubprocessHandle:
        """Spawn ``epubtv.tools.mock_llm_service`` on ``127.0.0.1:port``.

        Idempotent: returns the existing handle if the subprocess is
        already running on the same port. Raises ``RuntimeError`` if
        the subprocess is already running on a DIFFERENT port (caller
        must ``aclose()`` first).

        The subprocess is spawned via ``asyncio.create_subprocess_exec``
        with ``stdout=DEVNULL`` + ``stderr=DEVNULL`` so the event loop
        is not back-pressured by a noisy service. The wait-for-healthz
        gate is the only sync point; once the service is reachable,
        the function returns the handle.
        """
        existing = self._openai
        if existing is not None and self._is_alive(existing.process):
            if existing.port != port:
                raise RuntimeError(
                    f"mock-llm already running on port {existing.port}; "
                    f"refusing to start on port {port}"
                )
            return existing
        # Cold start: spawn + wait for /healthz
        env = {**os.environ, "MOCK_LLM_PORT": str(port)}
        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            "-m",
            "epubtv.tools.mock_llm_service",
            env=env,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        base_url = f"http://127.0.0.1:{port}"
        handle = SubprocessHandle(process=proc, port=port, base_url=base_url)
        await _wait_healthy(f"{base_url}/healthz")
        self._openai = handle
        return handle

    async def stop(self) -> None:
        """Terminate the subprocess (idempotent)."""
        await self._stop_one()

    async def aclose(self) -> None:
        """Terminate the subprocess (called from the lifespan shutdown path)."""
        await self._stop_one()

    async def _stop_one(self) -> None:
        """Terminate the live subprocess (idempotent).

        The terminate / wait / kill flow mirrors the asyncio docs:
        - send SIGTERM via ``proc.terminate()``;
        - ``await asyncio.wait_for(proc.wait(), timeout=5.0)`` for the
          graceful exit;
        - on ``TimeoutError`` send SIGKILL via ``proc.kill()`` and
          ``await proc.wait()`` to reap the zombie.
        """
        handle = self._openai
        if handle is None:
            return
        proc = handle.process
        if proc.returncode is not None:
            # Already exited (cleanly or via signal). No-op.
            self._openai = None
            return
        try:
            proc.terminate()
            await asyncio.wait_for(proc.wait(), timeout=_TERMINATE_TIMEOUT_SECONDS)
        except (TimeoutError, ProcessLookupError):
            # Graceful exit timed out OR the process is already gone.
            # Fall back to SIGKILL and reap.
            with contextlib.suppress(ProcessLookupError):
                proc.kill()
            with contextlib.suppress(ProcessLookupError):
                await proc.wait()
        finally:
            self._openai = None

    @staticmethod
    def _is_alive(proc: asyncio.subprocess.Process) -> bool:
        """Return ``True`` if the subprocess is still running (``returncode is None``)."""
        return proc.returncode is None


async def _wait_healthy(url: str) -> None:
    """Poll ``url`` until it returns 2xx, or raise ``RuntimeError`` after the budget.

    Used by ``start()`` to gate the lifespan on the subprocess being
    reachable. The default 5s budget is generous for cold starts; a
    failure here propagates up so the lifespan ``finally`` block kills
    the partially-started subprocess and the settings POST returns
    503 with the ``settings_rebind_failed`` code.
    """
    async with httpx.AsyncClient(timeout=_HEALTHZ_PER_ATTEMPT_TIMEOUT) as client:
        for _ in range(_HEALTHZ_MAX_ATTEMPTS):
            try:
                resp = await client.get(url)
            except httpx.HTTPError:
                # Connect refused / timeout — common during cold start.
                await asyncio.sleep(_HEALTHZ_PER_ATTEMPT_TIMEOUT)
                continue
            if 200 <= resp.status_code < 300:
                return
            await asyncio.sleep(_HEALTHZ_PER_ATTEMPT_TIMEOUT)
    raise RuntimeError(f"subprocess at {url} did not become healthy within the 5s budget")


__all__ = [
    "DEFAULT_OPENAI_PORT",
    "MockServiceSubprocessManager",
    "SubprocessHandle",
]
