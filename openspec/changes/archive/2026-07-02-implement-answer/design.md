# implement-answer — design

## Context

Ingest and retrieve are shipped. The product owner chose a local LLM served by LM Studio on the host (OpenAI-compatible API at `http://localhost:1234/v1`, default model `google/gemma-4-e4b` — a small model that fits the machine's resources; larger models like qwen3.6-35b were rejected at runtime by LM Studio's resource guardrails). The app runs in Docker, so the container reaches the host via `host.docker.internal`. Constraints: answers only from the corpus (NFR-004), every answer cites its source (NFR-001), "not in corpus" is a valid outcome (NFR-002), one LLM behind `LLMProvider` (TC-002/003).

## Goals / Non-Goals

**Goals:**

- `LLMProvider` interface + OpenAI-compatible implementation (works with LM Studio now, any OpenAI-compatible endpoint later).
- Answer pipeline producing `Answer(text, sources, found)` from a question.
- Honest refusal path that is machine-detectable (for eval) and human-readable (for CLI).

**Non-Goals:**

- CLI wiring (next change), eval metrics (after that).
- Streaming, conversation history, multiple models, prompt tuning beyond what tests need.
- Retrieval-score thresholds — the LLM judges sufficiency in v1; eval may add a threshold later.

## Decisions

### D1: `LLMProvider` is a one-shot completion interface

`complete(system: str, user: str) -> str`. No streaming, no history — the pipeline is single-turn. `OpenAICompatibleProvider` POSTs to `{base_url}/chat/completions` via `httpx` (already a transitive dep; no OpenAI SDK needed for one endpoint). Base URL and model come from `LLM_BASE_URL` / `LLM_MODEL` env vars; defaults target LM Studio through `host.docker.internal:1234`. Alternatives: `openai` SDK (extra dep for one POST), Anthropic API (rejected by owner: local model chosen).

### D2: Grounding via numbered fragments + citation markers

The prompt presents retrieved chunks as numbered fragments (`[1] джерело: dvyhun/palyvo.md ...`) and instructs: answer in Ukrainian, use ONLY the fragments, cite fragment numbers `[N]` inline, and if the fragments don't contain the answer output exactly `NO_ANSWER`. Parsing: `NO_ANSWER` anywhere in the reply → `Answer(found=False, text="Цього в документації немає.", sources=[])`; otherwise `sources` = files of fragments cited via `[N]`, falling back to all context files if the model cited nothing (the answer still derives only from those files, so the fallback keeps NFR-001 honest). Reasoning-model thinking blocks (`<think>…</think>`) are stripped before parsing.

### D3: The answer layer owns the honesty decision

The retriever always returns top-k; the LLM decides sufficiency (per retrieve design D1). No score threshold in v1 — with a 5-file corpus thresholds are guesswork; `implement-eval` (FR-042) will measure the refusal behavior and can introduce one with data.

### D4: Tests — fake LLM for logic, live LM Studio as skippable smoke

Unit tests drive the pipeline with a scripted `LLMProvider` fake: citation parsing, NO_ANSWER path, fallback sources, think-block stripping — deterministic and green anywhere (NFR-003). One live smoke test asks a corpus question end-to-end (retriever + LM Studio) and asserts `found=True` with a correct source file; it auto-skips if `LLM_BASE_URL` is unreachable, so the suite stays green on machines without LM Studio. The pipeline itself is tested by the fakes; the smoke test only proves the wiring.

## Risks / Trade-offs

- [Local model may ignore citation instructions] → fallback to all-context-files keeps sources non-empty; eval will quantify citation quality.
- [Live smoke test depends on host LM Studio state (model loaded, JIT loading)] → auto-skip on unreachable endpoint; model name env-configurable.
- [`host.docker.internal` differs across Docker engines] → `extra_hosts: host-gateway` covers Linux; Docker Desktop resolves it natively.
- [qwen3.6 emits `<think>` blocks] → stripped in the provider before returning text.

## Open Questions

- None blocking.
