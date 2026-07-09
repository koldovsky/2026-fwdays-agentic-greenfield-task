# harden-answer-error-state — design

## Context

`harden-failure-handling` (design D2) chose to let `answer_question` propagate `LLMError` and handle it at the CLI boundary, keeping the domain function free of infra concerns. A CodeRabbit review re-raised the point on `answer.py:71`, and the product owner instructed handling the failure inside the pipeline. This change reverses D2's placement while preserving its core invariant (NFR-007: an outage must never masquerade as an honest refusal).

## Goals / Non-Goals

**Goals:**

- `answer_question` returns a controlled result on LLM failure instead of raising.
- That result is unambiguously distinct from a refusal, in code and in the metric.

**Non-Goals:**

- Retries/backoff (a future change if needed).
- Changing the happy path or the refusal path.

## Decisions

### D1: A controlled error state, not a refusal

`answer_question` catches `LLMError` and returns `Answer(text=ERROR_TEXT + context, sources=[], found=False, error=True)`. The new `error` flag is the whole point: `found=False, error=False` = "corpus lacks it" (honest refusal); `found=False, error=True` = "the model failed". CodeRabbit offered "explicit refusal OR another controlled error state" — we take the latter, because collapsing an outage into a refusal would violate NFR-007 (a network/HTTP/JSON failure is not evidence about corpus content). Rejected alternative: reuse `REFUSAL_TEXT` — dishonest.

### D2: Keep the distinction consistent across the system

- **Eval:** refusal-rate counts a question as refused only when `not found and not error`, so an LLM error during eval does not inflate the anti-hallucination metric (it is a failure to produce a refusal, not a refusal).
- **CLI:** `render_answer` shows the error message without the `Джерела` line — an error is not a "no sources" answer.

### D3: Catch `LLMError` specifically

`complete()` already wraps transport/HTTP/JSON failures into a typed `LLMError`, so the pipeline catches exactly that — not a broad `Exception` that would swallow real bugs.

## Risks / Trade-offs

- [Any consumer checking only `found` could mistake an error for a refusal] → mitigated by updating every in-repo consumer (eval, CLI) to read `error`; the flag defaults `False` so existing constructions stay valid.
- [Placement now differs from `harden-failure-handling` D2] → intentional, on product-owner instruction; the CLI boundary handling remains as defense-in-depth.

## Open Questions

- None.
