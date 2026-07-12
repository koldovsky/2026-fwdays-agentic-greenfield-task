## MODIFIED Requirements

### Requirement: extract_expense accepts optional chain parameter
`extract_expense(user_input, feedback=None, chain=None)` SHALL accept an optional `chain` parameter. When `chain` is provided, it SHALL be used directly for LLM invocation. When `chain` is `None`, the function SHALL use the lazily-initialized module singleton chain. The LLM chain SHALL NOT be constructed at module import time.

#### Scenario: Default behavior uses lazily-initialized chain
- **WHEN** `extract_expense("купив каву за 50")` is called with no `chain` argument
- **THEN** the function invokes the module-level chain (built on first call, not at import)

#### Scenario: Injected chain is used directly
- **WHEN** `extract_expense("text", chain=fake_chain)` is called with a fake chain
- **THEN** `fake_chain.invoke(...)` is called instead of the real LLM chain

#### Scenario: Importing src.agent has no side effects
- **WHEN** `import src.agent` is executed without OPENAI_API_KEY set
- **THEN** no exception is raised (chain construction is deferred)

#### Scenario: Chain is constructed on first extract_expense call
- **WHEN** `extract_expense(...)` is called for the first time
- **THEN** the chain is constructed using `OPENAI_API_KEY` from environment at that moment

#### Scenario: Chain singleton is reused across calls
- **WHEN** `extract_expense(...)` is called multiple times with no injected chain
- **THEN** the same chain instance is reused (constructed only once)
