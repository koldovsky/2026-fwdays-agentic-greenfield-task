# harden-answer-error-state — proposal

## Why

A CodeRabbit comment on `askdocs/answer.py` asked for LLM-failure handling in the answer pipeline. Originally (design D2 of `harden-failure-handling`) `answer_question` propagated `LLMError` and let the CLI boundary handle it. On explicit product-owner instruction we changed the pipeline itself to catch the failure and return a **controlled error state** — but deliberately NOT a refusal, to keep the honesty contract (NFR-007) intact.

This modifies the shipped `answer` capability's failure behavior. The code + spec edits were made directly first as a review-driven fix; this change backfills the governance so the modification is spec-driven, not an in-place edit of a frozen spec.

## What Changes

- `answer_question` wraps `llm.complete()` and, on `LLMError`, returns `Answer(found=False, error=True, ERROR_TEXT)` instead of propagating.
- `Answer` gains an `error` flag so a controlled error state is **distinct** from an honest refusal (`found=False, error=False`): an outage is not evidence the corpus lacks the answer.
- Eval refusal-rate counts only genuine refusals (`not found and not error`), so an LLM error can't inflate the anti-hallucination metric.
- CLI renders the error state as a message without a sources line.

## Capabilities

### Modified Capabilities

- `answer`: the "infrastructure failures are errors, not refusals" requirement now specifies a controlled error state returned by the pipeline (distinct from a refusal), rather than propagation.

## Impact

- Code already landed (`askdocs/answer.py`, `askdocs/eval.py`, `askdocs/cli.py`) with +2 tests; suite green at 46.
- Spec delta modifies the existing answer requirement; PRD NFR-007 wording updated to match.
- No new dependencies. Behavior is a refinement of NFR-007, not a new capability.
