## Why

`food-photo` (US-3 core) logs a plate in one vision call but was deliberately shipped **without**
the precision-first interactive ask (the scope split noted in the backlog): invariant #4 discards the
image right after the vision call, so a follow-up question can't re-run vision — its answer must be
resolved by a **text-only** refine over the held item list, a distinct mechanic from the text-log ask.
This change lands that ask, completing US-3's precision half and extending the US-6 Open Question
mechanic to plates. Now, because the two upstreams (`food-photo`, `clarify`) are both done.

## What Changes

- **Vision flags one hidden high-leverage plate mover.** `estimatePlate`'s schema gains an optional
  **plate-level** `clarify` object (unknown + question + optional fixed choices) — the model raises it
  only for a hidden calorie-mover (oil/butter, sauce/dressing, fried-vs-baked, unknown portion). Still
  **one** vision call (invariant #5); the flag rides the existing structured response, no extra call.
- **`logPhoto` returns a `LogOutcome`** (the same discriminated `logged | ask` union `logFood`
  already returns) instead of a bare `Confirmation`. On a raised plate `clarify` it holds the extracted
  **item list** and asks; otherwise it writes rows and confirms exactly as today.
- **A photo-variant Open Question.** The existing `OpenQuestion` becomes a discriminated union: the
  current text-log shape (`variant: 'text'`) plus a new `variant: 'photo'` holding the resolved item
  **list** (`ResolvedFood[]`), the plate `clarification`, meal, and date — **no image** (already
  discarded, invariant #4). Reuses the same ephemeral in-memory store, TTL, and inline-keyboard UI.
- **One text-only refine resolves the plate ask.** The answer applies via **one** text-only
  structured call (`≤1` LLM call, invariants #4/#5) that adjusts the held items for the answered mover
  (e.g. "with 1 tbsp oil"), then writes one code-scaled `food_log` row per item and confirms — never
  re-running vision.
- **Expiry logs every held item as an `estimate`** (invariant #3 — never drop): the plate fallback
  writes all held items with their detected macros, mirroring the text fallback.
- **Bot wiring:** the `message:photo` handler stores a raised plate question and poses it; the pending
  text/callback resolve paths handle both variants.

## Capabilities

### New Capabilities
<!-- none — this extends two existing capabilities -->

### Modified Capabilities
- `food-photo-logging`: `logPhoto` MAY now defer to **one plate-level clarifying question** on a hidden
  high-leverage mover (vision flags it in the same one call) instead of writing immediately; on the
  answer or on expiry it logs. The existing log-immediately, per-item fact/estimate, one-row-per-item,
  and image-never-persisted requirements are unchanged.
- `open-question-clarification`: the Open Question and its resolve/expiry paths gain a **photo variant**
  that holds an **item list** and is refined by **one text-only** structured call (no re-vision), and
  whose expiry logs **all** held items as estimates. The text-variant behavior is unchanged.

## Impact

- **Code:** `src/food/photo.ts` (plate `clarify` schema + one text-only `refinePlate` call),
  `src/food/service.ts` (`logPhoto` → `LogOutcome`; a photo expiry/resolve path), `src/clarify/types.ts`
  (discriminated `OpenQuestion`), `src/clarify/resolve.ts` (route the photo variant), `src/bot/bot.ts`
  (photo handler stores + asks; resolve paths branch on variant). Reuses `writeFoodLog`,
  `buildPlateConfirmation`, `buildQuestion`, the store, and the `q:<index>` callback — **no new
  duplicate symbols** (backend-conventions rule #12).
- **Invariants:** touches **#4** (image already discarded — the refine is text-only, no re-vision),
  **#5** (still one vision call + at most one refine call, no agent loop), **#3** (expiry logs honest
  estimates, never drops), **#1** (no chat history — only the held items + the reply reach the model),
  **#8** (tenant-scoped writes), **#6** (prose mirrors the caption language, values stay English).
- **LLM cost:** worst case per plate = 1 vision call + 1 text refine (only when a mover is flagged and
  answered); the common no-ask path stays at 1 call. No new call class, no agent loop.
- **Memory:** no new persistent state — the photo variant reuses the same small in-memory Map (one
  pending question per chat). No image is ever held beyond the initial vision call. Host caps unaffected.
- **US:** US-3 (ask half) + US-6 (Open Question mechanic extended to plates).
