## Why

As the expense parser grows in sophistication (handling multi-expense inputs, datetime inference, LangChain chains), observability becomes critical to debug parsing failures and monitor LLM behavior in production. Langsmith provides tracing, evaluators, and feedback loops that let us track every LLM call, measure parsing accuracy, and iterate on prompts. This foundation enables faster debugging and safer iterations on parser logic.

## What Changes

- Add Langsmith tracing instrumentation to the LangChain parsing chain, capturing all LLM calls, tokens, and latency
- Create custom Langsmith evaluators to run continuous evals against the expense parsing dataset
- Export parsed expenses with feedback metadata so evaluators can compare predicted vs. expected categories and amounts
- Add Langsmith project/API configuration via environment variables (`LANGSMITH_PROJECT`, `LANGSMITH_API_KEY`)
- Integrate Langsmith client initialization into the parser module without breaking existing tests

## Capabilities

### New Capabilities

- `langsmith-tracing`: Instrument the LangChain parser chain with Langsmith tracing to capture LLM calls, tokens, and latency.
- `langsmith-evaluators`: Create custom Langsmith evaluators that measure expense parsing accuracy (category match, amount match, confidence calibration).

### Modified Capabilities

- `langchain-expense-parser`: Add optional tracing callback to the chain, and expose feedback submission for training evaluators.

## Impact

- **Dependencies**: Add `langsmith>=0.1,<0.2` to `requirements.txt`.
- **Parser module**: Initialize Langsmith client on startup; wrap chain with tracing callback if enabled.
- **Tests**: Mock Langsmith client in unit tests; add optional integration tests against Langsmith sandbox project.
- **APIs**: New `submit_feedback()` function in parser to log corrections for evaluator training.
- **Breaking changes**: None. Langsmith integration is opt-in via environment variable.
