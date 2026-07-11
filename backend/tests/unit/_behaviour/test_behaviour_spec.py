"""BehaviourSpec — env-var reader for the in-process mock adapters (BACK-08, plan 01-02).

Test-only fixture that parses ``MOCK_TRANSLATOR_BEHAVIOUR`` +
``MOCK_TTS_BEHAVIOUR`` CSVs into ``AdapterBehaviour`` instances. The
``AdapterBehaviour`` Pydantic model itself lives in the sibling
``tests/unit/_adapters/behaviour.py`` (test-only fixture, quick
260709-9yk move from ``backend/src/epubtv/application/behaviour.py``);
the env-var parsing logic lives here because the production lifespan
no longer reads ``MOCK_*_BEHAVIOUR`` env vars — the in-process mocks
are not wired in production.

Plan 01-02 (BACK-08): the entire ``behaviour.py`` module used to live
in ``backend/src/epubtv/adapters/behaviour.py`` and was imported by the
production lifespan. The lifespan wired ``BehaviourSpec.from_env()`` at
startup and passed ``behaviour=`` to the in-process ``Mock*Adapter``
constructors. After this move, the production lifespan no longer reads
``MOCK_*_BEHAVIOUR`` env vars — the in-process mocks are not wired in
production. The ``BehaviourSpec`` reader lives here as a test-only
fixture consumed by the BDD test profiles that need to drive
failure-injection scenarios against the in-process mocks (the BDD
``setup_translation_job`` + voiceover tests construct ``AdapterBehaviour``
instances directly; the ``BehaviourSpec.from_env()`` reader is used by
the standalone ``mock-llm`` uvicorn subprocess via a thin
re-import shim — see ``mock_llm_service.py`` for the refactor).

Modes (locked set):
- ``success`` (default): happy-path.
- ``slow``: real ``asyncio.sleep`` in production (60s default;
  ``slow_mode_sleep_seconds`` overrides).
- ``fail_once_then_succeed``: first call for that ``chunk_id`` raises;
  subsequent calls succeed. The check lives in the in-process mock
  ``MockTranslationAdapter`` + ``MockTTSAdapter`` (also in tests/);
  the workflow services do not check this mode.
- ``timeout``: adapter raises ``asyncio.TimeoutError``; the workflow
  services' ``asyncio.wait_for(60)`` envelope surfaces it as
  ``provider_timeout``. The check lives in the in-process mocks.

Env vars (D-04):
- ``MOCK_TRANSLATOR_BEHAVIOUR``: CSV of ``chunk_N:mode`` tokens.
- ``MOCK_TTS_BEHAVIOUR``: same CSV format; additionally accepts a
  ``chunk_N:length=Ns`` token to override the rendered WAV duration
  in seconds (the new ``length=Ns`` token extends the grammar; the
  adapter renders uniform white noise of that length via stdlib
  ``wave`` + ``random`` — no numpy, no soundfile, no ffmpeg).

Invalid tokens (unknown mode / missing colon / non-positive length)
raise ``ValueError`` at adapter init — loud failure, not silent (Pitfall F).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Make ``_adapters`` (the test-only seam at tests/unit/_adapters/)
# importable as a top-level module. Pyrefly + the standalone test
# runner do not add ``tests/unit`` to ``sys.path`` automatically.
_TESTS_UNIT_DIR = Path(__file__).resolve().parent.parent
if str(_TESTS_UNIT_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_UNIT_DIR))

from _adapters.behaviour import VALID_MODES, AdapterBehaviour  # noqa: E402

__all__ = ["BehaviourSpec", "parse_behaviour_csv"]


def parse_behaviour_csv(
    raw: str,
    *,
    slow_mode_sleep_seconds: float = 60.0,
) -> AdapterBehaviour:
    """Parse a CSV of ``chunk_N:mode`` / ``chunk_N:length=Ns`` tokens.

    Empty / unset CSV → empty behaviour map (everything succeeds).
    Unknown mode / missing colon / non-positive length →
    ``ValueError`` (loud failure, Pitfall F).

    The ``length=Ns`` token is detected by a ``:length=`` substring
    match BEFORE the generic ``chunk_N:mode`` parser runs, so the
    existing mode-token parsing stays untouched. Test-only helper
    that lives here (NOT on ``AdapterBehaviour``) because the
    production lifespan never reads the ``MOCK_*_BEHAVIOUR`` env
    vars; the in-process mocks are not wired in production.
    """
    if not raw:
        return AdapterBehaviour(slow_mode_sleep_seconds=slow_mode_sleep_seconds)

    result: dict[str, str] = {}
    result_length: dict[str, float] = {}
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        # ``chunk_N:length=Ns`` token detected BEFORE the generic
        # mode-token branch. The ``:length=`` discriminator prevents
        # the generic ``if ":" not in token`` branch from mis-routing
        # the length form to the mode parser.
        if ":length=" in token:
            chunk_id, _, value = token.partition(":length=")
            chunk_id, value = chunk_id.strip(), value.strip()
            if not chunk_id:
                raise ValueError(f"Invalid length token {token!r}: empty chunk_id")
            try:
                length = float(value)
            except ValueError as e:
                raise ValueError(
                    f"Invalid length token {token!r}: "
                    f"expected positive float seconds, got {value!r}"
                ) from e
            if length <= 0:
                raise ValueError(
                    f"Invalid length token {token!r}: must be > 0 seconds, got {length!r}"
                )
            result_length[chunk_id] = length
            continue
        if ":" not in token:
            raise ValueError(f"Invalid behaviour token {token!r}: expected 'chunk_N:mode'")
        chunk_id, mode = token.split(":", 1)
        chunk_id, mode = chunk_id.strip(), mode.strip()
        if not chunk_id:
            raise ValueError(f"Invalid behaviour token {token!r}: empty chunk_id")
        if mode not in VALID_MODES:
            raise ValueError(f"Invalid mode {mode!r}; expected one of {sorted(VALID_MODES)}")
        result[chunk_id] = mode
    return AdapterBehaviour(
        behaviour=result,
        length_seconds=result_length,
        slow_mode_sleep_seconds=slow_mode_sleep_seconds,
    )


class BehaviourSpec:
    """Top-level behaviour spec for the in-process mock adapters.

    Wraps two ``AdapterBehaviour`` instances — one for translation, one
    for TTS — built from the ``MOCK_TRANSLATOR_BEHAVIOUR`` +
    ``MOCK_TTS_BEHAVIOUR`` env vars. The reader is test-only; the
    production lifespan no longer constructs ``BehaviourSpec`` instances
    (the in-process mocks are not wired in production).
    """

    def __init__(
        self,
        *,
        translation: AdapterBehaviour | None = None,
        tts: AdapterBehaviour | None = None,
        slow_mode_sleep_seconds: float = 60.0,
    ) -> None:
        self.translation = translation or AdapterBehaviour(
            slow_mode_sleep_seconds=slow_mode_sleep_seconds
        )
        self.tts = tts or AdapterBehaviour(slow_mode_sleep_seconds=slow_mode_sleep_seconds)
        self.slow_mode_sleep_seconds = slow_mode_sleep_seconds

    @classmethod
    def from_env(cls) -> BehaviourSpec:
        """Read ``MOCK_TRANSLATOR_BEHAVIOUR`` + ``MOCK_TTS_BEHAVIOUR`` from env.

        Also reads ``MOCK_SLOW_MODE_SLEEP_SECONDS`` (optional, float) so
        the slow-mode duration is overridable for slow-but-not-60s
        scenarios.
        """
        slow = 60.0
        slow_raw = os.environ.get("MOCK_SLOW_MODE_SLEEP_SECONDS", "").strip()
        if slow_raw:
            try:
                slow = float(slow_raw)
            except ValueError as e:
                raise ValueError(
                    f"MOCK_SLOW_MODE_SLEEP_SECONDS must be a float, got {slow_raw!r}"
                ) from e
        return cls(
            translation=parse_behaviour_csv(
                os.environ.get("MOCK_TRANSLATOR_BEHAVIOUR", "").strip(),
                slow_mode_sleep_seconds=slow,
            ),
            tts=parse_behaviour_csv(
                os.environ.get("MOCK_TTS_BEHAVIOUR", "").strip(),
                slow_mode_sleep_seconds=slow,
            ),
            slow_mode_sleep_seconds=slow,
        )
