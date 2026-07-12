# Capability: Expense Model Validation

## Purpose

Enforce all hard-fail validation rules at `Expense` Pydantic model construction time, so that any existing `Expense` instance is guaranteed valid, leaving `validate_expense()` responsible only for the soft-fail confidence rule.

---

## Requirements

### Requirement: Expense construction enforces all hard-fail rules
The `Expense` Pydantic model SHALL enforce all hard-fail validation rules at construction time. Constructing an `Expense` object that violates any hard rule SHALL raise a `ValidationError`. Any `Expense` instance that exists SHALL be guaranteed to satisfy all hard rules.

#### Scenario: Category not in enum raises at construction
- **WHEN** code constructs `Expense(category="NotACategory", ...)`
- **THEN** Pydantic raises `ValidationError` with a message indicating the invalid category

#### Scenario: Null category raises at construction
- **WHEN** code constructs `Expense(category=None, ...)`
- **THEN** Pydantic raises `ValidationError`

#### Scenario: Valid category constructs successfully
- **WHEN** code constructs `Expense(category="Продукти", amount=50.0, ...)`
- **THEN** the `Expense` object is created without error

#### Scenario: Amount null raises at construction
- **WHEN** code constructs `Expense(amount=None, ...)`
- **THEN** Pydantic raises `ValidationError` with message indicating amount is required

#### Scenario: Amount zero raises at construction
- **WHEN** code constructs `Expense(amount=0, ...)`
- **THEN** Pydantic raises `ValidationError` with message indicating amount must be > 0

#### Scenario: Future datetime raises at construction
- **WHEN** code constructs `Expense(datetime="2099-01-01T00:00:00", ...)`
- **THEN** Pydantic raises `ValidationError` with message indicating datetime cannot be in the future

#### Scenario: Empty description raises at construction
- **WHEN** code constructs `Expense(description="", ...)`
- **THEN** Pydantic raises `ValidationError`

---

### Requirement: validator.py checks only soft-fail confidence rule
`validate_expense()` SHALL only check whether `confidence < CONFIDENCE_THRESHOLD` (soft-fail rule 7). It SHALL NOT re-check hard-fail rules (amount, category, datetime, description, confidence range). It SHALL return `ValidationResult(valid=True)` for any `Expense` object that passes the confidence threshold.

#### Scenario: High-confidence expense passes validation
- **WHEN** `validate_expense()` is called with an `Expense` where `confidence >= 0.7`
- **THEN** returns `ValidationResult(valid=True, errors=[])`

#### Scenario: Low-confidence expense is soft-flagged
- **WHEN** `validate_expense()` is called with an `Expense` where `confidence < 0.7`
- **THEN** returns `ValidationResult(valid=True, errors=["confidence < 0.7 (flagged for review)"])`

#### Scenario: Validator does not re-check hard rules
- **WHEN** `validate_expense()` is called with a valid `Expense` object
- **THEN** it does not perform amount/category/datetime/description checks (those are enforced at construction)
