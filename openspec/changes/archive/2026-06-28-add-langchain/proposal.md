## Why

The current expense parser uses the OpenAI SDK directly with hand-rolled prompt management, retry logic, and JSON parsing scattered across `agent.py`. Migrating to LangChain standardizes the LLM interaction layer, gives us structured output parsing via Pydantic integration, built-in retry/fallback chains, and a prompt template abstraction that aligns with agentic engineering best practices demonstrated in this course.

## What Changes

- Replace direct `openai` SDK calls in `src/agent.py` with LangChain's `ChatOpenAI` and `LLMChain` (or LCEL `|` pipe syntax)
- Replace manual `json.loads` + dict unpacking with LangChain's `PydanticOutputParser` bound to the existing `Expense` model
- Replace inline prompt string with `ChatPromptTemplate` (system + human message templates)
- Replace manual retry loop in `src/processor.py` with LangChain's `with_retry` or `RunnableWithFallbacks`
- Add `langchain` and `langchain-openai` to `requirements.txt`; remove `openai` as a direct dependency (it becomes a transitive dep)

## Capabilities

### New Capabilities

- `langchain-expense-parser`: LangChain-based expense extraction chain — `ChatPromptTemplate | ChatOpenAI | PydanticOutputParser` — with structured output and built-in retry

### Modified Capabilities

- `expense-datetime-inference`: No requirement changes; datetime inference rules remain identical but are now expressed inside a `ChatPromptTemplate` system message rather than a raw string

## Impact

- **`src/agent.py`**: Full rewrite — replaces OpenAI client + manual JSON with LangChain chain
- **`src/processor.py`**: Remove manual retry loop; delegate to LangChain retry wrapper
- **`src/config.py`**: Add `LANGCHAIN_*` env vars if needed (e.g., `LANGCHAIN_TRACING_V2` for optional LangSmith tracing); `LLM_MODEL` stays
- **`requirements.txt`**: Add `langchain>=0.2`, `langchain-openai>=0.1`
- **`tests/`**: Update mocks from `openai.ChatCompletion` to LangChain test utilities or direct `ChatOpenAI` mock
- No changes to `src/bot.py`, `src/storage.py`, `src/validator.py`, or `src/models.py`
