## Context

`food-logging` already turns a terse text message into `food_log` rows through a fixed pipeline:
router → `resolveForLog` (Food DB hit = `fact`, miss = one structured estimate) → `reconcileQty` →
code-scaled write → confirmation. `food-photo` adds a **vision front door** that produces the same
rows from a plate photo (US-3, §8.3). The constraints are the project invariants: one vision call, no
agent loop (#5); numbers scaled in code, never hand-summed (#2); fact vs estimate per item (#3); the
**image never persisted** (#4); tenant-scoped writes (#8); English enums, prose mirrors language (#6).

Two facts shape the design. First, the image content-block format and the single-call seam are fixed
by the LLM client (`claude-sonnet-4-6`, structured output on a cached prefix). Second — the load-
bearing one — **invariant #4 discards the image right after the vision call**, so nothing downstream
can re-run vision. That is exactly why the interactive plate question is *not* in this change (it
would need a follow-up model call over the gone image); it is split to `food-photo-ask`.

## Goals / Non-Goals

**Goals:**
- One vision call → itemized macros → one `food_log` row per item → honest multi-item confirmation.
- Reuse the text pipeline's scale/write/confirm/lookup machinery — vision only replaces the
  *extraction* step; everything after `ResolvedFood` is shared.
- Extend the single seam for images without disturbing text callers.
- Prove the image is never persisted with a CRITICAL fs-spy test.

**Non-Goals:**
- The precision-first interactive ask on a plate (→ `food-photo-ask`).
- Per-item add-to-catalog buttons (text logging's single-item nicety; N buttons on a plate is UI
  bloat — deferred).
- Date back-dating from a photo caption ("вчера") — a plate photo logs to **today** (user TZ); a
  caption is used for naming + language, not date resolution. Noted; revisit if users ask.
- A live vision eval (needs a labeled image dataset + a key; can't run in-sandbox — deferred to
  deploy-time per ADR-0013, behavior covered by vitest).

## Decisions

**D1 — Extend the existing seam, don't fork it.** `parseStructured(client, schema, userText)` gains
an optional trailing `images?: {data, mediaType}[]` argument. When present, the user message `content`
becomes `[...image blocks, {type:'text', text}]`; when absent, it stays the current plain string.
This keeps invariant #5 literal (one `messages.create`, cached prefix, no loop) and touches zero text
callers. *Alternative rejected:* a sibling `parseVision` — would duplicate the schema-to-JSON,
prefix, and error-handling logic (backend-conventions rule #12) for no benefit.

**D2 — Vision returns a plate as a list of self-contained items.** The photo schema is a
`{ items: PlateItem[] }` where each `PlateItem` mirrors the text estimate schema's fields (`name`,
`per` ∈ the existing `FoodPer` enum, `kcal`, `proteinG`, `fatG`, `carbsG`) plus an observed `qty`.
The model prices what it sees per item; code does the rest. *Alternative rejected:* per-100g macros +
a separate grams estimate — two things to get right per item; observed per-basis macros + qty maps
straight onto the existing `reconcileQty`/`scaleMacros` path.

**D3 — Fact-vs-estimate per item, with a single batched Food DB query and NO extra LLM call on a
miss.** After vision returns N items, one `foodDatabase.findMany` (own + global via `catalogWhere`,
own preferred) fetches every candidate row whose name matches any item name; results are reduced to a
best-match-per-name map in code. A hit → `fromMatch` (`fact`, Food DB macros). A miss → a
`ResolvedFood` built from the vision item's **own** macros (`estimate`). This is the crux of "caption
naming a Food DB product prefers Food DB macros" **and** invariant #5: the miss path reuses the
already-returned visual macros — it does **not** call `estimateFood` (that would be N extra text
calls). *Alternative rejected:* per-item `lookupFood` in a loop — an N+1 the reviewer would (rightly)
flag. *Note:* multi-match disambiguation is a `clarify`/`food-photo-ask` concern — here we take the
best single match (own over global), never ask.

**D4 — Everything after `ResolvedFood` is the shared path.** Each resolved item flows through the
existing `writeFoodLog` (→ `foodLogValues` → `scaleMacros`, code-scaled, `tenantWhere`), meal from
`inferMeal(now, tz)`, date = today. No new write logic. The confirmation is a new **multi-item**
builder in `confirm.ts` that reuses the existing per-row `macroLine` + `detectLang`
(`src/util/lang.ts`) + `fmt` (`src/util/num.ts`) — no new `detectLang`/`fmt` copies (rule #12) — and
lists one line per row plus one honest estimate note if any row is an `estimate`. Language is detected
from the caption; empty caption → the module's existing default.

**D5 — Telegram photo → base64 in memory → discard.** The `message:photo` handler picks the largest
`PhotoSize`, calls grammY `ctx.getFile()` for the file path, `fetch`es the bytes from the Telegram
file endpoint, converts to base64 **in a local variable**, passes it to `logPhoto`, and lets it go
out of scope. No `fs` write, no DB column, no cache. The CRITICAL test spies on `fs` write paths and
asserts zero calls across a full `logPhoto` run (invariant #4). Media type is `image/jpeg` (Telegram
delivers JPEG for photos). *Alternative rejected:* the Files API / persisting a thumbnail — a direct
invariant-#4 violation.

**D6 — Date = today, from the user clock.** A plate photo is "what I'm eating now"; resolving a date
token would require routing the caption through the classifier (an extra call). Out of scope; logs to
the current local date like the meal inference already does.

No new ADR: this composes existing decisions (ADR-0003 Sonnet-4.6 seam, ADR-0015 persona/precision-
first, the food-logging pipeline). The image content-block shape is an SDK detail, not an
architectural choice. The *split* rationale is recorded in the backlog item + this design's Non-Goals.

## Risks / Trade-offs

- **[Image accidentally persisted by a future edit]** → a CRITICAL fs-spy vitest asserts no write
  happens during `logPhoto`; the download helper returns a base64 string and never receives a path.
- **[N+1 Food DB lookups on a multi-item plate]** → one batched `findMany` over all names + an
  in-memory best-match reduction; asserted by a test that counts one query for a multi-item plate.
- **[Model hand-computes a plate total / emits final numbers]** → the schema is per-item per-basis
  macros only; the stored numbers are `scaleMacros`'d in code; the confirmation lists per-row numbers
  with no total — three layers keep invariant #2.
- **[Vision cost creep]** → exactly one call per photo (no loop, no fan-out); Telegram photos are
  pre-downscaled and within Sonnet's ≤1568px image limit, so no client-side resizing is needed.
- **[Ambiguous/garbled plate]** → items still log as honest `estimate`s (invariant #3, the pressure-
  release valve); the interactive ask that would tighten a hidden mover is the deferred
  `food-photo-ask`, not a regression here.
- **[Language undetectable with no caption]** → falls back to the confirm module's existing default
  language; acceptable (the user can read their own numbers regardless).

## Migration Plan

Additive only — no schema/migration change (rows are ordinary `food_log` inserts). Deploy is the
standard off-box path: CI builds the image → GHCR; Coolify pulls/runs (invariant #7 — nothing builds
on the host). No rollback concerns: the new `message:photo` handler is inert until a user sends a
photo; text logging is untouched. Memory footprint: image bytes live only transiently in a buffer for
the duration of the one vision call, then are released — negligible steady-state addition (bot
≤512 MB). The live vision eval is seeded post-deploy when a key + a small labeled image set exist.

## Open Questions

- After-midnight / captioned-date edge for photos (deferred with the text pipeline's same edge).
- Whether add-to-catalog for photo estimates is worth per-item buttons — revisit after `food-photo-ask`.
