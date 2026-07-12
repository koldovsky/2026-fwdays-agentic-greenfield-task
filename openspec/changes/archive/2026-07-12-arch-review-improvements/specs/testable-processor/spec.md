## ADDED Requirements

### Requirement: process_expense accepts injectable extract_fn and validate_fn
`process_expense(raw_text, extract_fn=extract_expense, validate_fn=validate_expenses)` SHALL accept optional `extract_fn` and `validate_fn` parameters. When not provided, they SHALL default to the real `extract_expense` and `validate_expenses` implementations. The retry loop SHALL call `extract_fn(text, feedback=feedback)` and `validate_fn(expenses)` instead of the hardcoded imports.

#### Scenario: Default behavior unchanged
- **WHEN** `process_expense("купив каву за 50")` is called with no extra arguments
- **THEN** it uses the real LangChain agent and validator (same as current behavior)

#### Scenario: Fake extractor injected for retry test
- **WHEN** `process_expense("text", extract_fn=fake_extractor, validate_fn=fake_validator)` is called
- **THEN** the retry loop calls `fake_extractor` and `fake_validator` on each attempt

### Requirement: Retry policy is testable without LLM or DB
Tests for the retry loop SHALL be able to inject fake `extract_fn` and `validate_fn` to drive the retry path without any LLM call or database connection.

#### Scenario: Retry on hard-fail, succeed on second attempt
- **WHEN** `extract_fn` returns invalid expenses on attempt 1 and valid expenses on attempt 2
- **THEN** `process_expense` returns `ProcessExpenseResult(success=True)` after 2 attempts

#### Scenario: Max retries exceeded returns failure
- **WHEN** `extract_fn` always returns expenses that fail validation across all attempts
- **THEN** `process_expense` returns `ProcessExpenseResult(success=False)` after `MAX_RETRIES` attempts

#### Scenario: Exception in extract_fn triggers retry
- **WHEN** `extract_fn` raises an exception on attempt 1 and succeeds on attempt 2
- **THEN** `process_expense` retries and returns `ProcessExpenseResult(success=True)`
