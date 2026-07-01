## Context

`coach-persona` put the precision-first policy into the shared cached prefix (prompt text), and
`message-router` already excludes the `answer` intent unless a question is pending. What's missing is
the runtime: something that (a) decides ask-vs-log on a `log` event, (b) raises **one** question, (c)
holds it, (d) resolves it from the next message, and (e) expires it to an estimate fallback. The food
log path today (`src/food/service.ts` → `resolveFood` → `writeFoodLog` → `buildConfirmation`) always
writes immediately; `lookupFood` even carries a comment deferring "multi-match disambiguation … [to]
the `clarify` change." This change builds that mechanic as a reusable `src/clarify/` module because
`food-photo` (US-3) will reuse it. Storage of the pending question is settled by
[ADR-0019](../../../docs/adr/0019-in-memory-open-question-store.md) (in-memory, ephemeral).

## Goals / Non-Goals

**Goals:**
- Ask exactly one batched question **only** on a hidden high-leverage calorie-mover; log directly
  otherwise (US-6, ADR-0015). No new LLM call class for the decision.
- A small, reusable clarify module (`decide → ask → store → resolve → expiry-fallback`) that
  `food-photo` can call with a different resolver.
- Keep every invariant: no chat history to the model (#1), one call / no loop (#5), honest estimate
  fallback (#3), tenant-scoped write (#8), language-mirrored prose / English structure (#6).

**Non-Goals:**
- Fuzzy/synonym Food-DB matching (separate concern; lookup stays exact-match).
- Multi-turn clarification chains, and any background timer/cron for expiry (ADR-0019 → lazy).
- Persisting the pending question across a process restart (ADR-0019 trade-off).
- Progress-photo / plate-photo wiring (food-photo reuses this module later).

## Decisions

### D1 — The ask decision rides the resolution the log path already does (zero new call class)
The decision is split by which resolution path ran, so it never adds a call:
- **Estimate path (Food-DB miss, one existing call):** extend `estimateSchema` (`src/food/estimate.ts`)
  with an **optional** `clarify` object — `{ unknown, question, options? }` — that the model fills,
  guided by the coach-persona prefix's hidden-leverage checklist, when a high-leverage variable is
  hidden. The macro fields are still returned and become the **expiry fallback estimate**. No extra
  call — the flag rides the call already made.
- **Fact path (single clean Food-DB match, zero calls):** a clean match **logs directly** (policy).
  No LLM judgment is added to the fact path (adding one would be a new call class — rejected).
- **Multiple Food-DB matches (code, zero calls):** `lookupFood` is extended to detect >1 candidate
  (own + global catalog); code raises a disambiguation question offering the candidates as fixed
  choices. A single match behaves exactly as today.

*Alternative rejected:* a dedicated "should I ask?" LLM call after resolution — doubles cost on the
log path and violates the no-new-call-class goal. The model already sees the food on the estimate
call; piggybacking is free.

### D2 — `logFood` returns a discriminated outcome, not always a `Confirmation`
`FoodService.logFood` returns `LogOutcome = { kind: 'logged'; confirmation } | { kind: 'ask';
question; pending }`. The `ask` branch carries the outbound question (prose + optional inline-keyboard
options) and the `OpenQuestion` record to store. The bot renders one or the other. This keeps the
"defer the write" branch explicit and testable, and leaves the existing write/confirm path untouched
for complete inputs.

### D3 — `src/clarify/` module shape (reusable)
- `types.ts` — `Clarification { unknown; question; options? }`, `OpenQuestion { resolved; routed;
  date; askedAt }`, `LogOutcome`.
- `store.ts` — the in-memory `Map<bigint, OpenQuestion>` (ADR-0019) behind `set / peek / take`, with a
  pure `isExpired(askedAt, now)` against a `TTL_MS` constant. Clock injected for tests; no timer.
- `question.ts` — build the outbound message from a `Clarification`: prose in the user's language
  (reuse `src/util/lang.ts`), inline-keyboard options when `options` is present, else free-text.
- `resolve.ts` — apply an answer to the stored `OpenQuestion`: a **quantity/portion** answer rescales
  in code (reuse `src/food/scale.ts`, **zero** calls, like `correction`); a **descriptor** answer
  (fat%, fried/baked, a chosen catalog match) augments the product string and re-runs `resolveFood`
  (**≤1** call) → then the existing `writeFoodLog` + `buildConfirmation`. Reuses `src/util/num.ts` for
  formatting — no new `detectLang`/`fmt` copies.

### D4 — Bot flow in `handleText` (one pending question per user)
Order inside `handleText`, after the onboarding gate:
1. **Pending & expired** (lazy check): log the pending entry as its fallback `estimate`, clear it,
   then classify the new message fresh (`hasPendingQuestion=false`) and route normally.
2. **Pending & fresh:** classify with `hasPendingQuestion=true`. If `intent==='answer'` →
   `clarify.resolve` (refine + log), clear pending, reply the confirmation. If the model classifies a
   **non-answer** (the user moved on) → fallback-log the pending estimate (never drop), then handle
   the new message fresh.
3. **No pending:** classify as today. A `log` intent now goes through `logFood`, which may return
   `ask` → store the `OpenQuestion` and send the question.

Fixed-choice taps arrive via a new `q:` callback namespace in `handleCallback`, dispatched alongside
`onb:` / `food:addfdb:`; a tap with no matching pending question is answered and ignored (stale-tap
guard, mirrors the onboarding pattern).

### D5 — Memory, cost, build
- **Memory:** one small `OpenQuestion` per user with an active clarification, living minutes; the map
  is bounded by concurrent clarifications (negligible vs the 512 MB cap). No DB table, no migration.
- **Cost / LLM calls:** ask-decision = **0** new calls (rides the estimate call / code); resolving an
  answer = **0** (quantity refine) or **1** (descriptor re-resolve via `resolveFood`) — at most one,
  through the shared cached prefix, no agent loop (invariant #5).
- **Build off-box:** pure TS in `src/clarify/` + a schema field on an existing call; no new
  dependency, no build step on the host (CI → GHCR unchanged).

### D6 — Eval (ADR-0013)
Author an **ask/log discrimination** dataset (`evals/datasets/clarify-discrimination.jsonl`,
capability-tagged, `trace: US-6`): labeled cases asserting a question fires on hidden high-leverage
unknowns (unstated fat%, unknown portion, multiple matches) and **not** on complete text / clean
single matches. Deterministic code grader over the estimate call's `clarify` field. Live run is
deploy-time (no key in CI); the key-less ratchet gates committed scores; baseline stays passing.

## Risks / Trade-offs

- **Model over-asks (friction on every plate)** → the leverage-threshold + checklist live in the
  prefix, and the discrimination eval gates *both* directions (must-ask and must-not-ask), so drift
  is caught before archive.
- **Model under-asks (silently estimates a hidden mover)** → same eval covers the must-ask cases at a
  high bar; the estimate fallback keeps the entry honest (`source=estimate`) either way.
- **Restart drops a pending question** → accepted per ADR-0019 (rare, minutes window; user re-sends).
- **A non-answer while a question is pending** → treated as "user moved on": fallback-log the estimate
  then process fresh, so the entry is never dropped and no interrogation loop forms (invariant #5).
- **Stale `q:` tap after expiry/restart** → guarded (no pending → answer + ignore), like `onb:`.
- **Descriptor re-resolve is a second call for that event** → bounded to one, only on the answer, and
  only for descriptor (not quantity) answers; consistent with the "≤1 call" spec.

## Migration Plan

No data migration (no schema change — the store is in-memory). Deploy is the standard CI → GHCR →
Coolify pull. Rollback = redeploy the prior image; any in-flight in-memory questions are dropped
harmlessly (same as a restart). Behavior is additive: complete inputs log exactly as before.

## Open Questions

- **TTL value** — start at ~10 minutes (a constant in `store.ts`); tune later if telemetry shows
  users answer slower. Not a blocker.
- **Batching multiple hidden unknowns** — the schema allows one `clarify` object; if two high-leverage
  unknowns co-occur, the model batches them into the single question's prose. A structured multi-slot
  batch is deferred unless the eval shows it's needed.
