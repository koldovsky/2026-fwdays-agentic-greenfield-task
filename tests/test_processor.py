"""Unit tests for processor retry logic using injectable extract_fn and validate_fn."""

import pytest
from pydantic import ValidationError

from src.models import Expense, ValidationResult
from src.processor import process_expense


def _make_expense(**kwargs):
    defaults = dict(
        amount=50.0,
        currency="UAH",
        category="Кафе/Ресторани",
        description="купив каву",
        datetime="2026-06-27T14:30:00",
        confidence=0.95,
    )
    defaults.update(kwargs)
    return Expense(**defaults)


def _always_valid(expenses):
    return ValidationResult(valid=True)


def _always_fail(expenses):
    return ValidationResult(
        valid=False,
        errors=["category is null"],
        feedback="Validation failed: category is null. Please retry.",
    )


class TestRetrySucceedsOnSecondAttempt:
    def test_succeeds_on_second_attempt(self):
        """Extractor fails once then returns valid expense — processor succeeds after retry."""
        good_expense = _make_expense()
        attempts = []

        def fake_extract(text, feedback=None):
            attempts.append(feedback)
            if len(attempts) == 1:
                raise ValueError("LLM error on first attempt")
            return [good_expense]

        result = process_expense("купив каву за 50", extract_fn=fake_extract, validate_fn=_always_valid)

        assert result.success is True
        assert len(result.expenses) == 1
        assert result.expenses[0].amount == 50.0
        assert len(attempts) == 2

    def test_validation_fail_then_success(self):
        """extract_fn returns bad expenses on attempt 1, good on attempt 2."""
        good_expense = _make_expense()
        call_count = [0]

        def fake_extract(text, feedback=None):
            call_count[0] += 1
            return [good_expense]

        validate_calls = [0]

        def fake_validate(expenses):
            validate_calls[0] += 1
            if validate_calls[0] == 1:
                return ValidationResult(
                    valid=False,
                    errors=["amount is null"],
                    feedback="Validation failed: amount is null. Please retry.",
                )
            return ValidationResult(valid=True)

        result = process_expense("text", extract_fn=fake_extract, validate_fn=fake_validate)

        assert result.success is True
        assert validate_calls[0] == 2


class TestMaxRetriesExceeded:
    def test_always_failing_extractor_returns_failure(self):
        """extract_fn always raises — processor exhausts retries and returns failure."""
        def always_raise(text, feedback=None):
            raise ValueError("permanent LLM failure")

        result = process_expense("some input", extract_fn=always_raise, validate_fn=_always_valid)

        assert result.success is False
        assert "❌" in result.message

    def test_always_invalid_validation_returns_failure(self):
        """Validation always hard-fails — processor exhausts retries and returns failure."""
        good_expense = _make_expense()

        def fake_extract(text, feedback=None):
            return [good_expense]

        result = process_expense("some input", extract_fn=fake_extract, validate_fn=_always_fail)

        assert result.success is False
        assert result.errors  # errors list is non-empty


class TestExceptionTriggersFeedback:
    def test_exception_feedback_passed_to_next_attempt(self):
        """Exception message is passed as feedback on the next extract attempt."""
        good_expense = _make_expense()
        received_feedback = []

        def fake_extract(text, feedback=None):
            received_feedback.append(feedback)
            if len(received_feedback) == 1:
                raise ValueError("chain timeout")
            return [good_expense]

        result = process_expense("text", extract_fn=fake_extract, validate_fn=_always_valid)

        assert result.success is True
        assert received_feedback[0] is None          # first attempt has no feedback
        assert "chain timeout" in received_feedback[1]  # second attempt gets the error


class TestValidationFeedbackInjection:
    def test_validation_feedback_injected_on_retry(self):
        """Validation hard-fail feedback is passed to extract on next attempt."""
        good_expense = _make_expense(category="Транспорт")
        received_feedback = []
        call_count = [0]

        def fake_extract(text, feedback=None):
            received_feedback.append(feedback)
            call_count[0] += 1
            return [good_expense]

        def fake_validate(expenses):
            call_count_val = [v for v in call_count]
            if call_count_val[0] == 1:
                # First validation: hard-fail with feedback
                return ValidationResult(
                    valid=False,
                    errors=["category is null"],
                    feedback="Use one of the 8 canonical categories.",
                )
            # Second validation: pass
            return ValidationResult(valid=True)

        result = process_expense("на бенз 200", extract_fn=fake_extract, validate_fn=fake_validate)

        assert result.success is True
        assert received_feedback[0] is None
        assert "8 canonical categories" in received_feedback[1]  # feedback is present on retry
