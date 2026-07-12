"""Custom Langsmith evaluators for expense parsing accuracy."""

import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Thresholds for calibration judgment
_CORRECT_THRESHOLD = 0.8
_HIGH_CONFIDENCE = 0.7
_GOOD_CALIBRATION_SCORE = 1.0
_UNCERTAIN_CALIBRATION_SCORE = 0.5
_APPROPRIATE_CALIBRATION_SCORE = 0.7
_OVERCONFIDENT_SCORE = 0.0

_REFERENCE_PATH = Path(__file__).parent.parent / "data" / "eval_reference.json"
_reference_data: Optional[list[dict]] = None


def _load_reference() -> list[dict]:
    global _reference_data
    if _reference_data is None:
        try:
            _reference_data = json.loads(_REFERENCE_PATH.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"Could not load eval reference data: {e}")
            _reference_data = []
    return _reference_data


def _lookup(user_input: str) -> Optional[dict]:
    """Find reference record by exact input match."""
    for record in _load_reference():
        if record.get("input") == user_input:
            return record
    return None


def evaluate_category_accuracy(run, expected_category: Optional[str] = None) -> dict:
    """Compare extracted category to expected.

    Returns a dict with 'key', 'score', and 'comment' for Langsmith.
    If expected_category is None, looks up by run input in reference dataset.
    """
    metadata = getattr(run, "outputs", {}) or {}
    # Try to get categories from run metadata
    categories = None
    if hasattr(run, "metadata") and run.metadata:
        categories = run.metadata.get("categories")

    if categories is None:
        return {"key": "category_accuracy", "score": None, "comment": "No categories metadata"}

    if expected_category is None:
        inputs = getattr(run, "inputs", {}) or {}
        user_input = inputs.get("user_input") or inputs.get("input", "")
        record = _lookup(user_input)
        if record is None:
            return {"key": "category_accuracy", "score": None, "comment": "Input not in reference dataset"}
        expected_category = record.get("expected_category")

    # Score: fraction of extracted categories matching expected
    matches = sum(1 for c in categories if c == expected_category)
    score = matches / len(categories) if categories else 0.0
    return {
        "key": "category_accuracy",
        "score": score,
        "comment": f"Extracted: {categories}, Expected: {expected_category}",
    }


def evaluate_amount_accuracy(run, expected_amount: Optional[float] = None, tolerance: float = 1.0) -> dict:
    """Compare extracted amount to expected within tolerance.

    Returns a dict with 'key', 'score', and 'comment' for Langsmith.
    If expected_amount is None, looks up by run input in reference dataset.
    """
    amounts = None
    if hasattr(run, "metadata") and run.metadata:
        amounts = run.metadata.get("amounts")

    if amounts is None:
        return {"key": "amount_accuracy", "score": None, "comment": "No amounts metadata"}

    if expected_amount is None:
        inputs = getattr(run, "inputs", {}) or {}
        user_input = inputs.get("user_input") or inputs.get("input", "")
        record = _lookup(user_input)
        if record is None:
            return {"key": "amount_accuracy", "score": None, "comment": "Input not in reference dataset"}
        expected_amount = record.get("expected_amount")

    if expected_amount is None:
        # Expected null means vague input — low or no amount expected
        no_amounts = all(a is None for a in amounts)
        score = 1.0 if no_amounts else 0.0
        return {"key": "amount_accuracy", "score": score, "comment": f"Expected null amount, got: {amounts}"}

    # Score: 1.0 if within tolerance, scaled down by relative error
    extracted = next((a for a in amounts if a is not None), None)
    if extracted is None:
        return {"key": "amount_accuracy", "score": 0.0, "comment": f"No amount extracted, expected: {expected_amount}"}

    diff = abs(extracted - expected_amount)
    if diff <= tolerance:
        score = 1.0
    else:
        score = max(0.0, 1.0 - (diff / max(expected_amount, 1)))
    return {
        "key": "amount_accuracy",
        "score": score,
        "comment": f"Extracted: {extracted}, Expected: {expected_amount}, Diff: {diff}",
    }


def evaluate_confidence_calibration(run, is_correct: Optional[bool] = None) -> dict:
    """Check whether confidence is appropriate given correctness.

    A well-calibrated parser should have high confidence when correct and low when incorrect.
    Returns a dict with 'key', 'score', and 'comment' for Langsmith.
    """
    confidences = None
    if hasattr(run, "metadata") and run.metadata:
        confidences = run.metadata.get("confidences")

    if not confidences:
        return {"key": "confidence_calibration", "score": None, "comment": "No confidence metadata"}

    avg_confidence = sum(confidences) / len(confidences)

    if is_correct is None:
        # Auto-determine correctness from category_accuracy
        cat_eval = evaluate_category_accuracy(run)
        cat_score = cat_eval.get("score")
        is_correct = cat_score is not None and cat_score >= _CORRECT_THRESHOLD

    # Calibration: good if high confidence + correct, or low confidence + wrong
    if is_correct and avg_confidence >= _HIGH_CONFIDENCE:
        score = _GOOD_CALIBRATION_SCORE
        comment = f"Well-calibrated: high confidence ({avg_confidence:.2f}) on correct prediction"
    elif is_correct and avg_confidence < _HIGH_CONFIDENCE:
        score = _UNCERTAIN_CALIBRATION_SCORE
        comment = f"Under-confident: low confidence ({avg_confidence:.2f}) on correct prediction"
    elif not is_correct and avg_confidence < _HIGH_CONFIDENCE:
        score = _APPROPRIATE_CALIBRATION_SCORE
        comment = f"Appropriately uncertain: low confidence ({avg_confidence:.2f}) on incorrect prediction"
    else:
        score = _OVERCONFIDENT_SCORE
        comment = f"Over-confident: high confidence ({avg_confidence:.2f}) on incorrect prediction"

    return {"key": "confidence_calibration", "score": score, "comment": comment}
