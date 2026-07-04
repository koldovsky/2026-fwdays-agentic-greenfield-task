import random

from bot.messages import (
    ALL_SUPPORT_LINES,
    FLUCTUATION_LINES,
    PROGRESS_LINES,
    STABLE_LINES,
    pick_support_line,
    prefix_with_name,
)
from bot.trends import TrendLabel


def test_prefix_with_name():
    assert prefix_with_name("гарний рух", "Оленка") == "Оленка, гарний рух"


def test_prefix_with_name_strips_whitespace():
    assert prefix_with_name("гарний рух", "  Оленка  ") == "Оленка, гарний рух"


def test_prefix_without_name_when_none():
    assert prefix_with_name("гарний рух", None) == "гарний рух"


def test_prefix_without_name_when_empty():
    assert prefix_with_name("гарний рух", "") == "гарний рух"
    assert prefix_with_name("гарний рух", "   ") == "гарний рух"


def test_pool_sizes():
    assert len(PROGRESS_LINES) >= 3
    assert len(FLUCTUATION_LINES) >= 3
    assert len(STABLE_LINES) >= 3


def test_pick_support_line_progress_pool():
    rng = random.Random(0)
    line = pick_support_line(TrendLabel.PROGRESS, display_name=None, rng=rng)
    assert line in PROGRESS_LINES


def test_pick_support_line_fluctuation_pool():
    rng = random.Random(1)
    line = pick_support_line(TrendLabel.FLUCTUATION, display_name=None, rng=rng)
    assert line in FLUCTUATION_LINES


def test_pick_support_line_stable_pool():
    rng = random.Random(2)
    line = pick_support_line(TrendLabel.STABLE, display_name=None, rng=rng)
    assert line in STABLE_LINES


def test_pick_support_line_applies_name_prefix():
    rng = random.Random(0)
    line = pick_support_line(TrendLabel.PROGRESS, display_name="Оленка", rng=rng)
    assert line.startswith("Оленка, ")
    assert line.removeprefix("Оленка, ") in PROGRESS_LINES


def test_pick_support_line_random_selection():
    rng = random.Random(42)
    first = pick_support_line(TrendLabel.PROGRESS, display_name=None, rng=rng)
    second = pick_support_line(TrendLabel.PROGRESS, display_name=None, rng=rng)
    assert first in PROGRESS_LINES
    assert second in PROGRESS_LINES


def test_no_regress_label_in_pools():
    for line in ALL_SUPPORT_LINES:
        assert "регрес" not in line.lower()
