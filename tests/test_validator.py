"""Unit tests for validator (checker)."""

import pytest
from datetime import datetime, timedelta
from pydantic import ValidationError

from src.validator import validate_expense
from src.models import Expense


def test_validate_valid_expense():
    """Valid expense passes validation."""
    expense = Expense(
        amount=50.0,
        currency="UAH",
        category="Кафе/Ресторани",
        description="купив каву",
        datetime="2026-06-27T14:30:00",
        confidence=0.95,
    )
    result = validate_expense(expense)
    assert result.valid is True
    assert result.errors == []


def test_validate_amount_zero():
    """Amount <= 0 fails hard."""
    with pytest.raises(ValidationError):
        Expense(
            amount=0,
            currency="UAH",
            category="Продукти",
            description="test",
            datetime="2026-06-27T14:30:00",
            confidence=0.8,
        )


def test_validate_amount_negative():
    """Negative amount fails hard."""
    with pytest.raises(ValidationError):
        Expense(
            amount=-50.0,
            currency="UAH",
            category="Продукти",
            description="test",
            datetime="2026-06-27T14:30:00",
            confidence=0.8,
        )


def test_validate_amount_null():
    """Null amount fails hard at Pydantic construction."""
    with pytest.raises(ValidationError):
        Expense(
            amount=None,
            currency="UAH",
            category="Продукти",
            description="test",
            datetime="2026-06-27T14:30:00",
            confidence=0.8,
        )


def test_validate_invalid_category():
    """Invalid category fails hard at Pydantic construction."""
    with pytest.raises(ValidationError):
        Expense(
            amount=50.0,
            currency="UAH",
            category="ПривидняКатегорія",
            description="test",
            datetime="2026-06-27T14:30:00",
            confidence=0.8,
        )


def test_validate_null_category():
    """Null category fails hard at Pydantic construction."""
    with pytest.raises(ValidationError):
        Expense(
            amount=50.0,
            currency="UAH",
            category=None,
            description="test",
            datetime="2026-06-27T14:30:00",
            confidence=0.8,
        )


def test_validate_future_datetime():
    """Future datetime fails hard."""
    future_dt = (datetime.now() + timedelta(hours=1)).isoformat()
    with pytest.raises(ValidationError):
        Expense(
            amount=50.0,
            currency="UAH",
            category="Продукти",
            description="test",
            datetime=future_dt,
            confidence=0.8,
        )


def test_validate_invalid_datetime_format():
    """Invalid datetime format fails hard."""
    with pytest.raises(ValidationError):
        Expense(
            amount=50.0,
            currency="UAH",
            category="Продукти",
            description="test",
            datetime="not-a-datetime",
            confidence=0.8,
        )


def test_validate_confidence_too_low():
    """Low confidence (< 0.7) is soft-fail but still valid."""
    expense = Expense(
        amount=50.0,
        currency="UAH",
        category="Продукти",
        description="test",
        datetime="2026-06-27T14:30:00",
        confidence=0.5,
    )
    result = validate_expense(expense)
    assert result.valid is True
    assert any("confidence < 0.7" in e for e in result.errors)


def test_validate_empty_description():
    """Empty description fails hard."""
    with pytest.raises(ValidationError):
        Expense(
            amount=50.0,
            currency="UAH",
            category="Продукти",
            description="",
            datetime="2026-06-27T14:30:00",
            confidence=0.8,
        )


def test_validate_all_categories():
    """All 8 canonical categories are valid."""
    categories = {
        "Продукти",
        "Транспорт",
        "Кафе/Ресторани",
        "Комуналки",
        "Розваги",
        "Здоров'я",
        "Покупки",
        "Інше",
    }

    for category in categories:
        expense = Expense(
            amount=50.0,
            currency="UAH",
            category=category,
            description=f"test {category}",
            datetime="2026-06-27T14:30:00",
            confidence=0.8,
        )
        result = validate_expense(expense)
        assert result.valid is True, f"Category {category} should be valid"
