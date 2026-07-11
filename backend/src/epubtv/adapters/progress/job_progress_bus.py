"""JobProgressBus — in-process pub/sub keyed by ``job_id`` (Pattern 5).

Phase 1 ships the bus as a no-op-capable seam — no events are emitted yet
because there is no jobs endpoint. Phase 2 wires:

1. ``emit()`` calls inside ``TranslationWorkflowService`` /
   ``VoiceOverWorkflowService`` after each chunk completes.
2. A ``WS /api/v1/jobs/{id}/progress`` endpoint subscribing a fresh
   ``asyncio.Queue`` and forwarding events to the client.

Cross-thread bridge (Pitfall 3 — locked in Phase 1):
- The worker Task shares FastAPI's event loop in the sprint, so
  ``emit()`` calls happen on the same loop. BUT if Phase 2 ever offloads
  blocking provider calls to ``run_in_executor``, ``emit()`` will be
  invoked from a different thread. The ``call_soon_threadsafe`` bridge
  below handles both cases uniformly.
- ``attach_loop(loop)`` is called from ``api/app.py`` lifespan startup so
  the bus knows the FastAPI loop to bridge onto.

Late subscribers do NOT replay history (BDD requires the NEXT event after
subscription, not prior events — RESEARCH Pattern 5).
"""

from __future__ import annotations

import asyncio
from typing import Any


class JobProgressBus:
    """In-process pub/sub keyed by ``job_id``. No replay of history."""

    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[Any]]] = {}
        self._loop: asyncio.AbstractEventLoop | None = None

    def attach_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Capture the FastAPI event loop for cross-thread ``call_soon_threadsafe``."""
        self._loop = loop

    def subscribe(self, job_id: str) -> asyncio.Queue[Any]:
        """Return a fresh ``asyncio.Queue`` subscribed to ``job_id``'s events."""
        q: asyncio.Queue[Any] = asyncio.Queue()
        self._subscribers.setdefault(job_id, set()).add(q)
        return q

    def unsubscribe(self, job_id: str, q: asyncio.Queue[Any]) -> None:
        """Drop a queue from a job's subscriber set; clean the dict entry if empty."""
        if job_id in self._subscribers:
            self._subscribers[job_id].discard(q)
            if not self._subscribers[job_id]:
                del self._subscribers[job_id]

    def emit(self, job_id: str, event: dict[str, Any]) -> None:
        """Push ``event`` to every subscriber queue for ``job_id``.

        Thread-safe: if ``emit()`` is called from a non-event-loop thread,
        schedule the ``put_nowait`` onto the FastAPI loop via
        ``loop.call_soon_threadsafe`` (Pitfall 3 cross-thread bridge).
        """
        for q in self._subscribers.get(job_id, set()):
            if self._loop is not None and self._loop is not asyncio.get_running_loop():
                self._loop.call_soon_threadsafe(q.put_nowait, event)
            else:
                # Same loop or no loop attached yet — direct put_nowait is safe.
                q.put_nowait(event)
