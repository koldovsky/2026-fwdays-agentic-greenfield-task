from __future__ import annotations

import random

from bot.trends import TrendLabel

PROGRESS_LINES: tuple[str, ...] = (
    "гарний рух — продовжуй у своєму темпі",
    "крок у правильному напрямку, дякую за стабільність",
    "помітний прогрес, це результат регулярності",
)

FLUCTUATION_LINES: tuple[str, ...] = (
    "таке коливання — нормальна частина процесу",
    "цілком природно, що вага іноді трохи зростає — головне регулярність",
    "не переживай через невелике збільшення, важлива загальна динаміка",
)

STABLE_LINES: tuple[str, ...] = (
    "стабільність теж результат — тіло іноді набирається сил",
    "без змін за тиждень — це теж ок, головне що ти зважуєшся",
    "плато трапляється — твоя уважність до себе вже на користь",
)

_TREND_POOLS: dict[TrendLabel, tuple[str, ...]] = {
    TrendLabel.PROGRESS: PROGRESS_LINES,
    TrendLabel.FLUCTUATION: FLUCTUATION_LINES,
    TrendLabel.STABLE: STABLE_LINES,
}

ALL_SUPPORT_LINES: tuple[str, ...] = PROGRESS_LINES + FLUCTUATION_LINES + STABLE_LINES


def prefix_with_name(line: str, display_name: str | None) -> str:
    if display_name and display_name.strip():
        return f"{display_name.strip()}, {line}"
    return line


def pick_support_line(
    weight_trend: TrendLabel,
    *,
    display_name: str | None,
    rng: random.Random | None = None,
) -> str:
    pool = _TREND_POOLS[weight_trend]
    chosen = (rng or random).choice(pool)
    return prefix_with_name(chosen, display_name)
