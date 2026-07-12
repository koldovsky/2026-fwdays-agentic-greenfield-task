## Context

The Voice Expense Tracker has 6 modules in `src/`. Three of them have testability gaps identified in the 2026-06-29 architecture review:
- `models.py` + `validator.py`: hard-fail validation rules duplicated in both, creating divergence risk
- `agent.py`: LLM chain built at import time, requiring `OPENAI_API_KEY` even in tests
- `storage.py`: connection-per-call pattern, no seam for test doubles
- `processor.py`: retry logic coupled to live agent and validator, not independently testable

The existing test suite relies on `@patch("src.agent.chain")` and a live PostgreSQL for integration tests.

## Goals / Non-Goals

**Goals:**
- Single source of truth for each validation rule (either Pydantic or validator, not both)
- Import `src.agent` without side effects (no API key required at import time)
- `ExpenseStore` class with injectable factory enabling unit tests with no DB
- `process_expense` with injectable `extract_fn`/`validate_fn` enabling retry-policy unit tests
- All existing tests continue to pass; new unit tests are added for each seam

**Non-Goals:**
- Changing validation semantics (rules stay the same, just consolidated)
- Adding a real connection pool (the injectable factory is the seam; pooling is a future concern)
- Changing the Telegram bot's external behavior
- Migrating from PostgreSQL to another database

## Decisions

### D1: Move all hard-fail rules into Pydantic `Expense` model

**Decision**: `category` becomes `str` (required) with a `@field_validator` checking membership in `VALID_CATEGORIES`. `amount` stays `Optional[float]` at the model level but the validator rejects `None` and `<= 0` — or alternatively, `amount` becomes `float` with `gt=0` via `Field`. `validator.py` drops rules 1–6 and keeps only rule 7 (soft-fail confidence check).

**Why over alternative (keep validator.py as-is)**: An `Expense` object that passes construction is already hard-rule-clean. Downstream code (processor, storage, evals) never needs to re-check amount/category/datetime. Eliminates the divergence risk entirely.

**Note on `amount` type**: Keep `amount: Optional[float]` in the model to allow the LLM to return `null` for vague input. The Pydantic validator raises `ValueError` if `None` (hard-fail), which triggers agent retry. This matches existing behavior — the LLM is allowed to return null, but the checker rejects it.

### D2: Lazy chain initialization in `agent.py`

**Decision**: Replace module-level `llm`, `prompt`, `chain` globals with a `_chain: Optional[...]` singleton and `_get_chain()` function that builds on first call. `extract_expense()` gains `chain=None` parameter; when provided, it bypasses `_get_chain()`.

**Why over alternative (constructor injection via class)**: The function-based interface is simpler and matches the existing call sites. A class would require refactoring all callers. The `chain=` default-None param is the minimal change.

**Why over alternative (keep `@patch`)**: `@patch` is fragile to renames. The param injection approach lets tests pass `FakeChain()` directly without any patching.

### D3: `ExpenseStore` class with injectable `conn_factory`

**Decision**: `storage.py` exposes an `ExpenseStore` class. Constructor accepts `conn_factory: Callable[[], Connection] = _default_factory` where `_default_factory` wraps `psycopg2.connect(DATABASE_URL)`. All current module-level functions become instance methods. Module-level functions are preserved as thin wrappers for backward compatibility (deprecated, removed in a follow-up).

**Why over alternative (pass connection as param to each function)**: Class-level injection means one factory swap covers all methods. Per-function injection would require every call site to pass a connection.

**Why keep backward-compat wrappers**: `bot.py` and tests call the functions directly today. Updating them is part of this change, but the wrappers reduce the blast radius if any call site is missed.

### D4: Injectable `extract_fn`/`validate_fn` in `processor.py`

**Decision**: `process_expense(raw_text, extract_fn=extract_expense, validate_fn=validate_expenses)`. No class needed at this stage — default arguments are the seam. Tests pass `extract_fn=lambda text, feedback: [...]` and `validate_fn=lambda expenses: ValidationResult(valid=False, ...)`.

**Why over alternative (`ExpenseIngestion` class)**: The function interface is simpler. The class adds no value unless the retry policy needs to be configured per-instance (not a current requirement).

## Risks / Trade-offs

- **BREAKING: `Expense.category` type change** → Any code constructing `Expense(category=None)` breaks. Mitigation: audit all construction sites (LLM output, tests) before merging. The LLM prompt already instructs category to be one of 8 values; `null` category will trigger retry (intended behavior).
- **Backward-compat wrappers in storage.py add dead code** → Remove in a follow-up once all call sites are migrated in this change.
- **Lazy chain init is not thread-safe** → The Telegram bot is single-threaded (python-telegram-bot uses asyncio). If threading is ever introduced, wrap `_get_chain()` with a lock. Not a concern for MVP.
- **Test changes required** → Existing `@patch("src.agent.chain")` tests must be updated to use the `chain=` param. Risk of missing a test. Mitigation: run full test suite after each module change.

## Migration Plan

1. `models.py` + `validator.py` (Candidate 3) — no call-site changes except tests constructing `Expense(category=None)`
2. `agent.py` (Candidate 4) — update `@patch` tests to use `chain=` param
3. `storage.py` (Candidate 1) — introduce `ExpenseStore`, update `bot.py`, update integration tests
4. `processor.py` (Candidate 2) — add default params, add new retry-policy unit tests

Rollback: each candidate is an independent commit. Revert the relevant commit to undo.

## Open Questions

- Should `amount: Optional[float]` remain optional in the model (null allowed from LLM, rejected by validator) or become `float` with `gt=0` (construction always fails for null)? Current decision: keep Optional to preserve the LLM's ability to return null for vague input; Pydantic validator rejects None with a hard-fail message.
- Should module-level backward-compat wrappers in `storage.py` be removed in this PR or deferred? Current decision: remove in this PR since all call sites are updated within the same change.
