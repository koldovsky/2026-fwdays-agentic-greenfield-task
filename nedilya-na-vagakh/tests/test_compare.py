import pytest

from bot.compare import (
    build_comparison_message,
    compute_metric_deltas,
    format_delta,
)
from bot.models import WeighIn


def _weigh_in(
    *,
    weigh_in_id: int,
    weight_kg: float,
    fat_pct: float = 28.0,
    muscle_pct: float = 32.0,
    bmi: float = 24.0,
    recorded_at: str = "2026-07-01T09:00:00+00:00",
) -> WeighIn:
    return WeighIn(
        id=weigh_in_id,
        user_id=42,
        recorded_at=recorded_at,
        weight_kg=weight_kg,
        fat_pct=fat_pct,
        muscle_pct=muscle_pct,
        bmi=bmi,
    )


def test_compute_metric_deltas():
    previous = _weigh_in(
        weigh_in_id=1, weight_kg=72.4, fat_pct=28.5, muscle_pct=32.1, bmi=24.8
    )
    current = _weigh_in(
        weigh_in_id=2, weight_kg=71.8, fat_pct=28.8, muscle_pct=31.9, bmi=24.6
    )

    deltas = compute_metric_deltas(current, previous)

    assert deltas.weight_kg == pytest.approx(-0.6)
    assert deltas.fat_pct == pytest.approx(0.3)
    assert deltas.muscle_pct == pytest.approx(-0.2)
    assert deltas.bmi == pytest.approx(-0.2)


def test_format_delta_negative():
    assert format_delta(-0.6) == "−0,6"


def test_format_delta_positive():
    assert format_delta(0.3) == "+0,3"


def test_format_delta_zero():
    assert format_delta(0.0) == "0,0"


def test_build_comparison_message_baseline():
    current = _weigh_in(weigh_in_id=1, weight_kg=72.4)

    message = build_comparison_message(
        current,
        previous=None,
        first=None,
        entry_count=1,
    )

    assert message == "Стартова точка — далі порівняємо з нею."


def test_build_comparison_message_second_entry():
    first = _weigh_in(
        weigh_in_id=1,
        weight_kg=72.4,
        fat_pct=28.5,
        muscle_pct=32.1,
        bmi=24.8,
        recorded_at="2026-06-01T09:00:00+00:00",
    )
    current = _weigh_in(
        weigh_in_id=2,
        weight_kg=71.8,
        fat_pct=28.2,
        muscle_pct=32.3,
        bmi=24.6,
        recorded_at="2026-07-01T09:00:00+00:00",
    )

    message = build_comparison_message(
        current,
        previous=first,
        first=first,
        entry_count=2,
    )

    assert "Порівняно з попереднім:" in message
    assert "вага −0,6 кг — прогрес," in message
    assert "жир −0,3 % — прогрес," in message
    assert "м'язи +0,2 % — без змін," in message
    assert "BMI −0,2 — без змін" in message
    assert "Від старту: −0,6 кг" in message
    assert "Від старту:" in message
    assert "прогрес" not in message.split("Від старту:")[1]


def test_build_comparison_message_third_entry():
    first = _weigh_in(
        weigh_in_id=1,
        weight_kg=72.4,
        recorded_at="2026-06-01T09:00:00+00:00",
    )
    previous = _weigh_in(
        weigh_in_id=2,
        weight_kg=71.8,
        recorded_at="2026-07-01T09:00:00+00:00",
    )
    current = _weigh_in(
        weigh_in_id=3,
        weight_kg=71.2,
        recorded_at="2026-07-08T09:00:00+00:00",
    )

    message = build_comparison_message(
        current,
        previous=previous,
        first=first,
        entry_count=2,
    )

    assert "вага −0,6 кг — прогрес," in message
    assert "Від старту: −1,2 кг" in message
