## Context

The expense parser currently uses a LangChain chain to extract structured expense data from free-form Ukrainian text. As the system grows (multi-expense inputs, complex datetime inference), production debugging becomes harder without observability. Langsmith provides end-to-end tracing and evaluation framework that integrates cleanly with LangChain.

Current state:
- Parser uses `ChatOpenAI` wrapped in a LangChain LCEL chain with `.with_structured_output()` and `.with_retry()`
- Tests mock the chain directly; no production tracing or feedback loop
- Evals run offline against a static test suite with pass/fail metrics
- No central visibility into which prompts/LLM calls fail in production

---

## Goals / Non-Goals

**Goals:**
- Enable end-to-end tracing of every LLM call in the parser chain, capturing prompts, responses, and token usage
- Create custom Langsmith evaluators to measure accuracy (category, amount) and confidence calibration
- Provide a feedback submission API so production errors can feed into evaluator training
- Make tracing opt-in via environment variables (no production overhead if disabled)
- Support running evals against a local/sandbox Langsmith project for development

**Non-Goals:**
- Real-time alert/monitoring (Langsmith tracing only; no custom alerting)
- Feedback loop automation (submission is manual or via explicit user actions)
- Advanced Langsmith features (datasets, experiments, feedback chains) — scope is read-only tracing + custom evaluators only
- Breaking changes to the parser API or data model

---

## Decisions

### Decision: Langsmith client initialized at module load time (not per-call)

**Choice**: Create a singleton `LangsmithClient` instance in `src/agent.py`, initialized on first import. If credentials are missing, silently skip and proceed.

**Rationale**:
- Reduces per-call overhead (no repeated client creation)
- Graceful degradation: if Langsmith is unavailable, parsing still works
- Cleaner than passing client as a parameter through the call stack

**Alternatives considered**:
1. Create client per-call — adds latency and complexity; client creation is cheap but not free
2. Lazy initialization on first call — adds timing variability; simpler but no upfront error detection
3. Require Langsmith configuration — breaks backward compatibility; rejected per goals

### Decision: Tracing via LangChain RunTracer callback, not manual logging

**Choice**: Wrap the LCEL chain with Langsmith's `LangsmithTracer()` callback, which automatically hooks into LangChain's runnable execution.

**Rationale**:
- LangChain integration is native; no manual prompt/response logging
- Automatically captures token counts and timing from the LLM provider
- Works with `.with_retry()` — captures retry attempts as separate runs or a single hierarchical run
- Clean separation: parser logic untouched, tracing is orthogonal

**Alternatives considered**:
1. Manual tracing in `extract_expense()` — more control but error-prone and boilerplate-heavy
2. Custom callback that logs to a file instead — loses Langsmith's evaluator/feedback infrastructure
3. Langsmith's `traceable()` decorator — applies to function level, but we want chain-level granularity

### Decision: Custom metadata in Langsmith runs includes extracted fields

**Choice**: After chain invocation, add extracted `amounts`, `categories`, and `confidences` to the Langsmith run's metadata dict.

**Rationale**:
- Evaluators need access to both LLM response and parsed output
- Metadata is queryable and filterable in Langsmith UI for debugging
- Avoids re-parsing the structured output in evaluators

**Alternatives considered**:
1. Store in Langsmith feedback field — feedback is for human-added ground truth, not parsed data
2. Log to a separate database — loses the integrated view in Langsmith UI
3. Embed in run name/tags — too limited; metadata is structured and queryable

### Decision: Evaluators implemented as standalone Python functions, registered with Langsmith

**Choice**: Create `src/evals.py` with three evaluator functions (`evaluate_category_accuracy`, `evaluate_amount_accuracy`, `evaluate_confidence_calibration`). Register them with Langsmith's evaluator registry.

**Rationale**:
- Evaluators are deterministic and easy to test offline
- Langsmith orchestrates running them over traced runs
- Easy to extend with new evaluators later (just add a function)
- Keeps evaluator logic separate from the parser

**Alternatives considered**:
1. Evaluators as Langsmith custom types — more heavyweight, less portable
2. Evaluators in a separate package — overkill for 3 evaluators initially
3. Async evaluators — parser trace execution is fast; no need for parallelism yet

### Decision: Reference dataset for evaluators stored in a JSON file, not hardcoded

**Choice**: Create `data/eval_reference.json` with expected outputs for known inputs. Evaluators load and query this at runtime.

**Rationale**:
- Easy to add test cases without code changes
- Can be generated from gold-standard annotations
- Decouples evaluator logic from test data
- Enables future integration with Langsmith datasets

**Alternatives considered**:
1. Hardcoded test cases in evaluator code — doesn't scale; makes the evaluator logic cluttered
2. Query a database — adds external dependency; file is simpler for MVP
3. Langsmith built-in datasets — good for large-scale, but overkill for initial set of cases

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Langsmith API is slow or unavailable** | Client initialization is non-blocking; if Langsmith fails, tracing is skipped. Parser logic is unaffected. |
| **Sensitive data (user inputs, API keys) leaked to Langsmith** | Only amounts, categories, and confidence are stored in metadata — no raw user text. Langsmith API key is stored in environment, not in code. |
| **Evaluator accuracy depends on reference dataset quality** | Start with manually-vetted test cases. As confidence grows, expand via Langsmith feedback loop. |
| **Evaluator overhead slows production parsing** | Evaluators run async after parsing completes (not blocking). Reference dataset is small (JSON file). No production impact. |
| **Token overhead from Langsmith logging** | Langsmith sends metadata asynchronously. Negligible overhead on request latency. |
| **Inconsistency between local and Langsmith's view of metadata** | Metadata schema is defined once in `src/agent.py` and used by evaluators. Single source of truth. |

---

## Migration Plan

1. **Phase 1**: Add Langsmith dependency and client initialization (no tracing yet)
   - Update `requirements.txt` with `langsmith>=0.1,<0.2`
   - Initialize `LangsmithClient` in `src/agent.py` if credentials are set
   - Tests pass; backward compatibility maintained

2. **Phase 2**: Integrate `LangsmithTracer` callback into the parser chain
   - Wrap chain with `LangsmithTracer()` if client is initialized
   - Add metadata population in `extract_expense()`
   - Run evals to verify tracing captures LLM calls

3. **Phase 3**: Implement custom evaluators
   - Create `src/evals.py` with three evaluator functions
   - Create `data/eval_reference.json` with test cases
   - Register evaluators with Langsmith; verify they run on traced runs

4. **Phase 4** (future): Feedback submission API
   - Add `submit_feedback()` function in `src/agent.py`
   - Integrate with bot UI/API to allow users or admins to log corrections
   - Feed corrections into evaluator training

**Rollback**: Remove Langsmith dependencies and env var checks; revert to non-traced parser. No data model or API changes.

---

## Open Questions

1. What is the schema for `data/eval_reference.json`? How large should the initial dataset be?
   → Suggest: `[{"input": "...", "expected_category": "...", "expected_amount": ...}, ...]`, start with ~20 cases covering edge cases

2. Should evaluators run synchronously as part of the trace, or asynchronously afterward?
   → Current design: async via Langsmith's evaluator orchestration. Allows real-time feedback without blocking parsing.

3. How should confidence calibration be scored? (E.g., Brier score, ECE metric, simple correlation?)
   → Suggest: Start simple — correlation between confidence and correctness. Upgrade to ECE (Expected Calibration Error) if needed.

4. Should feedback include user input text, or just amounts/categories?
   → Current design: no raw text, only structured fields. Avoids privacy concerns. Can add text if needed later.
