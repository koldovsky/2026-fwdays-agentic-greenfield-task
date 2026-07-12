## ADDED Requirements

### Requirement: ExpenseStore class with injectable connection factory
`storage.py` SHALL expose an `ExpenseStore` class. The constructor SHALL accept an optional `conn_factory` callable that returns a database connection. When `conn_factory` is not provided, it SHALL default to a factory that calls `psycopg2.connect(DATABASE_URL)`.

#### Scenario: Default factory connects to PostgreSQL
- **WHEN** `ExpenseStore()` is instantiated with no arguments
- **THEN** it uses `psycopg2.connect(DATABASE_URL)` as the connection factory

#### Scenario: Injectable factory used in tests
- **WHEN** `ExpenseStore(conn_factory=fake_conn_factory)` is instantiated
- **THEN** all methods use `fake_conn_factory()` to obtain connections instead of psycopg2

### Requirement: All storage operations are instance methods on ExpenseStore
`ExpenseStore` SHALL expose the following methods: `store_expense(expense, validation_errors=None)`, `store_expenses(expenses, validation_errors=None)`, `get_all_expenses()`, `get_expenses_by_category(category)`, `get_total_expense()`, `log_validation_failure(user_input, error_message, attempt_number)`. Each method SHALL open a connection via `conn_factory`, perform the operation, and close the connection.

#### Scenario: store_expense saves to database
- **WHEN** `store.store_expense(expense)` is called on an `ExpenseStore` with a fake factory
- **THEN** the fake connection receives the correct INSERT statement and parameters

#### Scenario: get_all_expenses returns list
- **WHEN** `store.get_all_expenses()` is called on an `ExpenseStore` with a fake factory
- **THEN** returns the rows from the fake connection's cursor

#### Scenario: log_validation_failure writes to validation_logs table
- **WHEN** `store.log_validation_failure("input", "error", 1)` is called
- **THEN** the fake connection receives INSERT INTO validation_logs with correct parameters

### Requirement: Storage unit tests require no live database
Tests for `ExpenseStore` methods SHALL be able to run without a PostgreSQL instance by injecting a fake connection factory.

#### Scenario: Unit test with fake connection passes without DB
- **WHEN** a test instantiates `ExpenseStore(conn_factory=lambda: FakeConnection())`
- **THEN** the test runs and asserts without connecting to PostgreSQL
