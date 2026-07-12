"""Validator (checker): Soft-fail confidence check for parsed expenses.

Hard-fail rules (amount, category, datetime, description, confidence range) are
enforced at Expense construction time by Pydantic validators in models.py.
This module only applies the soft-fail rule: confidence < CONFIDENCE_THRESHOLD.
"""

import logging
from typing import List

from .config import CONFIDENCE_THRESHOLD
from .models import Expense, ValidationResult

# Min/max thresholds for calibration judgment
_GOOD_CONFIDENCE_MIN = 0.7
_GOOD_CALIBRATION_FACTOR = 0.8

logger = logging.getLogger(__name__)


def validate_expense(expense: Expense) -> ValidationResult:
    """
    Apply soft-fail rule to a parsed expense.

    Any Expense object received here has already passed all hard-fail rules
    (enforced by Pydantic at construction). This function only checks:
    - Rule 7: confidence < CONFIDENCE_THRESHOLD (soft-fail, expense stored but flagged)

    Args:
        expense: Expense object to validate.

    Returns:
        ValidationResult with valid=True always; errors non-empty if soft-flagged.
    """
    logger.info(f"Validating expense: {expense}")

    if expense.confidence < CONFIDENCE_THRESHOLD:
        logger.debug(f"Soft-fail: confidence {expense.confidence} < {CONFIDENCE_THRESHOLD}")
        return ValidationResult(
            valid=True,
            errors=[f"confidence < {CONFIDENCE_THRESHOLD} (flagged for review)"],
            feedback=None,
        )

    logger.info("Validation passed")
    return ValidationResult(valid=True)


def validate_expenses(expenses: List[Expense]) -> ValidationResult:
    """
    Apply soft-fail rule across a list of expenses.

    All hard-fail rules are enforced at Expense construction time. This function
    aggregates soft-fail flags (low confidence) across all items.

    Args:
        expenses: List of Expense objects to validate.

    Returns:
        Combined ValidationResult. valid=True always; errors non-empty if any item soft-flagged.
    """
    any_soft_fail = False

    for expense in expenses:
        result = validate_expense(expense)
        if result.errors:
            any_soft_fail = True

    if any_soft_fail:
        return ValidationResult(
            valid=True,
            errors=[f"confidence < {CONFIDENCE_THRESHOLD} (flagged for review)"],
            feedback=None,
        )
    return ValidationResult(valid=True)
