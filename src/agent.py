"""Parser agent: LLM-powered expense extraction from free-form Ukrainian text."""

import logging
import os
import threading
from datetime import datetime
from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from tenacity import stop_after_attempt, retry_if_exception_type

from .config import OPENAI_API_KEY, LLM_MODEL
from .models import Expense, ExpenseList

logger = logging.getLogger(__name__)

# Thread-safe Langsmith client singleton
_langsmith_client = None
_langsmith_lock = threading.Lock()


def _get_langsmith_client():
    """Thread-safe getter for Langsmith client singleton.

    Initializes on first call if LANGSMITH_API_KEY and LANGSMITH_PROJECT are set.
    Uses double-checked locking to avoid lock contention after initialization.
    Returns None if credentials are not set or initialization failed.
    """
    global _langsmith_client
    if _langsmith_client is not None:
        return _langsmith_client

    with _langsmith_lock:
        if _langsmith_client is not None:
            return _langsmith_client

        api_key = os.environ.get("LANGSMITH_API_KEY")
        project = os.environ.get("LANGSMITH_PROJECT")
        if not api_key or not project:
            logger.debug("Langsmith not configured (missing API_KEY or PROJECT)")
            return None

        try:
            from langsmith import Client as LangsmithClientClass
            endpoint = os.environ.get("LANGSMITH_ENDPOINT")
            _langsmith_client = LangsmithClientClass(api_key=api_key, api_url=endpoint)
            logger.info(f"Langsmith tracing enabled for project: {project} (endpoint: {endpoint or 'default'})")
        except Exception as e:
            logger.warning(f"Langsmith initialization failed, tracing disabled: {e}")
            _langsmith_client = None

        return _langsmith_client

# System prompt for the LLM (refers to AGENTS.md content)
SYSTEM_PROMPT = """You are an expense parser agent. Your task is to extract structured expense data from free-form Ukrainian text.

You MUST return a valid JSON of expense objects. The response will be automatically parsed into structured format.

MULTIPLE EXPENSES: If the user describes more than one distinct purchase with separate amounts, return one object per purchase.
COMBINED TOTALS: If the user lists multiple items but gives only one total amount, return a single expense for that total amount.

EXAMPLES:
Input: "купив каву за 50 і хліб за 30"
Output: (expenses array with two objects: amount 50 and 30)

Input: "купив пиво і воду за 30"
Output: (expenses array with one object: amount 30)

Input: "купив каву за 50"
Output: (expenses array with one object: amount 50)

CATEGORY VOCABULARY (must be one of these 8):
- Продукти (groceries, food shopping)
- Транспорт (gas, transit, taxi)
- Кафе/Ресторани (dining out)
- Комуналки (utilities, rent)
- Розваги (entertainment, hobbies)
- Здоров'я (healthcare, pharmacy)
- Покупки (clothing, household goods)
- Інше (catch-all for unclear)

DATETIME INFERENCE RULES (apply in order, independently for each expense):
1. Explicit time given (e.g., о 18:30, в 14:00) -> use it. If no date given, use today's date from Message received at.
2. Relative time given (e.g., годину назад, 2 години тому, хвилину назад) -> subtract the offset from the Message received at timestamp.
3. Date only, no time (e.g., вчора, 2026-06-25, у п'ятницю) -> use midnight (00:00:00) of that date.
4. No date and no time at all -> copy the Message received at timestamp EXACTLY, character for character.

CRITICAL: NEVER use a date from your training data. The ONLY valid source of today's date is the Message received at field. If you are unsure, use Message received at verbatim.

OTHER RULES:
5. Always return ISO 8601 datetime without timezone suffix (e.g., 2026-06-28T14:30:00).
6. Amount must be > 0 or null if unknown.
7. Category must be one of the 8 above or null if too vague.
8. Confidence scoring: Your confidence score (0.0–1.0) reflects your certainty in the extraction.
   SCORING RANGES:
   - 0.9–1.0: Clear, unambiguous input. Example: "купив каву за 50" → 0.95
   - 0.8–0.89: Mostly clear but minor ambiguity (time not specified). Example: "50 на каву сьогодні" → 0.85
   - 0.7–0.79: Slightly ambiguous but resolvable. Example: "витратив 50 на дрібниці" (category unclear) → 0.75
   - 0.5–0.69: Ambiguous category but amount is present. Example: "купив якусь дрібницю за 20" → 0.55
   - 0.3–0.49: Very vague; category is essentially a guess. Example: "витратив на якусь річ" + inferred amount → 0.35
   - < 0.3: Reserved only for cases where category is genuinely unknowable but amount exists. DO NOT use as substitute for missing amount.

   SCORING ALGORITHM:
   1. Start at 1.0 (assume full confidence)
   2. Deduct 0.05 for each missing/ambiguous element (no time, unclear category, typo)
   3. Deduct 0.2 if category is "Інше" (catch-all indicates uncertainty)
   4. Deduct 0.3 if amount required inference (user said "біля 50" not "50")
   5. Final score = max(0.0, min(1.0, base - deductions))

9. Do NOT add extra fields or omit required fields in any object.
10. Do NOT hallucinate categories outside the vocabulary.
11. Preserve original text in description unless normalizing for clarity."""

