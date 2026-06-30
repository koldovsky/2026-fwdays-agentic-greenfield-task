## Why

The `router` change established the **stable, prompt-cached system prefix** but left it as a minimal
routing instruction — every LLM call shares it, yet there is no agreed **coaching voice** and no sharp
**clarification policy** beyond requirements §8.7's "log by default; ask only when it materially
matters." [ADR-0015](../../../docs/adr/0015-coach-persona-precision-first-clarification.md) resolves
both: one honest, non-moralizing voice and a precision-first ("don't disturb when you can see it;
don't guess when you can't") clarification rule. Landing them in the shared prefix now means every
voice-heavy surface built after it — `clarify`, `food-photo`, `reviews` — inherits the same persona
and rule for free. This change has no direct US (it is the shared substrate) but underpins US-3/6/9.

## What Changes

- **Fatten the shared system prefix** (`src/llm/systemPrefix.ts`, established in `router`) with the
  **Coaching Voice**: blunt-factual on energy balance and trade-offs ("pizza won't make you
  thinner"), **no food-moralizing** (no good/bad foods, no guilt, no shame), surfaces estimates
  honestly (±20–30%), states trade-offs in **numbers + consequence** not verdicts. The prefix stays
  one cached block (invariant #5); fattening it also pushes it past Sonnet 4.6's ~2048-token cache
  minimum the router note flagged.
- **Add the precision-first clarification policy** as the shared rule the ask-surfaces enforce: log
  when the calorie-setting info is complete; **ask one batched round** only on a hidden
  **high-leverage** calorie-mover (cooking fat, sauce/dressing, fried-vs-baked, unknown portion,
  sugary drink, protein variant fat% e.g. творог 0/5/9); **skip ≈±50 kcal**; estimate is the
  **fallback** on open-question expiry, **not the first move**. This change states the rule in the
  prefix; the executing mechanic (open-question, inline keyboard, ask/log dataset eval) lands in
  `clarify`/`food-photo`.
- **Language mirroring** stays explicit (invariant #6): prose mirrors the user (RU/UA/EN/mixed);
  intent/enum/structural field values stay English.
- **Author the LLM judge-eval path** ([ADR-0013](../../../docs/adr/0013-eval-framework.md)) — this is
  the **first** judge-rubric capability; today `evals/run.ts` only does dataset/code graders. Add a
  judge runner (a fresh judge LLM call, maker ≠ checker, double-judge on borderline scores) and the
  `coach-persona-tone` rubric suite (`CRITICAL:` non-moralizing, no shame, numbers-not-verdict,
  language-mirror). Scores flow into the same `latest.json` → `check:evals` ratchet (no script change
  needed — the ratchet is shape-generic).
- **Out of scope (deliberate):** the **ask/log discrimination** *dataset* eval lives in
  `clarify`/`food-photo` where the asking mechanic is built — not here. This change only lands the
  *policy text* in the prefix and the *tone* judge.

## Capabilities

### New Capabilities
- `coach-persona`: the honest Coaching Voice + precision-first clarification policy as the shared,
  prompt-cached prefix content every LLM call inherits (ADR-0015).

### Modified Capabilities
- `llm-client`: the stable system prefix gains the persona + clarification-policy content (was a
  routing-only instruction); still one cached block, now reliably above the cache minimum.
- `eval-framework`: adds the **judge-eval kind** (LLM-graded rubric, fresh judge, double-judge on
  borderline, CRITICAL gating) alongside the existing dataset graders, seeded with `coach-persona-tone`.

## Impact

- **US/PRD:** no direct US (shared substrate); underpins US-3 (food-photo), US-6 (clarify), US-9
  (reviews). Ties to PRD §4 coaching-quality intent.
- **New code:** persona/policy content in `src/llm/systemPrefix.ts`; judge harness
  (`evals/judge.ts` + cases in `evals/cases/coach-persona-tone.eval.ts`), wired into `evals/run.ts`.
  No new npm script (judge runs under `npm run evals`; ratchets under `check:evals`).
- **Invariants touched:** #5 **no agent loop** — the prefix stays one cached block, no loop added;
  the judge eval is a single extra LLM call per case, **local only**. #6 **language** — prose mirrors
  user, structural fields English (now enforced by the tone rubric). #3 **estimate honesty** —
  persona surfaces estimates as estimates.
- **Memory/cost:** prefix grows by a few hundred tokens — one-time, **prompt-cached**, so per-message
  cost *drops* once it caches (it now exceeds the 2048-token minimum). Judge evals call the paid LLM
  but run **locally only** (ADR-0013); CI stays key-less via the committed-score ratchet. Within the
  M5 ≤ $3/mo cap; judge suites are few by construction.
