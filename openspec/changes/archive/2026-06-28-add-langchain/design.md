## Context

The current `src/agent.py` uses the `openai` SDK directly: it constructs a raw messages list, calls `client.chat.completions.create`, manually parses JSON with `json.loads`, and unpacks into `Expense(**item)`. Retry logic lives in `src/processor.py` as a hand-rolled for-loop with string feedback injection.

This works but couples us tightly to the OpenAI SDK's raw interface and forces us to maintain our own JSON extraction, retry, and prompt-assembly logic. LangChain provides all three as first-class primitives.

## Goals / Non-Goals

**Goals:**
- Replace `openai` SDK calls with `langchain-openai`'s `ChatOpenAI`
- Use `ChatPromptTemplate` for prompt assembly (system + human templates)
- Use `PydanticOutputParser` (or `with_structured_output`) for typed extraction instead of `json.loads`
- Move retry responsibility from `processor.py` into the LangChain chain via `.with_retry()`
- Keep the `Expense` Pydantic model unchanged
- Keep `src/validator.py`, `src/storage.py`, `src/bot.py`, and `src/models.py` untouched

**Non-Goals:**
- Adding LangSmith tracing (optional env var only, no runtime dependency)
- Switching LLM provider or model
- Changing the public API of `extract_expense` (signature stays the same)
- Introducing LangChain agents, tools, or memory

## Decisions

### 1. LCEL pipe chain over `LLMChain`

Use the LangChain Expression Language (LCEL) `|` pipe operator:

```
chain = prompt | llm.with_structured_output(ExpenseList)
```

**Why**: `LLMChain` is the legacy path; LCEL is the recommended modern approach as of LangChain 0.2. It's more composable and readable. `with_structured_output` handles JSON mode + Pydantic validation in one step, eliminating the separate `PydanticOutputParser`.

**Alternative considered**: Keep `PydanticOutputParser` + `StrOutputParser` manually. Rejected — `with_structured_output` is simpler and less error-prone for OpenAI function-calling / JSON mode.

### 2. Wrap output in a list schema

`with_structured_output` works best with a single Pydantic model. Since the agent returns a list, define a thin wrapper:

```python
class ExpenseList(BaseModel):
    expenses: list[Expense]
```

The chain returns `ExpenseList`; caller accesses `.expenses`. This is invisible to `processor.py` since `extract_expense` still returns `list[Expense]`.

**Alternative considered**: Use `JsonOutputParser` and return raw dicts. Rejected — loses Pydantic validation at parse time.

### 3. Retry stays in processor.py, but uses LangChain's `.with_retry()`

Replace the manual for-loop in `processor.py` with:

```python
chain = (prompt | llm.with_structured_output(ExpenseList)).with_retry(
    stop_after_attempt=MAX_RETRIES,
    retry_if_exception_type=(ValueError,),
)
```

**Why**: Centralizes retry in the chain definition; removes stateful loop from `processor.py`. The feedback-injection pattern (passing prior failure as context) can still be handled by re-invoking with updated prompt variables.

**Alternative considered**: Keep retry in `processor.py`. Acceptable, but then we miss the benefit of LangChain's retry semantics and chain composability.

### 4. Prompt template uses `ChatPromptTemplate.from_messages`

```python
ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "Message received at: {received_at}\nParse this expense: {user_input}"),
])
```

`received_at` and `user_input` are template variables injected at invoke time. Feedback is appended as an additional human message when present.

## Risks / Trade-offs

- **LangChain version churn**: LangChain's API changed significantly between 0.1 and 0.2. Pin to `langchain>=0.2,<0.3` and `langchain-openai>=0.1,<0.2` to avoid surprises. → Mitigation: pin versions in `requirements.txt`.
- **`with_structured_output` JSON mode quirks**: Some models respond inconsistently to function-calling. `gpt-4o-mini` supports it reliably. → Mitigation: keep `temperature=0.3`; add a fallback to raw JSON parsing if structured output raises.
- **Feedback injection pattern changes**: The current retry sends feedback as a multi-turn conversation. With LCEL, re-invocation creates a fresh chain call unless we explicitly build multi-turn history. → Mitigation: for MVP, re-invoke chain with feedback appended to the human message string (same behavior as today, just through template variables).
- **Test mock changes**: Tests currently mock `openai.ChatCompletion`. With LangChain, mocking the `ChatOpenAI` object or patching at the `langchain_openai` level is slightly different. → Mitigation: use `unittest.mock.patch` on `langchain_openai.ChatOpenAI` or inject a mock LLM via constructor.

## Migration Plan

1. Add `langchain>=0.2,<0.3` and `langchain-openai>=0.1,<0.2` to `requirements.txt`.
2. Rewrite `src/agent.py` — new chain, same `extract_expense` function signature.
3. Simplify retry in `src/processor.py` to use the chain's `.with_retry()`.
4. Update test mocks in `tests/` to patch `langchain_openai.ChatOpenAI`.
5. Run `pytest` — all existing tests must pass before merge.
6. Rollback: revert `src/agent.py` and `src/processor.py`; remove LangChain deps from `requirements.txt`.

## Open Questions

- Should we enable `LANGCHAIN_TRACING_V2` for LangSmith in the dev environment? (Low priority; out of scope for this change.)
- Is `gpt-4o-mini` compatible with `with_structured_output` in JSON mode? (Yes — confirmed in LangChain docs for OpenAI function-calling models.)
