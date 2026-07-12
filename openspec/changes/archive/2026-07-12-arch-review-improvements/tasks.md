## 1. Consolidate Validation into Pydantic Model (Candidate 3)

- [x] 1.1 Add `@field_validator("category")` to `Expense` in `src/models.py` that rejects `None` and values not in `VALID_CATEGORIES`
- [x] 1.2 Add `@field_validator("amount")` to `Expense` that rejects `None` (keeping `Optional[float]` type for LLM null output)
- [x] 1.3 Remove hard-fail rules 1–6 from `validate_expense()` in `src/validator.py`; keep only soft-fail rule 7 (confidence < CONFIDENCE_THRESHOLD)
- [x] 1.4 Remove hard-fail rules from `validate_expenses()` in `src/validator.py`; keep only soft-fail aggregation
- [x] 1.5 Update any tests that construct `Expense(category=None)` or `Expense(amount=None)` to use valid values or expect `ValidationError`
- [x] 1.6 Run full test suite and confirm all tests pass

## 2. Lazy Chain Initialization in agent.py (Candidate 4)

- [x] 2.1 Remove module-level `llm`, `prompt`, `chain` construction from `src/agent.py`
- [x] 2.2 Add `_chain = None` module variable and `_get_chain()` function that builds and caches the chain on first call
- [x] 2.3 Add `chain=None` parameter to `extract_expense()`; use `chain or _get_chain()` internally
- [x] 2.4 Update existing tests that use `@patch("src.agent.chain")` to inject a fake chain via the `chain=` parameter instead
- [x] 2.5 Verify that `import src.agent` does not raise even when `OPENAI_API_KEY` is unset
- [x] 2.6 Run full test suite and confirm all tests pass

## 3. ExpenseStore Class in storage.py (Candidate 1)

- [x] 3.1 Create `ExpenseStore` class in `src/storage.py` with `__init__(self, conn_factory=None)` (default wraps `psycopg2.connect(DATABASE_URL)`)
- [x] 3.2 Migrate `store_expense` to `ExpenseStore.store_expense` method
- [x] 3.3 Migrate `store_expenses` to `ExpenseStore.store_expenses` method
- [x] 3.4 Migrate `get_all_expenses` to `ExpenseStore.get_all_expenses` method
- [x] 3.5 Migrate `get_expenses_by_category` to `ExpenseStore.get_expenses_by_category` method
- [x] 3.6 Migrate `get_total_expense` to `ExpenseStore.get_total_expense` method
- [x] 3.7 Migrate `log_validation_failure` to `ExpenseStore.log_validation_failure` method
- [x] 3.8 Remove module-level wrapper functions (all call sites updated in this change)
- [x] 3.9 Update `src/bot.py` to instantiate `ExpenseStore()` and use it for all storage calls
- [x] 3.10 Update integration tests to use `ExpenseStore` instance
- [x] 3.11 Write unit tests for `ExpenseStore` methods using a `FakeConnection` (no live DB required)
- [x] 3.12 Run full test suite and confirm all tests pass

## 4. Injectable Dependencies in processor.py (Candidate 2)

- [x] 4.1 Add `extract_fn=extract_expense` and `validate_fn=validate_expenses` parameters to `process_expense()` in `src/processor.py`
- [x] 4.2 Replace hardcoded `extract_expense(...)` and `validate_expenses(...)` calls inside the retry loop with `extract_fn(...)` and `validate_fn(...)`
- [x] 4.3 Write unit test: retry succeeds on second attempt (inject fake extractor that fails once then succeeds)
- [x] 4.4 Write unit test: max retries exceeded returns `ProcessExpenseResult(success=False)` (inject always-failing extractor)
- [x] 4.5 Write unit test: exception in `extract_fn` triggers retry and feedback
- [x] 4.6 Run full test suite and confirm all tests pass
