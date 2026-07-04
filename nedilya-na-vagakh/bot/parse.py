from __future__ import annotations

import math
from dataclasses import dataclass

# Plausibility bounds (inclusive). Values outside these are almost certainly a
# typo or a misread scale display; rejecting them keeps stored data and all
# downstream stats meaningful. Bounds are intentionally generous.
WEIGHT_RANGE_KG: tuple[float, float] = (20.0, 400.0)
FAT_RANGE_PCT: tuple[float, float] = (1.0, 100.0)
MUSCLE_RANGE_PCT: tuple[float, float] = (1.0, 100.0)
BMI_RANGE: tuple[float, float] = (5.0, 120.0)


class ParseError(ValueError):
    """Raised when weigh-in input cannot be parsed.

    ``kind`` distinguishes failure modes so callers can pick an appropriate
    Ukrainian reply: ``"count"``/``"non_numeric"`` (unrecognized input) vs
    ``"out_of_range"`` (numbers parsed but implausible).
    """

    def __init__(self, kind: str) -> None:
        super().__init__(kind)
        self.kind = kind


@dataclass(frozen=True)
class ParsedWeighIn:
    weight_kg: float
    fat_pct: float
    muscle_pct: float
    bmi: float


def _within(value: float, bounds: tuple[float, float]) -> bool:
    low, high = bounds
    return low <= value <= high


def parse_weigh_in(text: str) -> ParsedWeighIn:
    tokens = text.strip().split()
    if len(tokens) != 4:
        raise ParseError("count")

    try:
        values = [float(token.replace(",", ".")) for token in tokens]
    except ValueError as exc:
        raise ParseError("non_numeric") from exc

    if not all(math.isfinite(value) for value in values):
        raise ParseError("non_numeric")

    weight_kg, fat_pct, muscle_pct, bmi = values
    if not (
        _within(weight_kg, WEIGHT_RANGE_KG)
        and _within(fat_pct, FAT_RANGE_PCT)
        and _within(muscle_pct, MUSCLE_RANGE_PCT)
        and _within(bmi, BMI_RANGE)
    ):
        raise ParseError("out_of_range")

    return ParsedWeighIn(
        weight_kg=weight_kg,
        fat_pct=fat_pct,
        muscle_pct=muscle_pct,
        bmi=bmi,
    )


def format_uk_decimal(value: float) -> str:
    return f"{value:.1f}".replace(".", ",")
