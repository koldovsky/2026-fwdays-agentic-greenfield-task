## Context

The `router` change built `src/llm/systemPrefix.ts` as a single cached block but left it a
routing-only instruction, with a code comment noting "the honest coaching VOICE lands here in
`coach-persona`" and that the short prefix silently won't cache below Sonnet 4.6's ~2048-token
minimum. [ADR-0015](../../../docs/adr/0015-coach-persona-precision-first-clarification.md) fixes the
voice and clarification policy; [ADR-0013](../../../docs/adr/0013-eval-framework.md) prescribes the
LLM **judge eval** for subjective tone — a path the current `evals/run.ts` (dataset graders only) has
never exercised. This change is the first judge-eval consumer.

## Goals / Non-Goals

**Goals:**
- Land the honest, non-moralizing coaching voice + precision-first clarification policy as content in
  the one shared, prompt-cached prefix — defined once, inherited by every LLM surface.
- Push the prefix past the ~2048-token cache minimum so caching is actually effective (cost win).
- Build the judge-eval harness (fresh judge call, double-judge on borderline, CRITICAL gating) and
  the `coach-persona-tone` rubric suite; feed scores into the existing shape-generic ratchet.

**Non-Goals:**
- The **executing** clarification mechanic (open-question state, inline keyboard, expiry) — lands in
  `clarify`/`food-photo`. This change states the *policy* in the prefix only.
- The **ask/log discrimination** *dataset* eval — authored in `clarify`/`food-photo` where the asking
  mechanic exists. Here we only add the *tone* judge.
- Changing the LLM client request shape, the router, or any handler behavior.

## Decisions

- **One prefix, persona as content (not a second prompt).** Per ADR-0015 the voice lives in the
  stable prefix shared by logging, queries, reviews, metrics — so it is prompt-cached (invariant #5)
  and consistent. We extend `SYSTEM_PREFIX` text in place rather than add a per-surface prompt.
- **Structure the prefix in labeled sections** (Role / Voice / Clarification policy / Language /
  Routing) so it reads cleanly and the cache key stays one block. Keep the existing routing lines —
  they still apply.
- **Judge harness in `evals/judge.ts`, cases in `evals/cases/coach-persona-tone.eval.ts`.** A case is
  `{ scenario, produce(), rubric }`. `produce()` issues the real coaching call through the shared
  prefix; a **separate** judge call (distinct system prompt = the rubric, structured `{ score 0–100,
  criticalMiss, reasoning }` output) grades it — maker ≠ checker at the eval layer (ADR-0013). The
  judge model is the same Sonnet seam; the judge call is *not* the producer call.
- **CRITICAL gating + double-judge.** Any `CRITICAL:` miss caps the case at ≤ 49. Scores within a
  borderline band of the threshold get a second judge call; combine (min, to stay conservative).
- **Reuse the ratchet untouched.** Judge scores write into `latest.json` as
  `{ "coach-persona-tone": { "score": N } }` — the same `{capability:{field:number}}` shape the
  ratchet already walks, so `check-eval-ratchet.mjs` needs **no change**.
- **Baseline seeding (ADR-0013).** Commit a `coach-persona-tone` baseline into
  `quality/eval-baseline.json` from the first local `npm run evals`; the ratchet then bites. If the
  LLM key is unavailable at run time (sandbox — see memory), the judge run is a **deploy-time gate**:
  skip-with-note and seed the baseline when a key is present, rather than fail the loop.

## Risks / Trade-offs

- **Memory/cost:** the prefix grows a few hundred tokens — one-time, and once it clears the 2048-token
  minimum the prompt cache *reduces* steady-state per-message cost. No runtime memory concern (text
  constant). Build stays off-box (CI → GHCR; nothing new runs on the host).
- **LLM calls:** runtime adds **zero** calls (persona is just prefix content; still one deterministic
  call per message — invariant #5). The judge eval adds calls but **local only** (ADR-0013), bounded
  by a small curated case set; CI stays key-less via the committed-score ratchet.
- **Too-nice judge.** A lenient judge could pass moralizing prose. Mitigated by CRITICAL gating +
  double-judge on borderline; the rubric makes the failure modes explicit (good/bad food, shame,
  estimate-as-fact, wrong language).
- **No new ADR needed** — ADR-0015 (persona/policy) and ADR-0013 (judge eval) already cover the
  decisions; this change implements them.
