"""Expense processor: orchestrates agent → validator → storage."""

import logging
from typing import Optional, Protocol, List

from .agent import extract_expense
from .validator import validate_expenses
from .models import Expense, ProcessExpenseResult, ValidationResult
from .config import MAX_RETRIES, ERROR_MESSAGES


class ExpenseExtractor(Protocol):
    """Protocol for expense extraction functions."""

    def __call__(
        self, user_input: str, feedback: Optional[str] = None
    ) -> List[Expense]:
        """Extract expenses from user input, optionally with retry feedback."""
        ...


class ExpenseValidator(Protocol):
    """Protocol for expense validation functions."""

    def __call__(self, expenses: List[Expense]) -> ValidationResult:
        """Validate a list of expenses and return validation result."""
        ...

logger = logging.getLogger(__name__)


def process_expense(
    raw_text: str,
    extract_fn: Optional[ExpenseExtractor] = None,
    validate_fn: Optional[ExpenseValidator] = None,
) -> ProcessExpenseResult:
    """
    Process a raw user input: parse with agent, validate with checker, retry on hard-fail.

    Orchestrates:
    1. Agent extracts a list of expenses from raw_text
    2. Validator checks all expenses in the list
    3. If hard-fail, agent retries (max 3 times) with combined feedback
    4. If soft-fail, expenses are marked but stored
    5. Returns result for storage/reply

    Args:
        raw_text: User input text to process.
        extract_fn: Optional custom expense extractor (for testing). Defaults to extract_expense.
        validate_fn: Optional custom expense validator (for testing). Defaults to validate_expenses.

    Returns:
        ProcessExpenseResult with success flag, expenses list, and message.
    """
    _extract = extract_fn or extract_expense
    _validate = validate_fn or validate_expenses

    logger.debug(f"Starting process_expense for input: {raw_text}")
    expenses: list[Expense] = []
    feedback: Optional[str] = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.debug(f"Attempt {attempt}/{MAX_RETRIES}: extracting expenses...")
            expenses = _extract(raw_text, feedback=feedback)
            logger.debug(f"Expenses extracted: {expenses}")

            if not expenses:
                logger.warning("LLM returned empty expenses list (unable to parse)")
                feedback = ERROR_MESSAGES["PARSE_FAILED"]
                if attempt == MAX_RETRIES:
                    logger.error("Max retries reached: empty expenses list")
                    return ProcessExpenseResult(
                        success=False,
                        errors=["Unable to parse expense"],
                        message=f"❌ {ERROR_MESSAGES['PROCESSING_FAILED']}",
                    )
                continue

            logger.debug("Validating expenses...")
            validation = _validate(expenses)
            logger.debug(f"Validation result: valid={validation.valid}, errors={validation.errors}")

            if validation.valid:
                count = len(expenses)
                message = f"✅ {'Витрата записана' if count == 1 else f'{count} витрати записано'}"
                if validation.errors:
                    message += " (низька впевненість)"
                    logger.debug(f"Soft-fail with errors: {validation.errors}")
                    return ProcessExpenseResult(
                        success=True,
                        expenses=expenses,
                        errors=validation.errors,
                        message=message,
                        validation_errors="; ".join(validation.errors),
                    )
                else:
                    logger.debug("Validation passed")
                    return ProcessExpenseResult(
                        success=True,
                        expenses=expenses,
                        message=message,
                    )
            else:
                logger.warning(f"Validation hard-fail: {validation.errors}")
                feedback = validation.feedback
                if attempt == MAX_RETRIES:
                    logger.error(f"Max retries reached. Errors: {validation.errors}")
                    return ProcessExpenseResult(
                        success=False,
                        errors=validation.errors,
                        message=f"❌ {ERROR_MESSAGES['PROCESSING_FAILED']}",
                    )

        except Exception as e:
            logger.exception(f"Exception on attempt {attempt}: {e}")
            if attempt == MAX_RETRIES:
                logger.error(f"Max retries reached with exception: {e}")
                return ProcessExpenseResult(
                    success=False,
                    errors=[str(e)],
                    message=f"❌ {ERROR_MESSAGES['PROCESSING_FAILED']}",
                )
            feedback = f"{ERROR_MESSAGES['VALIDATION_FAILED']} ({str(e)})"

    logger.error("Reached end of process_expense without returning")
    return ProcessExpenseResult(
        success=False,
        errors=["Unknown error"],
        message="❌ Невідома помилка",
    )
