# implement-answer — proposal

## Why

Retrieve returns relevant chunks, but the user still has no answer. This change adds the answer capability (PRD FR-020, FR-021): generate a response strictly from retrieved chunks with source citations, or honestly say the corpus doesn't contain the answer. This also introduces the last mandatory interface, `LLMProvider` (TC-002/TC-003).

## What Changes

- New `LLMProvider` interface: "generate a completion". v1 implementation: OpenAI-compatible HTTP API pointed at LM Studio on the host (model configurable via env), per the product owner's choice.
- New answer pipeline: question → `Retriever` → prompt with numbered context fragments → LLM → `Answer(text, sources, found)`.
- Grounding rules enforced by prompt + parsing: the model must answer only from the provided fragments and cite them as `[N]`; if the fragments don't contain the answer it must emit a `NO_ANSWER` marker, which the pipeline turns into an honest "цього в документації немає" with `found=False` (FR-021, NFR-002).
- Every found answer carries `sources` — the files of the cited fragments (NFR-001).
- Tests: deterministic unit tests with a fake `LLMProvider` (prompt construction, citation parsing, NO_ANSWER path); a live smoke test against LM Studio that auto-skips when the endpoint is unreachable.

## Capabilities

### New Capabilities

- `answer`: Generate an answer from retrieved chunks with source citations, or an honest "not in the corpus". Covers PRD FR-020, FR-021.

### Modified Capabilities

<!-- none: retrieve and ingest requirements unchanged -->

## Impact

- New code: `askdocs/llm.py` (`LLMProvider` + `OpenAICompatibleProvider`), `askdocs/answer.py` (pipeline + `Answer` dataclass).
- `docker-compose.yaml`: `extra_hosts: host.docker.internal:host-gateway` and `LLM_BASE_URL`/`LLM_MODEL` env vars for the app service.
- No new Python dependencies: HTTP via `httpx` (already present transitively through qdrant-client).
- Downstream: `implement-cli` wires this pipeline to the terminal; `implement-eval` measures its honesty.
