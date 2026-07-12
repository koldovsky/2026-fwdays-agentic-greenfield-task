## ADDED Requirements

### Requirement: LangChain LCEL chain replaces direct OpenAI SDK calls
The expense parser SHALL use a LangChain Expression Language (LCEL) chain composed of `ChatPromptTemplate | ChatOpenAI.with_structured_output(ExpenseList)` instead of the direct `openai` SDK client.

#### Scenario: Single expense parsed via LangChain chain
- **WHEN** `extract_expense("купив каву за 50")` is called
- **THEN** the chain SHALL invoke `ChatOpenAI` with a `ChatPromptTemplate`-assembled message and return a list containing one `Expense` object with `amount=50`, `category="Кафе/Ресторани"`, and `confidence>=0.9`

#### Scenario: Multiple expenses parsed via LangChain chain
- **WHEN** `extract_expense("купив каву за 50 і хліб за 30")` is called
- **THEN** the chain SHALL return a list of two `Expense` objects with amounts 50 and 30 respectively

### Requirement: Structured output via Pydantic wrapper model
The parser chain SHALL use a `ExpenseList(BaseModel)` wrapper with an `expenses: list[Expense]` field passed to `with_structured_output`, and `extract_expense` SHALL unwrap and return the `.expenses` list.

#### Scenario: Chain returns typed Expense objects
- **WHEN** the LLM responds with valid structured output
- **THEN** `extract_expense` SHALL return a `list[Expense]` (not raw dicts) with all Pydantic fields validated

#### Scenario: Chain rejects invalid structured output at parse time
- **WHEN** the LLM responds with a structured output missing required fields (e.g., `amount` absent)
- **THEN** the chain SHALL raise a `ValueError` or `ValidationError` before returning to the caller

### Requirement: ChatPromptTemplate with injected receipt timestamp
The chain SHALL use a `ChatPromptTemplate.from_messages([("system", SYSTEM_PROMPT), ("human", ...)])` where the human message template accepts `{received_at}` and `{user_input}` as named variables injected at invoke time.

#### Scenario: Receipt timestamp is injected via template variable
- **WHEN** `extract_expense` is called at `2026-06-28T14:35:00`
- **THEN** the human message sent to the LLM SHALL contain `"Message received at: 2026-06-28T14:35:00"` as a template-injected value (not a hardcoded string)

#### Scenario: Feedback is appended to human message on retry
- **WHEN** `extract_expense` is called with a non-None `feedback` string
- **THEN** the human message SHALL include the feedback text so the LLM can correct its prior output

### Requirement: Retry via LangChain `.with_retry()` wrapper
The chain SHALL be wrapped with `.with_retry(stop_after_attempt=MAX_RETRIES, retry_if_exception_type=(ValueError,))` so that transient LLM failures or validation errors are retried without manual loops.

#### Scenario: Chain retries on ValueError up to MAX_RETRIES
- **WHEN** the LLM returns an invalid response that raises `ValueError` on the first attempt
- **THEN** the chain SHALL automatically retry up to `MAX_RETRIES` times before propagating the exception

#### Scenario: Chain succeeds on second attempt after initial failure
- **WHEN** the first LLM call raises `ValueError` and the second call returns valid output
- **THEN** `extract_expense` SHALL return the valid `list[Expense]` from the second attempt
