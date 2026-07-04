from __future__ import annotations

from dataclasses import dataclass

from bot.models import WeighIn

_UNICODE_MINUS = "\u2212"


@dataclass(frozen=True)
class MetricDeltas:
    weight_kg: float
    fat_pct: float
    muscle_pct: float
    bmi: float


def compute_metric_deltas(current: WeighIn, previous: WeighIn) -> MetricDeltas:
    return MetricDeltas(
        weight_kg=current.weight_kg - previous.weight_kg,
        fat_pct=current.fat_pct - previous.fat_pct,
        muscle_pct=current.muscle_pct - previous.muscle_pct,
        bmi=current.bmi - previous.bmi,
    )


def format_delta(value: float) -> str:
    formatted = f"{value:.1f}".replace(".", ",")
    if value < 0:
        return f"{_UNICODE_MINUS}{formatted.lstrip('-')}"
    if value > 0:
        return f"+{formatted}"
    return formatted


def build_comparison_message(
    current: WeighIn,
    *,
    previous: WeighIn | None,
    first: WeighIn | None,
    entry_count: int,
) -> str:
    if entry_count <= 1 or previous is None:
        return "Стартова точка — далі порівняємо з нею."

    deltas = compute_metric_deltas(current, previous)
    from bot.trends import classify_metric_deltas

    labels = classify_metric_deltas(deltas)
    lines = [
        "Порівняно з попереднім:",
        f"вага {format_delta(deltas.weight_kg)} кг — {labels['weight']},",
        f"жир {format_delta(deltas.fat_pct)} % — {labels['fat']},",
        f"м'язи {format_delta(deltas.muscle_pct)} % — {labels['muscle']},",
        f"BMI {format_delta(deltas.bmi)} — {labels['bmi']}",
    ]

    if entry_count >= 2 and first is not None:
        from_start = current.weight_kg - first.weight_kg
        lines.append(f"Від старту: {format_delta(from_start)} кг")

    return "\n".join(lines)
