## 1. Dependencies

- [x] 1.1 Add `langchain>=0.2,<0.3` and `langchain-openai>=0.1,<0.2` to `requirements.txt`
- [x] 1.2 Remove `openai` as a direct dependency from `requirements.txt` (it becomes transitive via `langchain-openai`)
- [x] 1.3 Run `pip install -r requirements.txt` and verify both packages install without conflicts

## 2. Core Chain Implementation

- [x] 2.1 Add `ExpenseList(BaseModel)` wrapper class to `src/models.py` with field `expenses: list[Expense]`
- [x] 2.2 Rewrite `src/agent.py`: replace `OpenAI` client with `ChatOpenAI(model=LLM_MODEL, temperature=0.3)`
- [x] 2.3 Replace inline prompt string with `ChatPromptTemplate.from_messages([("system", SYSTEM_PROMPT), ("human", "Message received at: {received_at}\nParse this expense: {user_input}")])`
- [x] 2.4 Build LCEL chain: `chain = (prompt | llm.with_structured_output(ExpenseList)).with_retry(stop_after_attempt=MAX_RETRIES, retry_if_exception_type=(ValueError,))`
- [x] 2.5 Update `extract_expense` body to call `chain.invoke({"received_at": now.isoformat(), "user_input": user_input})` and return `.expenses`
- [x] 2.6 Update feedback injection: when `feedback` is non-None, append it to `user_input` string in the invoke call (same semantic as today)

## 3. Processor Simplification

- [x] 3.1 Remove the manual retry for-loop from `src/processor.py` (retry is now inside the chain)
- [x] 3.2 Verify `process_expense` in `processor.py` still calls `extract_expense` and passes results to `validator.py` unchanged

## 4. Test Updates

- [x] 4.1 Update `tests/test_agent_datetime.py`: replace `openai` mock patches with `unittest.mock.patch("src.agent.ChatOpenAI")` or inject a mock chain
- [x] 4.2 Update `tests/test_integration.py`: adjust any mocks that reference the old `openai.ChatCompletion` interface
- [x] 4.3 Run `pytest tests/` and confirm all tests pass with the new LangChain chain

## 5. Verification

- [x] 5.1 Run `pytest tests/evals/test_reasoning.py` and confirm eval pass rate is ≥80%
- [x] 5.2 Manually test the bot with a sample Ukrainian expense message end-to-end
- [x] 5.3 Confirm `src/validator.py`, `src/storage.py`, `src/bot.py` have zero changes
