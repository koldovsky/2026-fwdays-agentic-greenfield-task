## Why

Users want to log a meal by **sending a plate photo** instead of typing every item (**US-3**, milestone
M4). A photo is the lowest-friction capture path and the one the PRD calls out as a headline feature.
The text-logging pipeline (`food-logging`) already resolves → scales → writes → confirms; this change
adds a **vision front door** that produces the same `food_log` rows from an image — extending the
single LLM seam rather than adding a second model-call pattern.

This is the **core US-3 slice**. The precision-first *interactive* plate question is split into a
separate `food-photo-ask` change (already filed in the backlog): invariant #4 discards the image
right after the vision call, so a follow-up question can't re-run vision — its answer needs a
text-only refine over the held item list, a distinct mechanic that warrants its own slice.

## What Changes

- **Extend the single LLM seam** (`llm-client`) to accept an **optional image** (base64 + media type)
  as an image content block placed before the text block. Still exactly **one** `messages.create`
  call on the cached system prefix, no chat history, no agent loop (invariants #1/#5). Text-only
  callers (router, food estimate, metrics) are unchanged — the image argument is optional.
- **New `food-photo-logging` capability:** a plate photo streams to the vision model in **one call**
  → a structured **multi-item** list (per-item name + `per` basis + macros + observed qty). Each item
  resolves to the shared `ResolvedFood`: a **Food DB name match → `source: fact`** (Food DB macros —
  this is "a caption naming a Food DB product prefers Food DB macros over the visual estimate"); a
  **miss → `source: estimate` ±20–30% using the vision item's own macros**, with **zero** extra LLM
  calls (the visual macros *are* the estimate). Food DB lookup is **batched** (one query for all item
  names) to avoid N+1.
- **One `food_log` row per plate item** (reusing the existing scale + write path), meal inferred from
  the user-TZ clock, date = today (user TZ). Confirmation lists **each row's own numbers** (never a
  hand-summed total — that stays the `nutrition-query` capability) with an honest estimate note,
  prose language-mirrored.
- **Telegram `message:photo` handler** (`bot-runtime`): download the largest photo size, base64 it
  **in memory**, stream to the vision call, and **discard immediately** — the image is never written
  to disk, storage, or the DB (invariant #4).
- Scope guard: **no interactive clarification** and **no per-item add-to-catalog button** in this
  slice (both deferred to keep the diff focused — see the backlog `food-photo-ask` follow-up).

## Capabilities

### New Capabilities
- `food-photo-logging`: log a meal from a plate photo — one vision call → itemized macros, Food-DB
  fact vs visual estimate per item, one `food_log` row per item, honest confirmation, and the
  image discarded immediately (never persisted).

### Modified Capabilities
- `llm-client`: the single seam gains an **optional image input** (a base64 image content block
  before the text), so vision is one more call through the same no-agent-loop seam — not a new
  model-call pattern.

## Impact

- **Code:** `src/llm/structured.ts` (optional image param), new `src/food/photo.ts` (vision call +
  schema) and photo-resolve/lookup helpers, `src/food/lookup.ts` (batched name lookup),
  `src/food/confirm.ts` (multi-item confirmation), `src/food/service.ts` + `types.ts` (`logPhoto`),
  `src/bot/bot.ts` + `types.ts` (`message:photo` handler + photo-download helper). Tests mirror under
  `test/`. Reuses `scale.ts`, `write.ts`, `resolve.ts` (`fromMatch`), `src/util/{lang,num}.ts` — **no
  new `detectLang`/`fmt`/schema copies** (backend-conventions rule #12).
- **Invariants touched:** #4 (image never persisted — the load-bearing one; a CRITICAL fs-spy test),
  #5 (still one vision call, no loop), #2 (per-row numbers scaled in code, never hand-summed), #3
  (fact vs estimate per item), #1/#8 (tenant-scoped writes; no chat history), #6 (English
  enums/structural values, prose mirrors language).
- **LLM cost:** exactly **one** vision call per photo (Sonnet 4.6, `claude-sonnet-4-6`). Vision images
  cost more input tokens than text; Telegram photos are already downscaled and ≤1568px is within
  Sonnet's limit — no extra downscaling needed. No fan-out, no loop (invariant #5).
- **Memory:** image bytes live only transiently in a buffer during the call, then are dropped — no
  persistence, negligible steady-state footprint (bot ≤512 MB, invariant #7).
- **Deps/build:** no new runtime dependency (grammY `getFile` + `fetch` download the bytes; the
  Anthropic SDK already supports image blocks). No change to the off-box build (invariant #7).
- **Evals:** vision structured-output accuracy is model-dependent but needs a labeled **image**
  dataset that can't run in-sandbox (no key, and images are heavy); the vision dataset eval is
  **deferred to deploy-time / a follow-up** (logged skip, consistent with ADR-0013's local-run
  model). Behavior is covered by deterministic vitest tests (fact/estimate tagging, per-row scaling,
  image-never-persisted, multi-item confirmation).
