"""Pure unit tests for the coach service's non-DB helpers (spec 006).

These pin the parse/validate/emoji/degradation helpers and the provider seam wiring that the
DB-backed acceptance suite reaches only indirectly, so the behaviour is exercised without a
live LLM call or a Postgres connection (NFR-COST-01) -- framework-free, no ``RUN_DB_TESTS``
gate, like ``tests/test_metrics_snapshot.py``. They complement (never replace) the acceptance
tests in ``tests/test_coach_api.py``.
"""

import inspect
import json
from datetime import date

import pytest

from app.services.coach import (
    _card_text,
    _counts_ok,
    _fallback_payload,
    _google_ai_provider,
    _has_emoji,
    _ModelCard,
    _parse_and_validate,
    _reply_text,
    _system_prompt,
    _week_start,
    get_coach_provider,
    trim_history,
)

_ROCKET = "\U0001f680"  # a codepoint, not a source glyph


def _card_json(*, observations, recommendations, quiet=False, language="en") -> str:
    return json.dumps(
        {
            "language": language,
            "quiet": quiet,
            "observations": [{"text": t, "metric_refs": []} for t in observations],
            "recommendations": [{"text": t, "metric_refs": []} for t in recommendations],
        }
    )


def test_parse_rejects_malformed_json() -> None:
    assert _parse_and_validate("not json {") is None


def test_parse_rejects_non_string_scalar_json() -> None:
    # Valid JSON, but a bare scalar is not a §4.2 object -> schema-invalid.
    assert _parse_and_validate("42") is None


def test_parse_rejects_wrong_shape() -> None:
    # Valid JSON object but missing required fields / wrong types -> ValidationError -> None.
    assert _parse_and_validate(json.dumps({"language": "en"})) is None
    assert _parse_and_validate(json.dumps({"language": 5, "quiet": False})) is None


def test_parse_rejects_out_of_range_counts() -> None:
    too_many = _card_json(observations=["a", "b", "c", "d", "e"], recommendations=["x"])
    assert _parse_and_validate(too_many) is None
    quiet_with_rec = _card_json(observations=["a"], recommendations=["x"], quiet=True)
    assert _parse_and_validate(quiet_with_rec) is None


def test_parse_accepts_notable_and_quiet_cards() -> None:
    notable = _parse_and_validate(
        _card_json(observations=["a", "b"], recommendations=["x"])
    )
    assert notable is not None and notable.quiet is False
    quiet = _parse_and_validate(_card_json(observations=["a"], recommendations=[], quiet=True))
    assert quiet is not None and quiet.quiet is True


def test_counts_ok_bounds() -> None:
    assert _counts_ok(_ModelCard.model_validate(json.loads(
        _card_json(observations=["a", "b"], recommendations=["x", "y"])
    )))
    assert not _counts_ok(_ModelCard.model_validate(json.loads(
        _card_json(observations=["a"], recommendations=["x"])  # quiet False needs >=2 obs
    )))


def test_has_emoji_detects_and_clears() -> None:
    dirty = _ModelCard.model_validate(json.loads(
        _card_json(observations=[f"nice {_ROCKET}", "ok"], recommendations=["go"])
    ))
    clean = _ModelCard.model_validate(json.loads(
        _card_json(observations=["nice", "ok"], recommendations=["go"])
    ))
    assert _has_emoji(dirty) is True
    assert _has_emoji(clean) is False


def test_card_text_and_reply_text_join_all_fields() -> None:
    card = _ModelCard.model_validate(json.loads(
        _card_json(observations=["one", "two"], recommendations=["three"])
    ))
    assert _card_text(card) == "one two three"
    payload = json.loads(_card_json(observations=["one", "two"], recommendations=["three"]))
    assert _reply_text(payload) == "one\ntwo\nthree"


def test_reply_text_tolerates_off_shape_blocks() -> None:
    # A block that is not a list contributes nothing rather than raising (defensive).
    assert _reply_text({"observations": "oops", "recommendations": [{"text": "ok"}]}) == "ok"


def test_fallback_payload_is_quiet_and_number_free() -> None:
    payload = _fallback_payload("uk")
    assert payload["language"] == "uk"
    assert payload["quiet"] is True
    assert payload["recommendations"] == []
    assert len(payload["observations"]) == 1
    text = payload["observations"][0]["text"]
    assert not any(ch.isdigit() for ch in text)


def test_system_prompt_reflects_language() -> None:
    assert "Ukrainian" in _system_prompt("uk")
    assert "English" in _system_prompt("en")


def test_trim_history_empty_and_single() -> None:
    assert trim_history([]) == []
    one = [{"role": "user", "content": "x" * 100_000}]  # single turn always kept
    assert trim_history(one) == one


def test_week_start_extracts_and_validates() -> None:
    snapshot = {"window": {"start": date(2026, 7, 6), "end": date(2026, 7, 12), "days": 7}}
    assert _week_start(snapshot) == date(2026, 7, 6)
    with pytest.raises(ValueError):
        _week_start({"window": {}})


def test_provider_seam_returns_the_real_async_transport() -> None:
    provider = get_coach_provider()
    assert provider is _google_ai_provider
    assert inspect.iscoroutinefunction(provider)
