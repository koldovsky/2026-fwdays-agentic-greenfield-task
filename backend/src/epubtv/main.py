"""uvicorn entrypoint — ``uv run uvicorn epubtv.main:app --workers 1``.

Per RESEARCH §Single Dockerfile (Plan 03): the demo container runs exactly
this command with ``--workers 1`` mandatory (ADR-0005 + backend/AGENTS.md
§Mandatory gotchas). The lifespan composition root (in ``api/app.py``)
binds the four ports + worker supervisor to ``app.state``.

Custom log config: see ``_build_log_config()`` — adds an ``app`` formatter
+ handler so docker-compose log stream surfaces app records (timestamps +
logger name + level). uvicorn's own records keep their ``default`` formatter;
access logs keep the ``access`` formatter on stdout. Composes with spike
001's snapshot/restore in ``tools/db_migrations.py``.
"""

from __future__ import annotations

import copy
import logging

import uvicorn
from uvicorn.config import LOGGING_CONFIG as _UVICORN_LOGGING_CONFIG

from epubtv.api.app import app
from epubtv.config import settings

logger = logging.getLogger("epubtv")
logging.getLogger("aiosqlite").setLevel(logging.INFO)


def _build_log_config() -> dict:
    """Patch uvicorn's default ``LOGGING_CONFIG`` with an ``app`` handler.

    uvicorn's default config wires uvicorn's own loggers with explicit
    ``handlers: ["default"]`` + ``propagate: false``, then leaves the
    root logger with 0 handlers. Any record on a non-uvicorn-named
    logger (e.g. ``epubtv``) propagates to root and is silently dropped.
    We add a root-logger entry pointing at a new ``app`` handler that
    uses a richer ``asctime level [name] message`` formatter. uvicorn's
    own records keep their ``default`` formatter; access logs keep the
    ``access`` formatter on stdout; app records get the ``app`` formatter
    on stderr.

    See ``.planning/spikes/002-docker-uvicorn-hides-app-logs/README.md``
    (T2: smoking gun; T5: app-formatter variant).
    """
    cfg = copy.deepcopy(_UVICORN_LOGGING_CONFIG)
    cfg["formatters"] = {
        **cfg.get("formatters", {}),
        "app": {
            "format": "%(asctime)s %(levelname)s [%(name)s] %(message)s",
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        },
    }
    cfg["handlers"] = {
        **cfg.get("handlers", {}),
        "app": {
            "formatter": "app",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stderr",
        },
    }
    cfg["loggers"] = {
        **cfg.get("loggers", {}),
        "": {"handlers": ["app"], "level": settings.resolve_log_level()},
    }
    return cfg


def run() -> None:
    """Boot uvicorn on ``#EPUBTV_HOST:$EPUBTV_PORT`` (default 127.0.0.1:8765).

    The 127.0.0.1 bind is the SECURITY DEFAULT for local dev (loopback only).
    """
    logger.info("starting epubtv app")

    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level=settings.resolve_log_level(),
        access_log=True,
        log_config=_build_log_config(),
    )


if __name__ == "__main__":
    run()


__all__: list[str] = ["app", "run"]
