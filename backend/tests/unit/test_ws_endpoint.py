"""WS endpoint unit tests (TDD Task 2 RED — plan 02-03).

Covers the F5-AC5 6-field envelope forwarded over ``WS
/api/v1/jobs/{id}/events`` (D-03 + D-09), the 1008 close on unknown id
(Pitfall 3), the no-replay contract (Phase 1 ``JobProgressBus``), and
the disconnect → unsubscribe invariant (no queue leak).

The WS is driven via FastAPI's ``TestClient.websocket_connect`` (sync
flavour) which is a single thread per WS handshake + the ASGI
``run_until_first_complete`` semantics. We use the existing ``app`` +
``db_path`` fixtures + a per-test ``app`` constructed via ``create_app()``
so the lifespan can run cleanly.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("JOBS-03-UT19")]


async def _create_known_job_id(app: Any) -> str:
    """Create a known job via the API; return its id."""
    from fastapi.testclient import TestClient

    fixtures = Path(__file__).resolve().parents[1] / "fixtures" / "epubs"
    payload = (fixtures / "mystere-nocturne.epub").read_bytes()

    # Use the synchronous TestClient for the POST + the lifespan bind
    # (the WS test in the same function uses the async-friendly path).
    with TestClient(app) as client:
        r = client.post(
            "/api/v1/epubs",
            files={"file": ("mystere-nocturne.epub", payload, "application/epub+zip")},
        )
        assert r.status_code == 200, r.text
        epub_id = r.json()["epub_id"]
        r2 = client.post(
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
        assert r2.status_code == 202
        return str(r2.json()["id"])


async def test_ws_unknown_id_closes_1008(app: Any, db_path: Any) -> None:
    """``WS /api/v1/jobs/{unknown_id}/events`` closes with code 1008 (Pitfall 3)."""
    from starlette.websockets import WebSocketDisconnect

    with (
        TestClient(app) as client,
        pytest.raises(WebSocketDisconnect) as exc_info,
        client.websocket_connect("/api/v1/jobs/unknown-id/events") as ws,
    ):
        # Server closes immediately; receiving raises WebSocketDisconnect
        # with the server's close code (1008 = policy violation).
        ws.receive_text()
    assert exc_info.value.code == 1008


async def test_ws_known_id_receives_emitted_envelope(app: Any, db_path: Any) -> None:
    """``WS /api/v1/jobs/{id}/events`` forwards the 6-field envelope (F5-AC5)."""
    job_id = await _create_known_job_id(app)
    with TestClient(app) as client, client.websocket_connect(f"/api/v1/jobs/{job_id}/events") as ws:
        # The lifespan on TestClient has already bound the progress bus
        # to the app's loop. We emit a synthetic event via the bus.
        # Give the WS handler a moment to subscribe before emitting.
        await asyncio.sleep(0.05)
        # Emit via the bus bound on app.state.
        event = {
            "job_id": job_id,
            "job_type": "translation",
            "chunk_id": "tx_ch0_s0",
            "progress_current": 1,
            "progress_total": 100,
            "status": "running",
        }
        # pyrefly: ignore [missing-attribute]
        client.app.state.progress_bus.emit(job_id, event)
        received = ws.receive_json()
    # 6-field envelope (Pitfall 7 + F5-AC5).
    assert received == event


async def test_ws_late_subscriber_does_not_replay(app: Any, db_path: Any) -> None:
    """A late subscriber receives the NEXT event only (Phase 1 bus contract)."""
    job_id = await _create_known_job_id(app)
    with TestClient(app) as client:
        # pyrefly: ignore [missing-attribute]
        bus = client.app.state.progress_bus
        # Emit 3 events BEFORE the WS connects — late subscribers do NOT replay.
        for i in range(3):
            bus.emit(
                job_id,
                {
                    "job_id": job_id,
                    "job_type": "translation",
                    "chunk_id": f"tx_ch0_s{i}",
                    "progress_current": i + 1,
                    "progress_total": 100,
                    "status": "running",
                },
            )
        with client.websocket_connect(f"/api/v1/jobs/{job_id}/events") as ws2:
            # Emit a 4th event AFTER subscribe.
            await asyncio.sleep(0.05)
            bus.emit(
                job_id,
                {
                    "job_id": job_id,
                    "job_type": "translation",
                    "chunk_id": "tx_ch0_s3",
                    "progress_current": 4,
                    "progress_total": 100,
                    "status": "running",
                },
            )
            received = ws2.receive_json()
            assert received["chunk_id"] == "tx_ch0_s3"
            assert received["progress_current"] == 4


async def test_ws_disconnect_unsubscribes_no_queue_leak(app: Any, db_path: Any) -> None:
    """After the WS client disconnects, the bus subscriber set is empty (Pitfall 3)."""
    job_id = await _create_known_job_id(app)
    with TestClient(app) as client, client.websocket_connect(f"/api/v1/jobs/{job_id}/events"):
        await asyncio.sleep(0.05)
        # The handler has subscribed — assert the queue is present.
        # pyrefly: ignore [missing-attribute]
        bus = client.app.state.progress_bus
        assert job_id in bus._subscribers
        assert len(bus._subscribers[job_id]) == 1
    # After exiting the ``with`` block, the client has disconnected.
    # Give the server-side handler a moment to run the finally block.
    await asyncio.sleep(0.05)
    # The bus subscriber set for this job_id is empty (no queue leak).
    # pyrefly: ignore [missing-attribute]
    bus = client.app.state.progress_bus
    assert job_id not in bus._subscribers or len(bus._subscribers.get(job_id, set())) == 0
