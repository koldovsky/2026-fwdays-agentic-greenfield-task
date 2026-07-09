# harden-failure-handling — design

## Context

Shipped capabilities assumed the happy path: `OpenAICompatibleProvider.complete` let `httpx`/JSON errors bubble; `answer_question` had no failure branch; the CLI called the pipeline unguarded; `watch()` let any `sync_once` exception escape and `float(env)` crash startup. A CodeRabbit review flagged all of this. The fix is applied; this design records the decisions so they are governed, not incidental.

## Goals / Non-Goals

**Goals:**

- Infrastructure failures degrade gracefully and never crash a user-facing surface with a traceback.
- The honesty contract is preserved: a refusal always means "not in the corpus", never "the backend failed".
- Continuous sync stays continuous across transient failures.

**Non-Goals:**

- Retries/backoff, circuit breakers, health endpoints — out of scope for v1; a bounded wait + skip-and-continue is enough.
- Changing the happy-path behavior of any capability.

## Decisions

### D1: Typed `LLMError` at the provider boundary

`complete()` wraps transport errors (`httpx.HTTPError`) and response-shape errors (`KeyError`/`IndexError`/`TypeError`/`ValueError`, the last covering `json.JSONDecodeError`) into a single `LLMError` with endpoint/model context. Rationale: callers get one meaningful exception type instead of leaking implementation-specific errors across the interface boundary (TC-002). Alternative — returning a sentinel string — rejected: it would force every caller to string-match and risks a failure silently becoming an "answer".

### D2: The answer layer stays honest — failures are NOT refusals

`answer_question` deliberately does **not** catch `LLMError`. CodeRabbit suggested turning an LLM failure into `Answer(found=False)`; we rejected that. A refusal (`found=False`, "цього в документації немає") is a semantic claim about the corpus (NFR-002); an outage is not evidence that the corpus lacks the answer. Conflating them would let an infrastructure problem masquerade as a truthful "don't know" and mislead the user. So the error propagates, and the honesty decision remains purely about corpus content.

### D3: Handle failures at the CLI boundary, not deep in the pipeline

The CLI is the outermost surface, so it owns user-facing failure. `answer_or_error()` catches `LLMError` (tailored message) and any unexpected error (generic message) per question — so one bad question never crashes single-shot output or the REPL loop. `main()` guards pipeline construction (e.g. vector store unreachable at startup) and exits non-zero with a clear stderr message instead of a traceback. Catching broad `Exception` is justified only here, at the boundary; inner layers stay specific.

### D4: The watcher must outlive transient failures

`watch()` wraps each `sync_once` in try/except: a failed pass (e.g. a vector-store blip) is logged and the loop continues, because "continuous sync" that dies on the first hiccup is worse than useless. `_parse_interval()` validates `ASKDOCS_SYNC_INTERVAL` (non-numeric or ≤ 0 → default) so a config typo can't crash startup. `_wait_for_qdrant()` closes its probe client in `finally` to avoid leaking one per retry.

## Risks / Trade-offs

- [Broad `except Exception` at the CLI/watcher could hide a real bug] → mitigated by logging the actual error each time; the boundary is the correct place for a catch-all, and inner layers remain specific.
- [Swallowing sync failures could mask a persistent outage] → each skipped pass is logged; a persistent failure is visible in the logs and the index simply stops advancing, which is the safe direction.

## Open Questions

- None. Retries/backoff can be a future change if transient failures prove frequent.
