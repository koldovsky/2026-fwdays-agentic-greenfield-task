## 1. Dependencies & Setup

- [x] 1.1 Add `langsmith>=0.1,<0.2` to `requirements.txt`
- [x] 1.2 Run `pip install -r requirements.txt` and verify Langsmith installs without conflicts
- [x] 1.3 Create `data/eval_reference.json` with at least 20 test cases covering common and edge cases (format: `[{"input": "...", "expected_category": "...", "expected_amount": ...}, ...]`)

## 2. Langsmith Client Initialization

- [x] 2.1 Import `langsmith.Client` in `src/agent.py`
- [x] 2.2 Create a module-level singleton: `langsmith_client = None`; initialize in a function `_init_langsmith_client()` that checks `LANGSMITH_API_KEY` and `LANGSMITH_PROJECT` environment variables
- [x] 2.3 Call `_init_langsmith_client()` at module load time; if credentials are missing or Langsmith API fails, log a warning and set `langsmith_client = None`
- [x] 2.4 Verify tests still pass; client initialization does not block test execution

## 3. Langsmith Tracing Integration

- [x] 3.1 Import `LangsmithTracer` from `langsmith.integrations.langchain`
- [x] 3.2 Modify the LCEL chain construction in `extract_expense()`: wrap the chain with `LangsmithTracer()` callback if `langsmith_client` is not None
- [x] 3.3 After chain invocation, extract the list of `Expense` objects returned by the chain
- [x] 3.4 If `langsmith_client` is active, add metadata to the Langsmith run: `amounts`, `categories`, `confidences` (as arrays)
- [x] 3.5 Test the parser with Langsmith enabled (mock or sandbox project); verify traces appear in Langsmith UI

## 4. Custom Evaluators Implementation

- [x] 4.1 Create `src/evals.py` with three evaluator functions:
  - `evaluate_category_accuracy(run, expected_category)` — compares extracted category to expected
  - `evaluate_amount_accuracy(run, expected_amount, tolerance=1)` — compares extracted amount to expected within tolerance
  - `evaluate_confidence_calibration(run, is_correct)` — checks if confidence level is appropriate for correctness
- [x] 4.2 Load `data/eval_reference.json` in each evaluator; implement lookup by input text
- [x] 4.3 Register evaluators with Langsmith's evaluator registry (if applicable per Langsmith API)
- [x] 4.4 Test evaluators locally with sample traced runs; verify scores are sensible

## 5. Feedback Submission API

- [x] 5.1 Add a function `submit_feedback(run_id, user_input, expected_category, expected_amount, notes="")` to `src/agent.py`
- [x] 5.2 Use `langsmith_client.create_feedback(...)` to log the correction
- [x] 5.3 Ensure feedback submission is non-blocking and handles Langsmith API errors gracefully
- [x] 5.4 Write a simple test for `submit_feedback()` (mock Langsmith client)

## 6. Testing & Validation

- [x] 6.1 Update `tests/test_agent_datetime.py` to mock `langsmith_client` if present (no-op mock if Langsmith is disabled)
- [x] 6.2 Update `tests/test_integration.py` similarly to handle mocked Langsmith client
- [x] 6.3 Run `pytest tests/` and confirm all tests pass
- [x] 6.4 Run `pytest tests/evals/test_reasoning.py` and confirm eval pass rate is ≥80% (no regression)
- [x] 6.5 Manually test the bot end-to-end with Langsmith enabled (use sandbox project or local mock); verify traces and metadata are captured

## 7. Documentation & Cleanup

- [x] 7.1 Add comments in `src/agent.py` explaining Langsmith initialization and tracing callback
- [x] 7.2 Document in `README.md` how to enable Langsmith tracing (set `LANGSMITH_API_KEY` and `LANGSMITH_PROJECT`)
- [x] 7.3 Verify `src/validator.py`, `src/storage.py`, `src/bot.py`, `src/processor.py` have zero changes (no unintended side effects)
- [x] 7.4 Clean up any debug prints or temporary code
