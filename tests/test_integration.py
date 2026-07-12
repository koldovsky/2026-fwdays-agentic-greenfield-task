"""Integration tests: end-to-end expense processing (parse → validate → store)."""

import pytest

from src.processor import process_expense


def test_integration_happy_path():
    """Happy path: valid single-expense input → parsed → validated → ready to store."""
    result = process_expense("купив каву за 50")

    assert result.success is True
    assert len(result.expenses) == 1
    assert result.expense is not None  # backward-compat property
    assert result.expense.amount == 50
    assert result.expense.category == "Кафе/Ресторани"
    assert result.message.startswith("✅")


def test_integration_hard_fail_vague_input():
    """Hard-fail: vague input with no amount → LLM returns null amount →
    Expense construction rejects it (hard rule), retries exhaust, failure returned.

    Under the consolidated-validation model, `amount=None` is a hard-fail enforced
    at Expense construction time (see expense-model-validation capability). Vague
    input that yields a null amount therefore cannot be soft-stored; it retries
    and fails rather than recording an invalid expense.
    """
    result = process_expense("витрати")  # Very vague, no amount

    assert result.success is False
    assert result.expenses == []


def test_integration_hard_fail_retry():
    """Hard-fail path: agent retries on validation error.

    Verifies that the processor loop retries on hard-fail (via mock call count).
    """
    from unittest.mock import Mock
    from src.models import Expense, ValidationResult

    call_count = [0]

    def fake_extract_retry_once(text, feedback=None):
        """Simulates LLM that fails once, then succeeds."""
        call_count[0] += 1
        if call_count[0] == 1:
            # First call: return invalid category to trigger hard-fail
            return [Expense(amount=200, currency="UAH", category="InvalidCategory",
                          description=text, datetime="2026-06-27T10:00:00", confidence=0.9)]
        else:
            # Retry: return valid category
            return [Expense(amount=200, currency="UAH", category="Транспорт",
                          description=text, datetime="2026-06-27T10:00:00", confidence=0.9)]

    def fake_validate_reject_invalid(expenses):
        """Rejects invalid categories on first call, accepts valid on retry."""
        for exp in expenses:
            if exp.category == "InvalidCategory":
                return ValidationResult(valid=False, errors=["Invalid category"],
                                      feedback="Use one of the 8 canonical categories")
        return ValidationResult(valid=True)

    result = process_expense("на бенз 200",
                           extract_fn=fake_extract_retry_once,
                           validate_fn=fake_validate_reject_invalid)

    # Verify retry happened (extract called twice)
    assert call_count[0] == 2, f"Expected 2 extract calls (1 fail + 1 retry), got {call_count[0]}"
    assert result.success is True
    assert len(result.expenses) == 1
    assert result.expenses[0].category == "Транспорт"


def test_integration_error_message():
    """Error message is clear and failure state is set on hard-fail after retries."""
    from src.models import Expense, ValidationResult

    def fake_always_invalid(text, feedback=None):
        # Always return invalid data that cannot be fixed
        return [Expense(amount=75, currency="UAH", category="InvalidCategory",
                      description=text, datetime="2026-06-27T10:00:00", confidence=0.5)]

    def fake_always_reject(expenses):
        return ValidationResult(valid=False, errors=["Invalid category"],
                              feedback="Use a canonical category")

    result = process_expense("купив товары за 75",
                           extract_fn=fake_always_invalid,
                           validate_fn=fake_always_reject)

    # Verify failure state
    assert result.success is False, "Expected hard-fail after retries"
    assert result.expenses == [], "Failed processing should have no expenses"
    assert result.message is not None, "Error message should be present"
    assert len(result.message) > 0, "Error message should not be empty"
    assert "❌" in result.message or "не вдалось" in result.message.lower()


def test_integration_multi_expense_split():
    """Multi-expense input creates multiple expense objects."""
    result = process_expense("купив каву за 50 і хліб за 30")

    assert result.success is True
    assert len(result.expenses) == 2
    amounts = sorted(e.amount for e in result.expenses)
    assert amounts == [30, 50]


def test_integration_combined_total_no_split():
    """Combined-total input with one amount produces a single expense."""
    result = process_expense("купив пиво і воду за 30")

    assert result.success is True
    assert len(result.expenses) == 1
    assert result.expenses[0].amount == 30
