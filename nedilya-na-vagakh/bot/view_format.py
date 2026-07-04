from __future__ import annotations

from datetime import datetime

from bot.compare import MetricDeltas, build_comparison_message, format_delta
from bot.messages import pick_support_line
from bot.models import WeighIn
from bot.month_stats import (
    BestMonth,
    MonthSummary,
    format_month_label,
    format_recorded_at_kyiv,
    previous_month_weight_delta,
)
from bot.parse import format_uk_decimal
from bot.trends import classify_metric_deltas, classify_trend

HISTORY_EMPTY_MESSAGE = "Ще немає записів."
PROGRESS_EMPTY_MESSAGE = "Ще немає записів. Почни з /вага."
MONTH_EMPTY_MESSAGE = "У цьому місяці ще немає записів."
ALL_TIME_EMPTY_MESSAGE = "Ще немає записів."
MONTH_SPARSE_MESSAGE = "ще мало даних для порівняння в місяці"


def format_entry_date_kyiv(recorded_at: str) -> str:
    return format_recorded_at_kyiv(recorded_at)


def _format_values(entry: WeighIn) -> str:
    return (
        f"вага — {format_uk_decimal(entry.weight_kg)} кг,\n"
        f"жир — {format_uk_decimal(entry.fat_pct)} %,\n"
        f"м'язи — {format_uk_decimal(entry.muscle_pct)} %,\n"
        f"BMI — {format_uk_decimal(entry.bmi)}"
    )


def build_history_table(entries: list[WeighIn]) -> str:
    if not entries:
        return HISTORY_EMPTY_MESSAGE

    lines = ["```", "Дата       Вага  Жир  М'язи  BMI"]
    for entry in entries:
        date = format_entry_date_kyiv(entry.recorded_at)
        lines.append(
            f"{date:<10} {format_uk_decimal(entry.weight_kg):>5}  "
            f"{format_uk_decimal(entry.fat_pct):>4}  "
            f"{format_uk_decimal(entry.muscle_pct):>5}  "
            f"{format_uk_decimal(entry.bmi):>4}"
        )
    lines.append("```")
    return "\n".join(lines)


def build_progress_message(
    latest: WeighIn,
    *,
    previous: WeighIn | None,
    first: WeighIn | None,
    entry_count: int,
    display_name: str | None,
) -> str:
    parts = ["Останній запис:", _format_values(latest)]
    comparison = build_comparison_message(
        latest,
        previous=previous,
        first=first,
        entry_count=entry_count,
    )
    parts.extend(["", comparison])
    if previous is not None:
        from bot.compare import compute_metric_deltas

        deltas = compute_metric_deltas(latest, previous)
        support = pick_support_line(
            classify_trend(deltas.weight_kg),
            display_name=display_name,
        )
        parts.extend(["", support])
    return "\n".join(parts)


def _baseline_deltas(baseline: WeighIn, latest: WeighIn) -> MetricDeltas:
    return MetricDeltas(
        weight_kg=latest.weight_kg - baseline.weight_kg,
        fat_pct=latest.fat_pct - baseline.fat_pct,
        muscle_pct=latest.muscle_pct - baseline.muscle_pct,
        bmi=latest.bmi - baseline.bmi,
    )


def build_month_message(
    summary: MonthSummary,
    entries: list[WeighIn],
    *,
    now_kyiv: datetime,
    display_name: str | None,
) -> str:
    if summary.entry_count == 0:
        return MONTH_EMPTY_MESSAGE

    assert summary.latest_in_month is not None

    header = (
        f"{format_month_label(summary.year, summary.month).capitalize()} "
        f"({summary.entry_count} записів)"
    )

    if summary.entry_count == 1:
        return (
            f"{header}\n\n"
            f"{_format_values(summary.latest_in_month)}\n\n"
            f"{MONTH_SPARSE_MESSAGE}."
        )

    assert summary.baseline is not None
    deltas = _baseline_deltas(summary.baseline, summary.latest_in_month)
    labels = classify_metric_deltas(deltas)
    lines = [
        header,
        "",
        "З початку місяця:",
        f"вага {format_delta(deltas.weight_kg)} кг — {labels['weight']},",
        f"жир {format_delta(deltas.fat_pct)} % — {labels['fat']},",
        f"м'язи {format_delta(deltas.muscle_pct)} % — {labels['muscle']},",
        f"BMI {format_delta(deltas.bmi)} — {labels['bmi']}",
    ]

    prev_delta = previous_month_weight_delta(entries, ref=now_kyiv)
    if prev_delta is not None:
        lines.extend(["", f"Минулий місяць: {format_delta(prev_delta)} кг"])

    support = pick_support_line(
        classify_trend(deltas.weight_kg),
        display_name=display_name,
    )
    lines.extend(["", support])
    return "\n".join(lines)


def build_all_time_message(
    entries: list[WeighIn],
    *,
    best: BestMonth | None,
) -> str:
    if not entries:
        return ALL_TIME_EMPTY_MESSAGE

    first = entries[0]
    latest = entries[-1]
    first_date = format_entry_date_kyiv(first.recorded_at)

    if len(entries) == 1:
        return (
            f"Всього записів: 1\nПерший запис: {first_date}\n\n{_format_values(first)}"
        )

    deltas = _baseline_deltas(first, latest)
    lines = [
        f"Всього записів: {len(entries)}",
        f"Перший запис: {first_date}",
        "",
        "Від першого до останнього:",
        f"вага {format_delta(deltas.weight_kg)} кг",
        f"жир {format_delta(deltas.fat_pct)} %",
        f"м'язи {format_delta(deltas.muscle_pct)} %",
        f"BMI {format_delta(deltas.bmi)}",
    ]

    if best is not None:
        month_label = format_month_label(best.year, best.month)
        lines.extend(
            [
                "",
                f"Найкращий місяць: {month_label} "
                f"({format_delta(-best.weight_loss_kg)} кг)",
            ]
        )

    return "\n".join(lines)
