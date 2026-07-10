# Design — add-agent-loop

## Context

`shared/lib/llm` already has pure two-pass prompt builders
(`buildGenerationPrompt` / `buildGroundingPrompt`) and tolerant parsers, and
`GroundingInput` deliberately has no JD/requirements field so pass 2 can't see
generation context (current-state P3a). What's missing is the driver. Rather than a
hardcoded linear pipeline, we use a **skills-based agent loop** so the pipeline is
a registry of small, independently testable skills the planner sequences — easy to
extend (cover letter, re-ground) and swap providers under.

## Goals

- Real end-to-end tailoring replacing the stub, over Claude by default.
- Honesty preserved structurally, not by prompt politeness (BC-HONESTY-01/02).
- Provider-agnostic; ChatGPT is a drop-in adapter.
- Streaming, async, fail-honest, observable (NFR-PERF/OBS).

## Decisions

- **Provider port** in `shared/lib/llm`: `stream(messages, opts) → tokens` +
  `complete(...)`. Adapters: **Claude (default, latest Claude model)** and an
  optional **ChatGPT** adapter. `shared/lib` stays framework-free; adapters isolate
  SDK calls. Provider chosen by `LLM_PROVIDER` config; model per adapter.
- **Skill registry:** each skill is a typed pure-ish function
  `run(state, ctx) → partialState`, where `ctx` exposes the LLM port and only the
  inputs that skill is allowed to see. Skills: `parse-cv`, `extract-requirements`,
  `generate-bullet`, `ground-bullet`, `score`.
- **Grounding isolation (non-negotiable):** the `ground-bullet` skill's `ctx` is
  constructed with only `{ bullet, cvText }` — the loop physically withholds JD /
  requirements / the generation transcript. This is the structural guarantee of
  FR-BULLETS-03 / BC-HONESTY-01, enforced by types, not by a prompt line.
- **Bounded loop:** plan → pick next skill → run → merge state → repeat, with a
  hard step cap and per-requirement progress; terminates when all requirements
  have a grounded, scored bullet or a step exhausts retries.
- **Scoring is pure:** `score` calls the existing deterministic `shared/lib/scoring`
  functions — no LLM (FR-CHECKLIST, TC-PURE-01).
- **Async + streaming:** loop runs in the queue worker (BullMQ/Redis), TC-STACK-04;
  an inline route-handler mode is allowed as the first MVP. Progress + tokens stream
  to the client (NFR-PERF-01/02).
- **Fail-honest:** any LLM/skill step retries ≤ 2, then the loop stops and emits a
  calm Ukrainian error state; partial/blank/hallucinated output is never rendered
  (FR-TAILOR-03, NFR-OBS-01). Failed attempts aren't charged.
- **Privacy:** no user IDs in any LLM payload (NFR-SEC-02).

## Loop sketch

```
state = { cv, jd }
plan: [parse-cv, extract-requirements, (generate-bullet, ground-bullet)*, score]
while not done and steps < cap:
  skill = planner.next(state)
  ctx   = buildCtx(skill, state)   # ground-bullet ctx omits jd/requirements/gen
  state = merge(state, retry(skill.run, state, ctx, max=2))
emit(state)  # or calm failure
```

## Risks / open questions

- Planner: deterministic sequencer first; LLM-driven planning is a later option.
- Token budget per request (NFR-COST-01) enforced in the port.
- ChatGPT adapter must honor the same grounding-context withholding.