MAX_RETRIES = 3

_chain = None


def _get_chain():
    global _chain
    if _chain is None:
        llm = ChatOpenAI(model=LLM_MODEL, temperature=0.3, api_key=OPENAI_API_KEY)
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                ("human", "Message received at: {received_at}\nParse this expense: {user_input}"),
            ]
        )
        _chain = (prompt | llm.with_structured_output(ExpenseList)).with_retry(
            stop_after_attempt=MAX_RETRIES,
            retry_if_exception_type=(ValueError,)
        )
    return _chain


def _add_langsmith_metadata(expenses: list[Expense]) -> None:
    """Attach extracted expense metadata to the current Langsmith run, if active.

    Only aggregated metrics are sent: amounts, categories, confidence scores.
    Sensitive data (user input, descriptions) is NOT sent to LangSmith.
    """
    if _get_langsmith_client() is None:
        return
    try:
        from langsmith import get_current_run_tree
        run = get_current_run_tree()
        if run is not None:
            run.metadata.update({
                "amounts": [e.amount for e in expenses],
                "categories": [e.category for e in expenses],
                "confidences": [e.confidence for e in expenses],
            })
    except Exception as e:
        logger.debug(f"Langsmith metadata update skipped: {e}")


def extract_expense(user_input: str, feedback: Optional[str] = None, chain=None) -> list[Expense]:
    """
    Extract structured expenses from user input using LangChain.

    All timestamps are in LOCAL timezone (naive datetime). This system does NOT use UTC.
    Migration to UTC would require schema changes and careful date handling across the codebase.

    Args:
        user_input: Free-form Ukrainian text describing one or more expenses.
        feedback: Optional validation feedback from a prior failed attempt.
                 When provided, appended to user_input to guide LLM retry.
        chain: Optional LangChain chain to use (for testing only; allows injection of mock).
               Defaults to lazily-initialized module chain from _get_chain().
               DO NOT use in production; use only in unit tests to inject test doubles.

    Returns:
        List of Expense objects (one per detected purchase).

    Raises:
        ValueError: If LLM response is malformed or validation fails.
    """
    logger.debug(f"extract_expense called with input: {user_input}, feedback: {feedback}")
    now = datetime.now()

    # Append feedback to user_input if provided
    expense_input = user_input
    if feedback:
        expense_input = f"{user_input}\n\nValidation feedback: {feedback}\n\nPlease retry and correct the issue."

    active_chain = chain or _get_chain()
    logger.debug(f"Invoking chain with received_at={now.isoformat()}, user_input={expense_input}")
    try:
        result = active_chain.invoke({"received_at": now.isoformat(), "user_input": expense_input})

        # Validate output structure
        logger.debug(f"Chain returned type: {type(result).__name__}")
        if not isinstance(result, ExpenseList):
            logger.error(f"Unexpected chain output type: expected ExpenseList, got {type(result).__name__}")
            raise ValueError(f"Expected ExpenseList, got {type(result).__name__}")

        expenses = result.expenses
        logger.debug(f"Extracted {len(expenses)} expense(s)")

        # Log expense details for debugging
        for i, expense in enumerate(expenses):
            logger.debug(
                f"  Expense {i+1}: amount={expense.amount}, category={expense.category}, "
                f"confidence={expense.confidence}, datetime={expense.datetime}"
            )

        _add_langsmith_metadata(expenses)
        return expenses
    except Exception as e:
        logger.error(f"Chain invocation failed: {e}", exc_info=True)
        raise


def submit_feedback(
    run_id: str,
    expected_category: str,
    expected_amount: Optional[float],
    notes: str = "",
) -> None:
    """Submit a correction to Langsmith for evaluator training.

    Non-blocking: errors are logged and swallowed so callers are unaffected.
    """
    client = _get_langsmith_client()
    if client is None:
        logger.debug("Langsmith not configured; feedback submission skipped")
        return
    try:
        client.create_feedback(
            run_id=run_id,
            key="correction",
            score=0,
            value={
                "expected_category": expected_category,
                "expected_amount": expected_amount,
                "notes": notes,
            },
        )
        logger.info(f"Feedback submitted for run {run_id}")
    except Exception as e:
        logger.warning(f"Langsmith feedback submission failed: {e}")
