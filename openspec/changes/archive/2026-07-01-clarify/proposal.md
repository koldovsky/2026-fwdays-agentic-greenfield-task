## Why

`coach-persona` shipped the **precision-first** policy as prompt text in the shared prefix, and
`message-router` already gates the `answer` intent on a pending open question — but nothing raises,
holds, resolves, or expires one. Today a hidden high-leverage calorie-mover (unstated cooking fat,
творог of unknown fat%, unknown portion) is silently logged as an estimate instead of prompting the
**one sharp question** [ADR-0015](../../../docs/adr/0015-coach-persona-precision-first-clarification.md)
calls for. This change lands the **Open Question mechanic** so the bot asks once when — and only
when — it materially matters, then logs. Serves **US-6** (§6.6) and completes the M3 food track's
ask/log loop. The mechanic is built as a reusable module because `food-photo` (US-3) will reuse it.

## What Changes

- On the `log` path, after `resolveFood`, the system decides **ask vs log**: if a hidden
  **high-leverage** calorie-mover is ambiguous (cooking fat, sauce/dressing, fried-vs-baked-vs-raw,
  unknown portion, sugary drink, protein variant fat%, or **multiple Food-DB matches**), it raises
  **one** batched Open Question instead of writing. Complete input (complete text, clean Food-DB
  match) still **logs with no question**; sub-threshold uncertainty (≈±50 kcal) logs as an estimate.
- The Open Question is **ephemeral, in-memory** ([ADR-0019](../../../docs/adr/0019-in-memory-open-question-store.md)):
  a per-`chat_id` map holding the resolved-so-far food + routed message + target date + `askedAt`,
  with **lazy TTL expiry** checked on the next message (no timer/cron, invariant #5).
- The **next inbound message resolves** the pending question: the router is called with
  `hasPendingQuestion = true` so its `answer` intent is selectable (seam already exists). The answer
  refines the resolved food (a fixed choice via inline keyboard, or free text), then the entry logs.
- On **expiry** (next message arrives after TTL) → log the best `estimate` (`source = estimate`,
  never drop the entry), then handle the newly-arrived message fresh. Estimate is the **fallback**,
  not the first move.
- Fixed-choice answers use an inline keyboard with a new callback namespace (`q:`), dispatched in
  `bot.ts` alongside `onb:` / `food:addfdb:`; open-ended unknowns take free text.
- Adds the **ask/log discrimination** dataset eval (code grader): questions fire on high-leverage
  hidden unknowns and **only** those; complete/clean-match inputs must not trigger one (ADR-0013).

## Capabilities

### New Capabilities
- `open-question-clarification`: the ephemeral Open Question mechanic — decide ask-vs-log on a
  logging event, raise at most one batched question on a hidden high-leverage unknown, hold it
  in-memory per user, resolve it from the next message (refine → log), and on TTL expiry fall back
  to logging the best estimate. Includes the ask/log discrimination eval.

### Modified Capabilities
- `food-logging`: the `log` path MAY now **defer** the `food_log` write to a clarification when a
  high-leverage unknown is hidden — rather than always writing immediately. Complete/clean-match
  inputs are unaffected (still log with no question). The eventual write stays tenant-scoped,
  code-scaled, and source-tagged exactly as before.

<!-- message-router already specs "answer only when a question is pending" (unchanged — this change
     is its first CONSUMER). bot-runtime callback dispatch + the in-memory store are implementation
     details, not requirement changes, so no delta for them. coach-persona owns the prompt POLICY;
     this change owns the runtime MECHANIC. -->

## Impact

- **Code**: new `src/clarify/` module — the ask/log decision, the in-memory Open Question store
  (lazy-expiring map), question shaping (inline-keyboard options vs free text), and answer-resolution
  → refine → log. `src/food/service.ts` (log path returns "ask" or the confirmation; add a resolve
  entry point), `src/bot/bot.ts` (`hasPendingQuestion` on classify, `q:` callback dispatch, expiry
  handling in `handleText`). Tests under `test/clarify/`; dataset + cases under `evals/`.
- **Reuse**: `resolveFood` / `writeFoodLog` / `buildConfirmation` (food), the router's
  `hasPendingQuestion` + `answer` seam, `src/util/lang.ts` + `src/util/num.ts` (no new copies of
  `detectLang`/`fmt`), the existing namespaced-callback pattern.
- **Invariants touched**: #1 (no chat history to the model — the store holds one open question, not a
  transcript; the router still sees only the current message + the pending question), #3 (expiry
  fallback = honest `estimate`; sub-threshold uncertainty logged, not interrogated), #5 (at most one
  batched question, no multi-turn chain, no agent loop; ask-decision is code, resolution is ≤1 LLM
  call), #6 (question + confirmation prose mirror language; enums/fields stay English), #8 (the
  eventual `food_log` write stays tenant-scoped via the existing helpers).
- **Memory & cost**: the in-memory map holds one small pending record per active clarification for
  minutes (negligible vs the 512 MB cap; no DB table). LLM cost: the ask decision adds **zero** calls
  (it reads `resolveFood`'s existing result); resolving an answer reuses the single cached-prefix
  estimate call already on the log path — no new call class. No new dependencies.
