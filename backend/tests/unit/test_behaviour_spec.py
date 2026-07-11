"""BehaviourSpec unit tests (Task 2 TDD cycle).

The ``BehaviourSpec`` env-var reader moved to ``tests/unit/_behaviour/``
as a test-only fixture (BACK-08, plan 01-02). The lightweight
``AdapterBehaviour`` Pydantic model + ``VALID_MODES`` set live in
``backend/tests/unit/_adapters/behaviour.py`` (test-only fixture, quick
260709-9yk move from ``backend/src/epubtv/application/behaviour.py``;
the production workflow services no longer consume the slow-mode
seam).

Behaviours:
- ``test_from_env_parses_token_csv`` — env var ``chunk_3:fail_once_then_succeed,chunk_7:timeout``
  → ``resolve("chunk_3") == "fail_once_then_succeed"``,
  ``resolve("chunk_7") == "timeout"``,
  ``resolve("chunk_99") == "success"`` (default).
- ``test_invalid_mode_raises`` — ``AdapterBehaviour.from_env_var("chunk_1:bogus")``
  raises ``ValueError``.
- ``test_empty_env_returns_success_default`` — unset env →
  ``resolve("chunk_any") == "success"`` (default).
- Bonus: ``test_missing_colon_raises`` — token without ``:`` raises ``ValueError``.

Length-seam (extends the CSV grammar with ``chunk_N:length=Ns`` tokens,
research §Length Control):
- ``test_length_token_parses_to_dict`` — two length tokens parse into
  the ``length_seconds`` map; unmapped chunks return ``None`` from
  ``length_for``.
- ``test_length_token_invalid_float_raises`` — non-numeric length
  raises ``ValueError`` mentioning the token.
- ``test_length_token_non_positive_raises`` — zero / negative length
  raises ``ValueError``.

Per Pitfall F: invalid modes must raise at adapter init (loud failure,
not silent). D-04 locks the env-var surface and the ``slow`` / ``fail_once``
modes. Per Pattern 4 the model is a Pydantic v2 BaseModel with
``ConfigDict(extra="forbid")``.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Make ``_behaviour`` (the test-only seam at tests/unit/_behaviour/)
# importable as a top-level module. Pyrefly + the standalone test
# runner do not add ``tests/unit`` to ``sys.path`` automatically.
_TESTS_UNIT_DIR = Path(__file__).resolve().parent
if str(_TESTS_UNIT_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_UNIT_DIR))

from _adapters.behaviour import (  # noqa: E402
    VALID_MODES,
    AdapterBehaviour,
)
from _behaviour.test_behaviour_spec import (  # noqa: E402
    BehaviourSpec,
    parse_behaviour_csv,
)

pytestmark = pytest.mark.tcid("INFRA-03-UT12")


def test_from_env_parses_token_csv(monkeypatch: pytest.MonkeyPatch) -> None:
    """Two token CSV → per-chunk map, with default ``success`` fallback."""
    monkeypatch.setenv(
        "MOCK_TRANSLATOR_BEHAVIOUR",
        "chunk_3:fail_once_then_succeed,chunk_7:timeout",
    )
    monkeypatch.delenv("MOCK_TTS_BEHAVIOUR", raising=False)
    spec = BehaviourSpec.from_env()
    assert spec.translation.resolve("chunk_3") == "fail_once_then_succeed"
    assert spec.translation.resolve("chunk_7") == "timeout"
    # unmapped chunk_id → default success
    assert spec.translation.resolve("chunk_99") == "success"


def test_invalid_mode_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    """Unknown mode token raises ``ValueError`` at adapter init (Pitfall F)."""
    monkeypatch.setenv("MOCK_TRANSLATOR_BEHAVIOUR", "chunk_1:bogus")
    with pytest.raises(ValueError, match="Invalid mode"):
        BehaviourSpec.from_env()


def test_missing_colon_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    """Token without ``:`` raises ``ValueError`` (loud failure)."""
    monkeypatch.setenv("MOCK_TRANSLATOR_BEHAVIOUR", "chunk_1_bogus")
    with pytest.raises(ValueError, match="Invalid behaviour token"):
        BehaviourSpec.from_env()


def test_empty_env_returns_success_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Unset env vars → all chunks resolve to ``"success"``."""
    monkeypatch.delenv("MOCK_TRANSLATOR_BEHAVIOUR", raising=False)
    monkeypatch.delenv("MOCK_TTS_BEHAVIOUR", raising=False)
    spec = BehaviourSpec.from_env()
    assert spec.translation.resolve("chunk_any") == "success"
    assert spec.tts.resolve("chunk_99") == "success"


