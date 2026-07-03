## Why

The tailoring pipeline is still a stub fixture (`docs/current-state.md`, P3b
blocked). The pure prompt core exists (`shared/lib/llm`: generation + grounding
builders and parsers) but nothing drives it. This change replaces the stub with a
real **skills-based agent loop**: a planner that calls discrete, testable skills
(parse → extract → generate → ground → score) in a plan/act/observe cycle, backed
by a pluggable LLM provider (Claude by default, ChatGPT optional). It implements
the pipeline (FR-TAILOR-01/02/03, FR-BULLETS-01/03) while keeping honesty
structural — grounding stays a context-isolated skill (BC-HONESTY-01/02).

## What Changes

- Add an **LLM provider port** (`shared/lib/llm`) with a Claude adapter (default,
  latest Claude model) and an optional ChatGPT adapter — both behind one
  streaming interface. Prompt builders/parsers already present are reused.
- Add an **agent loop** in `features/run-tailoring`: a bounded plan/act/observe
  cycle over a registry of skills — `parse-cv`, `extract-requirements`,
  `generate-bullet`, `ground-bullet`, `score` — each a typed function that may
  call the LLM port. The loop advances the tailoring state until every requirement
  has a scored, grounded bullet or a calm failure.
- **Honesty stays structural:** the `ground-bullet` skill receives only the bullet
  + CV text — never the JD, requirements, or generation context — so pass 2 cannot
  rubber-stamp pass 1 (FR-BULLETS-03, BC-HONESTY-01). Overclaim-risk bullets are
  excluded from export by default and cannot be silently re-included (BC-HONESTY-02).
- **Async + streaming + fail-honest:** the loop runs off the request via the queue,
  streams progress to the client (first token < 3s, full < 30s p95;
  NFR-PERF-01/02), retries a failed LLM step up to twice then surfaces a calm
  Ukrainian message without charging (FR-TAILOR-03, NFR-OBS-01).
- **Observability + privacy:** each skill step is traceable; no user IDs in LLM
  payloads (NFR-SEC-02).

## Capabilities

### New Capabilities
- `agent-loop`: the skills-based tailoring agent — provider port, skill registry,
  bounded plan/act/observe loop, structural grounding, streaming, retry. Serves
  FR-TAILOR-01/02/03, FR-BULLETS-01/03.

### Modified Capabilities
<!-- None to existing specs. `bullets`/`checklist` behavior is honored, not changed;
     this change produces the data those specs describe. -->

## Impact

- New: `shared/lib/llm` provider port + Claude/ChatGPT adapters, `features/run-tailoring`
  (agent loop + skill registry), worker/queue producer + consumer wiring,
  streaming route handler.
- Depends on: `ANTHROPIC_API_KEY` (and optional `OPENAI_API_KEY`), the queue
  (BullMQ/Redis or an inline route-handler MVP first), `add-persistence` for
  storing results. Reuses existing `shared/lib/llm` builders + parsers and the pure
  `shared/lib/scoring` functions.
- Serves: FR-TAILOR-01/02/03, FR-BULLETS-01/03, NFR-PERF-01/02, NFR-OBS-01,
  NFR-SEC-02, BC-HONESTY-01/02, TC-STACK-03/04.
