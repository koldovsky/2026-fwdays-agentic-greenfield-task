## Context

The project currently has a prototype `loop-controller.js` that mocks all four agent invocations with `setTimeout` delays and hard-coded strings. It demonstrates the sequential Planner → Builder → Tester → Reviewer flow but has no real agent calls, no state persistence, no retry logic, and no cost budgeting.

The engine itself follows a unidirectional data-flow pattern (GameState → Renderer → Event → Action → Reducer) defined in `ARCHITECTURE.md`. The loop engineering system mirrors this determinism at the process level: each agent is a pure function of its inputs (context + task), and the loop controller is the reducer that advances loop state.

The AGENTS.md document already defines the four roles conceptually. This design operationalizes them.

## Goals / Non-Goals

**Goals:**
- Replace mocked agent stubs in `loop-controller.js` with real orchestration logic.
- Enforce the Maker ≠ Checker principle programmatically (Builder cannot call Tester or Reviewer methods).
- Persist loop state to `loop-memory.md` after every phase boundary.
- Implement configurable retry (default: 3) with exponential back-off.
- Implement human escalation: pause and emit a structured JSON escalation event when triggered.
- Define a three-layer context assembly model (Knowledge / Memory / Task Context).
- Write OpenSpec spec files for all seven capabilities.

**Non-Goals:**
- Integrating with a live LLM API (agents remain callable stubs until a separate integration task).
- Building a web dashboard or GUI for loop monitoring.
- Supporting concurrent/parallel agent execution in this iteration.
- Modifying the game engine code (`example/`).

## Decisions

### D1: Node.js script as the loop controller (not a cloud orchestrator)

**Decision**: Keep the orchestrator as a plain `loop-controller.js` Node.js script.

**Rationale**: The ADR (`documentation/loop-ADR.md`) already chose Option 2 (Multi-Agent Orchestration via Node.js Script). It provides deterministic state management, easy local debugging (`node loop-controller.js`), and zero cloud dependency. A cloud orchestrator (Step Functions, Temporal) would add operational complexity incompatible with the local-first, offline-capable design goal.

**Alternatives considered**:
- Temporal workflow engine: Powerful durability, but requires a Temporal server and adds significant setup friction.
- GitHub Actions: Good for CI-triggered loops, but cannot run locally without act, making rapid iteration slow.

### D2: Flat Markdown as the memory store (not a database)

**Decision**: Loop state is persisted to `loop-memory.md` (Markdown) in the repository root.

**Rationale**: The spec requires human-readable state without specialized tooling. Markdown keeps the loop's state inside the repository, enabling version control, diff review, and manual override. The 30-day pruning rule prevents unbounded growth.

**Alternatives considered**:
- SQLite: Queryable and compact, but not human-readable without tooling; harder to manually correct.
- JSON file: Machine-readable but poor developer ergonomics; no natural section headings for per-task state.

### D3: Context assembly via explicit retrieval manifest (not full file injection)

**Decision**: Each agent declares a retrieval manifest (a list of document sections it needs). The assembler fetches and injects only those sections.

**Rationale**: The context engineering principle in `documentation/loop-engineering.md` mandates "retrieve rather than preload." Injecting entire files bloats context windows and increases hallucination risk. A manifest model makes context deterministic and auditable.

**Alternatives considered**:
- Full file injection: Simpler to implement but violates the minimal context principle.
- Vector search (RAG): More dynamic and scalable, but introduces non-determinism and requires an embeddings service.

### D4: Retry routes back to Builder, not Planner

**Decision**: Verification failures (Tester or Reviewer) route back to the Builder step only, not all the way back to the Planner.

**Rationale**: Most verification failures are implementation errors, not planning errors. Re-running the Planner wastes tokens and may change the plan, introducing scope drift. The Reviewer's rejection report is designed to give the Builder actionable, targeted feedback.

**Exception**: If the retry budget is exhausted without resolution, the loop escalates to human review which may include re-planning.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Builder hallucinates out-of-scope changes | Reviewer checks diff scope against plan; out-of-scope changes trigger rejection |
| Retry loop never converges | Maximum retry limit (default: 3) enforced by controller; exhaustion triggers human escalation |
| Memory file grows unbounded | 30-day pruning rule archives old entries automatically |
| Context assembly loads too little context | Each agent's retrieval manifest is tested as part of the Tester's responsibility |
| Agent stubs make integration testing meaningless | Real agent integration is a follow-on task; stubs are clearly labeled `[MOCK]` in logs |

## Migration Plan

1. Replace mocked `setTimeout` stubs in `loop-controller.js` with real agent function skeletons that read from / write to the change artifact directory.
2. Add `loop-memory.md` initialization logic on first run.
3. Add retry counter and escalation logic to the main `runLoop` function.
4. Wire context assembly: define per-agent retrieval manifests as plain JS objects.
5. Run `node loop-controller.js "Add structured logging"` locally to validate the happy path.
6. Run `node loop-controller.js "Fail deliberately"` to validate retry and escalation behavior.

**Rollback**: The current `loop-controller.js` is in Git. Any failed migration can be reverted with `git revert`.

## Open Questions

- **OQ1**: Should the human escalation event be emitted to stdout (for CI log capture) or written to a dedicated `escalation.md` file? Both are feasible; stdout is simpler for CI; file is more inspectable.
- **OQ2**: What is the correct default token budget per agent? Needs empirical measurement once real LLM calls are wired.
- **OQ3**: Should `loop-memory.md` live in the repo root or in `openspec/`? Repo root keeps it visible; `openspec/` keeps it co-located with change artifacts.
