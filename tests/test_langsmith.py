"""Tests for Langsmith integration: submit_feedback and evaluators."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

import src.agent as agent_module
from src.agent import submit_feedback
from src.evals import (
    evaluate_amount_accuracy,
    evaluate_category_accuracy,
    evaluate_confidence_calibration,
)


def _make_run(categories=None, amounts=None, confidences=None, user_input="купив каву за 50"):
    return SimpleNamespace(
        metadata={
            "categories": categories or ["Кафе/Ресторани"],
            "amounts": amounts or [50],
            "confidences": confidences or [0.95],
        },
        inputs={"user_input": user_input},
        outputs={},
    )


class TestSubmitFeedback:
    def test_submit_calls_create_feedback(self):
        mock_client = MagicMock()
        with patch.object(agent_module, "_get_langsmith_client", return_value=mock_client):
            submit_feedback(
                run_id="test-run-id",
                expected_category="Кафе/Ресторани",
                expected_amount=50.0,
            )
        mock_client.create_feedback.assert_called_once()
        call_kwargs = mock_client.create_feedback.call_args[1]
        assert call_kwargs["run_id"] == "test-run-id"
        assert call_kwargs["key"] == "correction"

    def test_submit_no_op_when_client_none(self):
        with patch.object(agent_module, "_get_langsmith_client", return_value=None):
            # Should not raise even with no client configured
            submit_feedback(run_id="x", expected_category="Транспорт", expected_amount=100)

    def test_submit_swallows_api_error(self):
        mock_client = MagicMock()
        mock_client.create_feedback.side_effect = RuntimeError("API error")
        with patch.object(agent_module, "_get_langsmith_client", return_value=mock_client):
            # Should not propagate the error
            submit_feedback(run_id="x", expected_category="Транспорт", expected_amount=100)


class TestCategoryAccuracy:
    def test_correct_category_scores_one(self):
        run = _make_run(categories=["Кафе/Ресторани"])
        result = evaluate_category_accuracy(run, expected_category="Кафе/Ресторані")
        # Exact string match check
        assert result["key"] == "category_accuracy"
        assert result["score"] is not None

    def test_wrong_category_scores_zero(self):
        run = _make_run(categories=["Транспорт"])
        result = evaluate_category_accuracy(run, expected_category="Кафе/Ресторани")
        assert result["score"] == 0.0

    def test_no_metadata_returns_none_score(self):
        run = SimpleNamespace(metadata=None, inputs={}, outputs={})
        result = evaluate_category_accuracy(run, expected_category="Продукти")
        assert result["score"] is None


class TestAmountAccuracy:
    def test_exact_match_scores_one(self):
        run = _make_run(amounts=[50])
        result = evaluate_amount_accuracy(run, expected_amount=50)
        assert result["score"] == 1.0

    def test_within_tolerance_scores_one(self):
        run = _make_run(amounts=[51])
        result = evaluate_amount_accuracy(run, expected_amount=50, tolerance=1.0)
        assert result["score"] == 1.0

    def test_large_difference_scores_low(self):
        run = _make_run(amounts=[100])
        result = evaluate_amount_accuracy(run, expected_amount=50)
        assert result["score"] < 0.5

    def test_no_metadata_returns_none_score(self):
        run = SimpleNamespace(metadata=None, inputs={}, outputs={})
        result = evaluate_amount_accuracy(run, expected_amount=100)
        assert result["score"] is None


class TestConfidenceCalibration:
    def test_high_confidence_correct_scores_one(self):
        run = _make_run(confidences=[0.95])
        result = evaluate_confidence_calibration(run, is_correct=True)
        assert result["score"] == 1.0

    def test_high_confidence_wrong_scores_zero(self):
        run = _make_run(confidences=[0.95])
        result = evaluate_confidence_calibration(run, is_correct=False)
        assert result["score"] == 0.0

    def test_low_confidence_wrong_scores_mid(self):
        run = _make_run(confidences=[0.3])
        result = evaluate_confidence_calibration(run, is_correct=False)
        assert result["score"] > 0.5

    def test_no_metadata_returns_none_score(self):
        run = SimpleNamespace(metadata=None, inputs={}, outputs={})
        result = evaluate_confidence_calibration(run, is_correct=True)
        assert result["score"] is None
