## Why

The codebase has four architectural weaknesses identified in the 2026-06-29 review: validation rules duplicated across two modules (divergence risk), module-level LLM chain construction causing import-time side effects, a connection-per-call storage pattern with no testability seam, and a processor whose retry logic is coupled to live dependencies. Fixing these now establishes invariants and testability seams before the codebase grows further.

## What Changes

- **models.py**: Move all hard-fail validation rules into the Pydantic `Expense` model. Make `category` a required non-optional field with enum validation (was `Optional[str]`). Make `amount` required non-null with `> 0` enforced at construction.
- **validator.py**: Remove duplicated hard-fail rule checks. Reduce to soft-fail only: `confidence < CONFIDENCE_THRESHOLD` flag + `ValidationResult` wrapping.
- **agent.py**: Replace module-level `llm`/`prompt`/`chain` globals with a `_get_chain()` lazy initializer. Add optional `chain=` parameter to `extract_expense()` for test injection.
- **storage.py**: Introduce `ExpenseStore` class with injectable `conn_factory` parameter. All storage functions become methods. Default factory uses real psycopg2 connections.
- **bot.py**: Update to instantiate and use `ExpenseStore`.
- **processor.py**: Make `extract_fn` and `validate_fn` injectable (defaulting to real implementations). Enables retry-policy unit tests without LLM or DB.

## Capabilities

### New Capabilities

- `expense-model-validation`: Hard-fail validation rules consolidated into the Pydantic `Expense` model — construction of an `Expense` object guarantees all hard rules passed.
- `testable-storage`: `ExpenseStore` class with injectable connection factory, enabling unit tests without a live PostgreSQL instance.
- `testable-processor`: Injectable `extract_fn`/`validate_fn` in processor, enabling retry-policy unit tests without LLM or DB dependencies.

### Modified Capabilities

- `langchain-expense-parser`: `extract_expense()` gains an optional `chain=` parameter; chain construction is deferred to first call. No behavior change for callers using defaults.

## Impact

- `src/models.py`: `Expense.category` type changes from `Optional[str]` to required `str` with enum validator. `Expense.amount` changes from `Optional[float]` to required `float > 0`. **BREAKING** for any code constructing `Expense` with `None` category/amount.
- `src/validator.py`: Rules 1–6 removed (now enforced by Pydantic). Only soft-fail rule 7 remains.
- `src/agent.py`: No external API change. Import is now side-effect free.
- `src/storage.py`: `store_expense`, `get_all_expenses`, etc. become `ExpenseStore` methods. Callers must use an instance.
- `src/bot.py`: Must instantiate `ExpenseStore` and pass to processor or call directly.
- `src/processor.py`: `process_expense` gains optional `extract_fn`/`validate_fn` params.
- `tests/`: Existing tests updated to match new interfaces; new unit tests added for storage and processor seams.