def test_valid_modes_set_is_locked() -> None:
    """Valid mode set is locked at the four modes per D-04."""
    assert frozenset({"success", "slow", "fail_once_then_succeed", "timeout"}) == VALID_MODES


def test_adapter_behaviour_explicit_empty_token_is_skipped() -> None:
    """Empty / whitespace-only tokens are skipped, not errored."""
    a = parse_behaviour_csv("")
    assert a.behaviour == {}


def test_extra_field_forbidden() -> None:
    """``AdapterBehaviour`` rejects extra fields (Pydantic v2 strict model)."""
    with pytest.raises(ValueError):  # pydantic ValidationError is a ValueError
        AdapterBehaviour.model_validate({"behaviour": {}, "unknown_field": "x"})


def test_translation_and_tts_separate(monkeypatch: pytest.MonkeyPatch) -> None:
    """Translation and TTS behaviour maps are parsed independently."""
    monkeypatch.setenv("MOCK_TRANSLATOR_BEHAVIOUR", "chunk_1:timeout")
    monkeypatch.setenv("MOCK_TTS_BEHAVIOUR", "chunk_2:slow")
    spec = BehaviourSpec.from_env()
    assert spec.translation.resolve("chunk_1") == "timeout"
    assert spec.translation.resolve("chunk_2") == "success"
    assert spec.tts.resolve("chunk_2") == "slow"
    assert spec.tts.resolve("chunk_1") == "success"


# ---------------------------------------------------------------------------
# Length-seam (research §Length Control): the ``length=Ns`` token extends
# the same CSV grammar; the new ``length_seconds`` map is a sibling of
# ``behaviour`` on ``AdapterBehaviour``.
# ---------------------------------------------------------------------------


def test_length_token_parses_to_dict(monkeypatch: pytest.MonkeyPatch) -> None:
    """Two ``length=Ns`` tokens → ``length_seconds`` map; unmapped returns ``None``."""
    monkeypatch.setenv(
        "MOCK_TTS_BEHAVIOUR",
        "vo_ch1_a0:length=2.5,vo_ch1_a1:length=3.0",
    )
    monkeypatch.delenv("MOCK_TRANSLATOR_BEHAVIOUR", raising=False)
    spec = BehaviourSpec.from_env()
    assert spec.tts.length_for("vo_ch1_a0") == 2.5
    assert spec.tts.length_for("vo_ch1_a1") == 3.0
    assert spec.tts.length_for("unmapped") is None
    # The length map is independent of the mode map.
    assert spec.tts.behaviour == {}
    assert spec.tts.resolve("vo_ch1_a0") == "success"


def test_length_token_invalid_float_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    """``length=abc`` raises ``ValueError`` mentioning the token (Pitfall F)."""
    monkeypatch.setenv("MOCK_TTS_BEHAVIOUR", "vo_ch1_a0:length=abc")
    with pytest.raises(ValueError, match="vo_ch1_a0:length=abc"):
        BehaviourSpec.from_env()


def test_length_token_non_positive_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    """Zero / negative length raises ``ValueError`` (Pitfall F)."""
    monkeypatch.setenv("MOCK_TTS_BEHAVIOUR", "vo_ch1_a0:length=0")
    with pytest.raises(ValueError, match=r"vo_ch1_a0:length=0"):
        BehaviourSpec.from_env()

    monkeypatch.setenv("MOCK_TTS_BEHAVIOUR", "vo_ch1_a0:length=-1.0")
    with pytest.raises(ValueError, match=r"vo_ch1_a0:length=-1.0"):
        BehaviourSpec.from_env()
