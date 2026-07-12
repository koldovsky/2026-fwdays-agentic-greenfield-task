## ADDED Requirements

### Requirement: Langsmith client initialization with environment configuration

The parser module SHALL initialize a Langsmith client on startup, conditionally enabled via environment variables `LANGSMITH_API_KEY` and `LANGSMITH_PROJECT`.

#### Scenario: Langsmith enabled with valid credentials
- **WHEN** `LANGSMITH_API_KEY` and `LANGSMITH_PROJECT` are set in the environment
- **THEN** the parser SHALL initialize a Langsmith `Client` instance and store it for use in tracing

#### Scenario: Langsmith disabled when credentials missing
- **WHEN** `LANGSMITH_API_KEY` or `LANGSMITH_PROJECT` is not set
- **THEN** the parser SHALL gracefully skip Langsmith initialization and proceed with normal parsing (no tracing)

#### Scenario: Langsmith initialization does not block parsing
- **WHEN** Langsmith API is unreachable or returns an error during client initialization
- **THEN** the parser SHALL log a warning and fall back to non-traced parsing (graceful degradation)

---

### Requirement: LangChain parser chain wrapped with Langsmith tracing callback

The LangChain parser chain (defined in `langchain-expense-parser` capability) SHALL be instrumented with a Langsmith `LangsmithTracer` callback that captures all LLM calls, prompts, responses, and token usage.

#### Scenario: Chain execution captured by Langsmith tracer
- **WHEN** the parser calls `chain.invoke(...)` with Langsmith enabled
- **THEN** Langsmith SHALL record the full chain execution including input prompt, LLM response, and token counts

#### Scenario: Multiple expenses traced independently
- **WHEN** the user inputs a multi-expense request (e.g., "бензин 200, продукти 150") and Langsmith is enabled
- **THEN** Langsmith SHALL trace the single LLM call with its structured output containing all expenses

#### Scenario: Tracing includes expense structure
- **WHEN** the LLM returns a structured expense array via `ExpenseList.expenses`
- **THEN** Langsmith SHALL record the full array output and any retry attempts (if `.with_retry()` is invoked)

---

### Requirement: Langsmith run metadata includes expense data

Each Langsmith trace run SHALL include custom metadata that captures the extracted expenses, enabling evaluators to compare predicted vs. expected values.

#### Scenario: Run metadata contains extracted amounts
- **WHEN** the parser extracts an expense with amount=50, category="Кафе/Ресторани"
- **THEN** Langsmith run metadata SHALL include fields `amounts=[50]` and `categories=["Кафе/Ресторани"]`

#### Scenario: Metadata for multi-expense runs
- **WHEN** the parser extracts two expenses with amounts 200 and 150
- **THEN** Langsmith run metadata SHALL include `amounts=[200, 150]` and corresponding categories

#### Scenario: Metadata includes confidence scores
- **WHEN** expenses are extracted with confidence scores (e.g., 0.95, 0.88)
- **THEN** Langsmith run metadata SHALL include `confidences=[0.95, 0.88]`
