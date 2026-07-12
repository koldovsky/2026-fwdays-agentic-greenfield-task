## 1. Update Parser Agent (agent.py)

- [x] 1.1 Update `SYSTEM_PROMPT` to instruct the LLM to return a JSON **array** of expense objects (even for single-expense input), and add a few-shot example for multi-expense and combined-total inputs
- [x] 1.2 Update `extract_expense` in `src/agent.py` to parse the LLM response as a list and return `list[Expense]` instead of a single `Expense`
- [x] 1.3 Add a few-shot example in the system prompt showing "купив пиво і воду за 30" → single expense (to prevent over-splitting combined totals)

## 2. Update Validator (validator.py)

- [x] 2.1 Add a `validate_expenses` function in `src/validator.py` that accepts `list[Expense]`, validates each item independently, accumulates all errors with their index, and returns a combined `ValidationResult`
- [x] 2.2 Keep the existing `validate_expense` (single-item) unchanged so it can be reused by the new multi-expense validator

## 3. Update Processor (processor.py)

- [x] 3.1 Update `process_expense` in `src/processor.py` to call the updated `extract_expense` (which now returns `list[Expense]`) and the new `validate_expenses`
- [x] 3.2 Update the retry loop to pass combined array-level validation feedback back to the agent on hard-fail
- [x] 3.3 Update `ProcessExpenseResult` usage so `result.expense` returns the list (or the first element for backward compat); adjust `result.message` to show count of expenses stored

## 4. Update Models (models.py)

- [x] 4.1 Update `ProcessExpenseResult` in `src/models.py`: change `expense: Optional[Expense]` to `expenses: list[Expense]` and add a backward-compat property `expense` that returns `expenses[0] if expenses else None`

## 5. Update Storage (storage.py)

- [x] 5.1 Add a `store_expenses` function in `src/storage.py` that accepts `list[Expense]` and an optional `validation_errors` string, and calls `store_expense` in a loop, returning a list of inserted IDs

## 6. Update Bot / Entry Point

- [x] 6.1 Update `src/bot.py` (or wherever `process_expense` result is consumed) to call `store_expenses` with the list from the result instead of a single `store_expense` call

## 7. Update Evals and Tests

- [x] 7.1 Wrap existing gold standard fixtures in `[...]` arrays to match the new return type
- [x] 7.2 Add integration test in `tests/test_integration.py` for a two-expense input: assert the result contains two expense objects with correct amounts and categories
- [x] 7.3 Add integration test for a combined-total input ("купив пиво і воду за 30"): assert result contains exactly one expense object
