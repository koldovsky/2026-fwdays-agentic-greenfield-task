"""AdapterBehaviour — per-chunk behaviour gate (RESEARCH Pattern 4, D-04).

Lightweight Pydantic model consumed by the in-process ``MockTranslationAdapter``
+ ``MockTTSAdapter`` test fixtures (also in ``tests/unit/_adapters/``) for
all four behaviour modes (``success`` / ``slow`` / ``fail_once_then_succeed``
/ ``timeout``). Quick 260709-9yk moved this model from
``backend/src/epubtv/application/behaviour.py`` to this test-only path
because the production workflow services no longer consume a behaviour
gate — the slow-mode sleep retired with the in-process mocks' move to
``tests/``. The production lifespan does not import this module; the
``BehaviourSpec`` env-var reader lives in
``backend/tests/unit/_behaviour/test_behaviour_spec.py`` (test-only
fixture, parses ``MOCK_TRANSLATOR_BEHAVIOUR`` + ``MOCK_TTS_BEHAVIOUR``
CSVs into ``AdapterBehaviour`` instances for the mock adapters).

Test-only fixture, NOT used by production. Import via
``from _adapters.behaviour import AdapterBehaviour`` (sibling module
in the same ``_adapters`` package) or
``from tests.unit._adapters.behaviour import AdapterBehaviour``
(absolute path inside the tests/ package, depending on the caller's
sys.path shape). Pytest adds ``tests/unit`` to ``sys.path`` at
collection time, so the relative-style ``_adapters.behaviour`` path
resolves from any test file in the tree.

The model is intentionally small + dependency-free (no Pydantic Settings,
no env-var reading) — it is a pure data class. The BDD test profiles
construct ``AdapterBehaviour(behaviour={"chunk_1": "timeout"})`` to drive
failure-injection scenarios in end-to-end tests.

Modes (locked set):
- ``success`` (default): happy-path.
- ``slow``: real ``asyncio.sleep`` in production (60s default;
  ``slow_mode_sleep_seconds`` overrides). The ``virtual_clock`` pytest
  fixture short-circuits the sleep in tests so they do NOT actually
  sleep.
- ``fail_once_then_succeed``: first call for that ``chunk_id`` raises;
  subsequent calls succeed. The check lives in the in-process
  ``MockTranslationAdapter`` + ``MockTTSAdapter``.
- ``timeout``: adapter raises ``asyncio.TimeoutError``; the workflow
  services' ``asyncio.wait_for(60)`` envelope surfaces it as
  ``provider_timeout``. The check lives in the in-process mocks.

Invalid tokens (unknown mode / missing colon / non-positive length)
raise ``ValueError`` at adapter init — loud failure, not silent
(Pitfall F).

The model is a Pydantic v2 BaseModel with
``model_config = ConfigDict(extra="forbid")``.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

# Locked mode set. Phase 2/3/4 do not add modes without updating this
# set + the (now test-only) mock adapter implementations.
VALID_MODES: frozenset[str] = frozenset({"success", "slow", "fail_once_then_succeed", "timeout"})


class AdapterBehaviour(BaseModel):
    """Per-chunk behaviour gate for a single workflow.

    Keys are ``chunk_id`` (e.g. ``"chunk_3"``); values are mode strings
    from ``VALID_MODES``. Missing keys default to ``"success"``.

    The ``length_seconds`` map is a sibling seam populated by the
    ``chunk_N:length=Ns`` token (the in-process ``MockTTSAdapter``
    uses it to render white noise of the configured duration; the
    production ``OpenAIHttpTTSAdapter`` ignores the field — the
    length seam is a test-only contract).
    """

    model_config = ConfigDict(extra="forbid")

    behaviour: dict[str, str] = Field(default_factory=dict)
    length_seconds: dict[str, float] = Field(default_factory=dict)
    slow_mode_sleep_seconds: float = 60.0

    def resolve(self, chunk_id: str) -> str:
        """Return the mode for ``chunk_id`` or ``"success"`` if unmapped.

        The workflow services use this to gate the ``slow`` mode
        (``await asyncio.sleep(slow_mode_sleep_seconds)``); the
        ``fail_once_then_succeed`` + ``timeout`` modes are checked in
        the in-process mock adapters (test-only).
        """
        return self.behaviour.get(chunk_id, "success")

    def length_for(self, chunk_id: str) -> float | None:
        """Return the per-chunk override length in seconds, or ``None`` if unmapped.

        ``None`` means "fall back to the default" — for the in-process
        ``MockTTSAdapter`` this is the 1 s silent WAV (D-01 contract);
        for the production ``OpenAIHttpTTSAdapter`` this field is
        ignored (the production adapter uses the upstream TTS provider's
        default duration).
        """
        return self.length_seconds.get(chunk_id)


__all__ = ["VALID_MODES", "AdapterBehaviour"]
