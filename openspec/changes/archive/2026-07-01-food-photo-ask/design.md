## Context

`food-photo` (archived) logs a plate in **one** vision call → itemized macros → per-item fact/estimate
→ one code-scaled `food_log` row per item → multi-item confirmation, discarding the image immediately
(invariant #4, fs-spy test). It deliberately shipped **without** the precision-first interactive ask.
`clarify` (archived) built the Open Question mechanic for the **text-log** path: a per-`chat_id`
ephemeral in-memory store (ADR-0019), `decideAskOrLog`, `buildQuestion`, `resolveAnswer`, an expiry
fallback, and bot wiring (`q:<index>` callback + pending-question branches in `handleText`).

This change fuses the two: a plate that hides a high-leverage calorie-mover raises **one** batched
question over the held item list, resolved by **one text-only** structured call (the image is gone, so
vision cannot be re-run) or, on expiry, logged as estimates. Both upstreams (`food-photo`, `clarify`)
are `done`, so this is now unblocked.

## Goals / Non-Goals

**Goals:**
- Land US-3's precision half + extend the US-6 mechanic to plates, reusing the existing store, TTL,
  inline-keyboard UI, and `q:<index>` callback — **no parallel clarify machinery, no new dup symbols**
  (backend-conventions rule #12).
- Keep the LLM budget at **1 vision call + at most 1 text refine** per plate; the common no-ask path
  stays at 1 call. No new call class, no agent loop (invariant #5).
- Never re-run vision on the answer (invariant #4); never drop a plate on expiry (invariant #3).

**Non-Goals:**
- No multi-turn interrogation — at most one plate question, one refine (invariant #5).
- No per-item questions — the plate raises **one** batched question (a single dominant mover).
- No image retention of any kind — the photo variant holds only the resolved item list.
- No change to the text-log ask, `progress-photo`, or reviews.

## Decisions

### D1 — `OpenQuestion` becomes a discriminated union on `variant`

Today `OpenQuestion` is a flat text-log record (`resolved`, `parsed`, `clarification`, `meal`, `date`,
`askedAt`). Add a `variant` discriminant:
- `variant: 'text'` — the existing fields verbatim (the text-log ask).
- `variant: 'photo'` — `items: ResolvedFood[]` (the resolved plate), `clarification: Clarification`,
  `meal`, `date`, `askedAt`. **No `parsed`, no image.**

`ClarifyStore` stays `Map<bigint, OpenQuestion>` untouched — the union is transparent to it. Consumers
(`resolveAnswer`, `logExpiredEstimate`, the bot handlers) branch on `variant`.

**Why over alternatives:** a *second* store/module for plates would duplicate the TTL, the
one-pending-per-chat guard, and the `q:<index>` callback — the exact rule #12 violation the loop's
step-7 gate exists to stop. A discriminated union is the minimal, type-safe extension: `switch
(q.variant)` is exhaustively checked by TS.

### D2 — `logPhoto` returns `LogOutcome` (the same union `logFood` returns)

`logPhoto` changes from `Promise<Confirmation | null>` to `Promise<LogOutcome | null>` — the existing
`{ kind: 'logged'; confirmation } | { kind: 'ask'; question; pending }` discriminated outcome. On a
raised plate `clarify` it returns `{ kind: 'ask', question: buildQuestion(...), pending: <photo
variant> }`; otherwise `{ kind: 'logged', confirmation: buildPlateConfirmation(...) }`. The bot's photo
handler gains the same `outcome.kind === 'ask'` branch `dispatch` already has for text — reusing
`deps.clarify.set` + `askClarify`.

**Why:** the ask/log fork is identical in shape to the text path; reusing `LogOutcome` +
`buildQuestion` + `askClarify` means the bot stores/poses/answers plate questions through the **same**
code paths, no parallel branch.

### D3 — Vision flags one plate-level `clarify`; a code-only trigger is insufficient

`plateSchema` gains an **optional** `clarify` object (`{ unknown, question, kind?, options? }` — the
same `RawClarify` shape the text estimate schema already carries). The model raises it only for a
hidden high-leverage mover it can *see is ambiguous* (dressing on a salad, unknown oil on fried food,
an unclear portion). Unlike the text path, there is **no** Food-DB multi-match disambiguation for
plates (items are batched and best-match-per-name), so the plate ask is **model-flagged only** — the
`decideAskOrLog` catalog-count branch does not apply. `toClarification` (already exported from
`clarify/types.ts`) normalizes the raw object — reused, not re-implemented.

**Why over a code heuristic:** "is a hidden mover present" is a semantic visual judgment; only the
vision model has the pixels. It rides the **same one** response (invariant #5) — zero extra call.

### D4 — The refine is one text-only structured call over the held items

A new `refinePlate(anthropic, items, answer)` in `src/food/photo.ts` makes **one** `parseStructured`
call (no `images` arg — text-only) whose prompt is the held items (names + per-basis macros + qty) plus
the user's answer, returning the adjusted `PlateItem[]`. It reuses the existing `plateSchema` /
`resolvePlate` pipeline to re-resolve fact/estimate and scale, then `writeFoodLog` per item. This is
`≤1` LLM call (invariant #5), sends only the held items + reply (invariant #1), and **never** an image
(invariant #4). A fixed-choice tap and free text both flow through the same call — the answer string is
just interpolated.

**Why not reuse `clarify/resolve.ts`'s `refine`:** that routes by `ClarifyKind` over a *single*
`ResolvedFood` with a `parsed` basis (quantity-rescale / descriptor-reresolve / disambiguation-by-id).
A plate has **no single `parsed`** and needs a **list** transform, so it is a distinct function living
next to the other plate logic in `food/photo.ts` — not a copy of `refine` (different input/output
shape, so rule #12 does not apply; sharing would force a leaky abstraction).

### D5 — Bot wiring branches on `variant` in the three existing entry points

- `handlePhoto`: `logPhoto` now returns `LogOutcome`; on `'ask'` → `deps.clarify.set` + `askClarify`
  (mirrors `dispatch`).
- `resolveAnswer` (service) and `logExpiredEstimate` (service): branch on `pending.variant` — photo →
  the list refine / list-estimate fallback; text → today's behavior unchanged.
- `handleText` / `handleClarifyCallback`: unchanged control flow — they already `take` the pending
  question and call `resolveAnswer` / `logExpiredEstimate`; the variant branch lives inside those
  service methods, so the callback/text handlers need no per-variant code.

## Risks / Trade-offs

- **[A stale/ambiguous plate answer mis-refines an item]** → the refine re-runs the full
  `resolvePlate` fact/estimate + code-scaling; a Food-DB hit still wins, and any item the model can't
  price stays an honest `estimate` (invariant #3). Worst case is a slightly-off estimate, never a
  dropped or fact-mislabeled row.
- **[The model omits `clarify` when a mover really is hidden]** → the plate logs immediately as
  estimates (today's behavior) — the estimate tag is the pressure-release valve (invariant #3). We do
  **not** add a code heuristic to force asks (would over-ask and cost calls).
- **[Union widening breaks an unhandled `switch`]** → TS exhaustiveness on `variant` makes any
  unhandled branch a compile error; `npm run typecheck` gates it.
- **[Extra refine call cost]** → bounded to one, and only when a mover is both flagged **and**
  answered; the no-ask path is unchanged at one call. No agent loop.

**Memory / build:** no new persistent state — the photo variant reuses the same in-memory Map (one
pending question per chat, holding a small item list, never an image). Bot stays well under 512 MB.
Build stays off-box (CI → GHCR; Coolify pulls) — no new dependency, no server build step.

**LLM calls:** 1 vision (`estimatePlate`, unchanged) + at most 1 text-only refine (`refinePlate`), both
single deterministic `parseStructured` calls with structured output over the prompt-cached system
prefix — no agent loop (invariant #5).

**ADR:** no new architectural decision — this composes ADR-0015 (precision-first), ADR-0019 (in-memory
store), and the archived `food-photo`/`clarify` designs. No ADR needed.

## Open Questions

- None blocking. TTL is inherited from the shared store (`TTL_MS`, ~10 min); the plate variant does not
  tune it separately.
