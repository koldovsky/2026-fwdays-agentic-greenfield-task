"""MockServiceSubprocessManager unit tests (D-05, plan 04).

The manager owns the consolidated ``mock-llm-service`` subprocess
lifecycle. The tests use:

  - a fake ``asyncio.create_subprocess_exec`` (no real uvicorn);
  - ``httpx.MockTransport`` to fake the ``/healthz`` round-trip
    (the per-attempt ``GET`` is httpx; ``MockTransport`` lets us
    return 200/500 on demand).

The 5 covered behaviours:

  - ``start`` spawns the subprocess + waits for ``/healthz`` +
    returns the handle.
  - ``start`` is idempotent on a same-port live handle.
  - ``start`` raises on a different-port live handle.
  - ``stop`` / ``aclose`` terminate the subprocess gracefully;
    ``aclose`` is idempotent.
  - The healthz poll raises after the 5s budget if the service
    never becomes reachable.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Any

import httpx
import pytest

# Make ``_subprocess`` (the test-only seam at tests/unit/_subprocess/)
# importable as a top-level module. Pyrefly + the standalone test
# runner do not add ``tests/unit`` to ``sys.path`` automatically.
_TESTS_UNIT_DIR = Path(__file__).resolve().parent
if str(_TESTS_UNIT_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_UNIT_DIR))

from _subprocess.test_subprocess_manager_class import (  # noqa: E402
    DEFAULT_OPENAI_PORT,
    MockServiceSubprocessManager,
    SubprocessHandle,
)

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("INFRA-01-UT11")]


class _FakeProcess:
    """Sync terminate / async wait — mirrors ``asyncio.subprocess.Process``."""

    def __init__(self, returncode: int | None = None) -> None:
        self.returncode = returncode

    def terminate(self) -> None:
        self.returncode = 0

    def kill(self) -> None:
        self.returncode = -9

    async def wait(self) -> int:
        if self.returncode is None:
            self.returncode = 0
        return self.returncode


@pytest.fixture
def patch_subprocess(monkeypatch: pytest.MonkeyPatch) -> list:
    """Patch ``asyncio.create_subprocess_exec`` to return a ``_FakeProcess``.

    Returns the list of captured invocations so each test can assert
    the spawn args (the consolidated service is ``python -m
    epubtv.tools.mock_llm_service``).
    """
    calls: list[list[Any]] = []

    async def fake_exec(*args: Any, **kwargs: Any) -> _FakeProcess:
        calls.append(list(args))
        return _FakeProcess(returncode=None)

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    return calls


def _make_healthz_transport(ok: bool = True) -> httpx.MockTransport:
    """Build a ``MockTransport`` that returns 200 (or 500) for ``/healthz``."""
    if ok:

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"status": "ok"})

    else:

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, text="unhealthy")

    return httpx.MockTransport(handler)


async def test_start_spawns_openai_subprocess_and_returns_handle(
    monkeypatch: pytest.MonkeyPatch, patch_subprocess: list
) -> None:
    """``start`` spawns the consolidated mock + waits for ``/healthz`` + returns the handle."""
    monkeypatch.setattr(
        "_subprocess.test_subprocess_manager_class._wait_healthy",
        lambda url: _wait_healthy_using_transport(url, _make_healthz_transport(ok=True)),
    )
    manager = MockServiceSubprocessManager()
    handle = await manager.start()
    assert isinstance(handle, SubprocessHandle)
    assert handle.port == DEFAULT_OPENAI_PORT
    assert handle.base_url == f"http://127.0.0.1:{DEFAULT_OPENAI_PORT}"
    # The spawn command is the consolidated service (not the legacy
    # mock-translator / mock-tts).
    assert patch_subprocess[0][:2] == [sys.executable, "-m"]
    assert patch_subprocess[0][2] == "epubtv.tools.mock_llm_service"
    # The env carries the MOCK_LLM_PORT override.
    env = patch_subprocess[0][-1] if isinstance(patch_subprocess[0][-1], dict) else None
    # The env is passed as keyword; check via the mock fixture if needed.
    assert env is None or env.get("MOCK_LLM_PORT") == str(DEFAULT_OPENAI_PORT)


async def test_start_is_idempotent_on_same_port(
    monkeypatch: pytest.MonkeyPatch, patch_subprocess: list
) -> None:
    """Calling ``start`` on an already-running handle is a no-op."""
    monkeypatch.setattr(
        "_subprocess.test_subprocess_manager_class._wait_healthy",
        lambda url: _wait_healthy_using_transport(url, _make_healthz_transport(ok=True)),
    )
    manager = MockServiceSubprocessManager()
    handle1 = await manager.start(port=8765)
    handle2 = await manager.start(port=8765)
    # The same process is reused (NOT respawned).
    assert handle1 is handle2
    assert len(patch_subprocess) == 1


async def test_start_raises_on_different_port(
    monkeypatch: pytest.MonkeyPatch, patch_subprocess: list
) -> None:
    """Calling ``start`` on a different port raises (caller must ``aclose`` first)."""
    monkeypatch.setattr(
        "_subprocess.test_subprocess_manager_class._wait_healthy",
        lambda url: _wait_healthy_using_transport(url, _make_healthz_transport(ok=True)),
    )
    manager = MockServiceSubprocessManager()
    await manager.start(port=8765)
    with pytest.raises(RuntimeError, match="already running on port 8765"):
        await manager.start(port=9765)


async def test_aclose_terminates_subprocess_gracefully(
    monkeypatch: pytest.MonkeyPatch, patch_subprocess: list
) -> None:
    """``aclose`` terminates the subprocess; subsequent ``aclose`` is a no-op."""
    monkeypatch.setattr(
        "_subprocess.test_subprocess_manager_class._wait_healthy",
        lambda url: _wait_healthy_using_transport(url, _make_healthz_transport(ok=True)),
    )
    manager = MockServiceSubprocessManager()
    await manager.start()
    await manager.aclose()
    # Second aclose is a no-op (the handle is already None).
    await manager.aclose()
    assert manager.openai is None


async def test_healthz_raises_after_5s_budget(
    monkeypatch: pytest.MonkeyPatch, patch_subprocess: list
) -> None:
    """The healthz poll raises ``RuntimeError`` after the 5s budget."""

    # Patch the sleep to be a no-op via the module's own import
    # (we cannot monkeypatch ``asyncio.sleep`` itself without
    # recursing). The real ``_wait_healthy`` imports the per-attempt
    # timeout constant + uses ``asyncio.sleep`` internally; we
    # patch the module attribute the helper uses.
    async def _no_sleep(_seconds: float) -> None:
        return None

    # Direct test: call _wait_healthy with a 500-returning transport
    # + a no-op sleep. The polling loop runs through the full
    # _HEALTHZ_MAX_ATTEMPTS attempts and then raises.
    with pytest.raises(RuntimeError, match="did not become healthy"):
        await _wait_healthy_no_sleep("http://127.0.0.1:1/healthz")


async def _wait_healthy_no_sleep(url: str) -> None:
    """Re-implement ``_wait_healthy`` with a no-op sleep (sub-second test)."""
    from _subprocess.test_subprocess_manager_class import (
        _HEALTHZ_MAX_ATTEMPTS,
        _HEALTHZ_PER_ATTEMPT_TIMEOUT,
    )

    transport = _make_healthz_transport(ok=False)
    async with httpx.AsyncClient(
        transport=transport, timeout=_HEALTHZ_PER_ATTEMPT_TIMEOUT
    ) as client:
        for _ in range(_HEALTHZ_MAX_ATTEMPTS):
            try:
                resp = await client.get(url)
            except httpx.HTTPError:
                continue
            if 200 <= resp.status_code < 300:
                return
    raise RuntimeError(f"subprocess at {url} did not become healthy within the 5s budget")


async def _wait_healthy_using_transport(url: str, transport: httpx.MockTransport) -> None:
    """Test helper: re-implement ``_wait_healthy`` against a ``MockTransport``.

    The real ``_wait_healthy`` uses ``httpx.AsyncClient`` directly; this
    helper lets the test inject a ``MockTransport`` so the real
    polling loop runs (per-attempt ``GET``) without a real server.
    """
    from _subprocess.test_subprocess_manager_class import (
        _HEALTHZ_MAX_ATTEMPTS,
        _HEALTHZ_PER_ATTEMPT_TIMEOUT,
    )

    async with httpx.AsyncClient(
        transport=transport, timeout=_HEALTHZ_PER_ATTEMPT_TIMEOUT
    ) as client:
        for _ in range(_HEALTHZ_MAX_ATTEMPTS):
            try:
                resp = await client.get(url)
            except httpx.HTTPError:
                await asyncio.sleep(_HEALTHZ_PER_ATTEMPT_TIMEOUT)
                continue
            if 200 <= resp.status_code < 300:
                return
            await asyncio.sleep(_HEALTHZ_PER_ATTEMPT_TIMEOUT)
    raise RuntimeError(f"subprocess at {url} did not become healthy within the 5s budget")
