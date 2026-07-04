from bot.compare import MetricDeltas
from bot.trends import (
    STABLE_THRESHOLD,
    TrendLabel,
    classify_metric_deltas,
    classify_trend,
)


def test_stable_threshold_constant():
    assert STABLE_THRESHOLD == 0.2


def test_classify_trend_weight_decrease_is_progress():
    assert classify_trend(-0.6) == TrendLabel.PROGRESS


def test_classify_trend_weight_increase_is_fluctuation():
    assert classify_trend(0.3) == TrendLabel.FLUCTUATION


def test_classify_trend_within_threshold_is_stable():
    assert classify_trend(0.1) == TrendLabel.STABLE
    assert classify_trend(0.15) == TrendLabel.STABLE
    assert classify_trend(0.19) == TrendLabel.STABLE
    assert classify_trend(-0.15) == TrendLabel.STABLE


def test_classify_trend_float_subtraction_below_threshold_is_stable():
    assert classify_trend(32.3 - 32.1, invert=True) == TrendLabel.STABLE
    assert classify_trend(24.6 - 24.8) == TrendLabel.STABLE


def test_classify_trend_at_threshold_boundary_is_directional():
    assert classify_trend(-0.2) == TrendLabel.PROGRESS
    assert classify_trend(0.2) == TrendLabel.FLUCTUATION


def test_classify_trend_muscle_inverted():
    assert classify_trend(0.3, invert=True) == TrendLabel.PROGRESS
    assert classify_trend(-0.3, invert=True) == TrendLabel.FLUCTUATION
    assert classify_trend(0.1, invert=True) == TrendLabel.STABLE


def test_classify_metric_deltas():
    deltas = MetricDeltas(
        weight_kg=-0.6,
        fat_pct=0.3,
        muscle_pct=-0.2,
        bmi=0.1,
    )

    labels = classify_metric_deltas(deltas)

    assert labels == {
        "weight": TrendLabel.PROGRESS,
        "fat": TrendLabel.FLUCTUATION,
        "muscle": TrendLabel.FLUCTUATION,
        "bmi": TrendLabel.STABLE,
    }


def test_classify_metric_deltas_muscle_at_threshold_is_progress():
    deltas = MetricDeltas(
        weight_kg=0.0,
        fat_pct=0.0,
        muscle_pct=0.2,
        bmi=0.0,
    )

    labels = classify_metric_deltas(deltas)

    assert labels["muscle"] == TrendLabel.PROGRESS
