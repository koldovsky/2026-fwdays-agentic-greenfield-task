"""Reasoning evals: test that the parser agent correctly parses expenses.

These are LIVE API tests (call actual OpenAI API). Run with:
    pytest tests/evals/test_reasoning.py -v

To skip in CI:
    pytest -m "not live_api" tests/
"""

import pytest
from datetime import datetime, timezone

from src.agent import extract_expense
from src.validator import validate_expense

# Test cases: (input, expected_gold_values)
# Gold values define the expected extraction for each test case
TEST_CASES = [
    {
        "id": 1,
        "input": "купив каву за 50",
        "gold": {
            "amount": 50,
            "category": "Кафе/Ресторани",
            "confidence_min": 0.8,  # Agent should be confident
        },
    },
    {
        "id": 2,
        "input": "на бенз 200 грн",
        "gold": {
            "amount": 200,
            "category": "Транспорт",
            "confidence_min": 0.8,
        },
    },
    {
        "id": 3,
        "input": "купив продукти за 150",
        "gold": {
            "amount": 150,
            "category": "Продукти",
            "confidence_min": 0.8,
        },
    },
    {
        "id": 4,
        "input": "кіно 120",
        "gold": {
            "amount": 120,
            "category": "Розваги",
            "confidence_min": 0.75,
        },
    },
    {
        "id": 5,
        "input": "таксі до роботи 80",
        "gold": {
            "amount": 80,
            "category": "Транспорт",
            "confidence_min": 0.8,
        },
    },
    {
        "id": 6,
        "input": "аптека 45",
        "gold": {
            "amount": 45,
            "category": "Здоров'я",
            "confidence_min": 0.8,
        },
    },
    {
        "id": 7,
        "input": "купив сорочку 300",
        "gold": {
            "amount": 300,
            "category": "Покупки",
            "confidence_min": 0.8,
        },
    },
    {
        "id": 8,
        "input": "комуналка 500 грн",
        "gold": {
            "amount": 500,
            "category": "Комуналки",
            "confidence_min": 0.8,
        },
    },
    # Note: former eval_9 ("витратив на дивну річ", amount=None) removed.
    # Under the consolidated validation model (expense-model-validation capability),
    # a null amount is a hard-fail at Expense construction, so vague no-amount input
    # is no longer a supported agent extraction case. The null-amount hard-fail path
    # is covered by tests/test_integration.py::test_integration_hard_fail_vague_input.
    {
        "id": 10,
        "input": "ресторан 420",
        "gold": {
            "amount": 420,
            "category": "Кафе/Ресторани",
            "confidence_min": 0.8,
        },
    },
]


@pytest.mark.live_api
@pytest.mark.parametrize("test_case", TEST_CASES, ids=lambda tc: f"eval_{tc['id']}")
def test_agent_reasoning(test_case):
    """
    Test that the agent correctly extracts an expense.

    The agent should:
    1. Extract the correct amount
    2. Map to the correct canonical category
    3. Have appropriate confidence score
    4. Pass the validator (no hard-fail)
    """
    user_input = test_case["input"]
    gold = test_case["gold"]

    # Extract (returns a list, take the first expense)
    expenses = extract_expense(user_input)
    assert len(expenses) >= 1, f"Expected at least one expense, got {len(expenses)}"
    expense = expenses[0]

    # Validate
    validation = validate_expense(expense)

    # Check: no hard-fail
    assert validation.valid, f"Validation failed: {validation.errors}"

    # Check: amount matches gold (or both are None)
    if "amount" in gold:
        gold_amount = gold["amount"]
        if gold_amount is None:
            assert expense.amount is None, f"Expected null amount, got {expense.amount}"
        else:
            assert expense.amount == gold_amount, f"Expected {gold_amount}, got {expense.amount}"

    # Check: category matches gold
    assert (
        expense.category == gold["category"]
    ), f"Expected category {gold['category']}, got {expense.category}"

    # Check: confidence is in expected range
    if "confidence_min" in gold:
        assert (
            expense.confidence >= gold["confidence_min"]
        ), f"Confidence {expense.confidence} < min {gold['confidence_min']}"
    if "confidence_max" in gold:
        assert (
            expense.confidence <= gold["confidence_max"]
        ), f"Confidence {expense.confidence} > max {gold['confidence_max']}"

    # Check: datetime is valid ISO 8601 and not in future (with 4-hour buffer for timezone variance)
    try:
        from datetime import timedelta
        parsed_dt = datetime.fromisoformat(expense.datetime)
        # Ensure both are naive for comparison
        if parsed_dt.tzinfo is not None:
            parsed_dt = parsed_dt.replace(tzinfo=None)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        buffer = timedelta(hours=4)
        assert parsed_dt <= now + buffer, f"Datetime {parsed_dt} too far in the future (now={now})"
    except ValueError:
        pytest.fail(f"Invalid datetime format: {expense.datetime}")

    # Check: description is non-empty
    assert expense.description and expense.description.strip(), "Description should be non-empty"


# Aggregate pass rate metric for manual review
@pytest.mark.live_api
def test_eval_pass_rate():
    """
    Run all evals and report pass rate (for debugging).

    This is not a strict test; it's informational.
    In CI, you'd set a target like >= 80% pass rate.
    """
    passed = 0
    failed = 0

    for test_case in TEST_CASES:
        user_input = test_case["input"]
        gold = test_case["gold"]

        try:
            expenses = extract_expense(user_input)
            if not expenses:
                failed += 1
                print(f"FAIL (no expenses): {user_input}")
                continue
            expense = expenses[0]
            validation = validate_expense(expense)

            if not validation.valid:
                failed += 1
                print(f"FAIL (validation): {user_input} -> {validation.errors}")
            elif gold.get("amount") is not None and expense.amount != gold["amount"]:
                failed += 1
                print(f"FAIL (amount): {user_input} -> {expense.amount} (expected {gold['amount']})")
            elif expense.category != gold["category"]:
                failed += 1
                print(f"FAIL (category): {user_input} -> {expense.category} (expected {gold['category']})")
            else:
                passed += 1
                print(f"PASS: {user_input}")
        except Exception as e:
            failed += 1
            print(f"ERROR: {user_input} -> {e}")

    total = passed + failed
    pass_rate = (passed / total * 100) if total > 0 else 0
    print(f"\n--- Eval Summary ---\nPassed: {passed}/{total} ({pass_rate:.1f}%)\n")
    assert passed >= (total * 0.8), f"Pass rate {pass_rate:.1f}% < 80%"
