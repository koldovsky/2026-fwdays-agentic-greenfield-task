## Context

The photo food-logging path (US-3, `food-photo-logging`) was built around one assumption: a photo is
a **plate of food to identify visually**. `estimatePlate` (`src/food/photo.ts`) prompts the model to
"Identify every distinct food on this plate", returns visual macro guesses, and everything read from
the image is later tagged `estimate`. `logPhoto` (`src/food/service.ts`) logs only what vision
extracts; the caption is a naming hint, not a source of items. The bot handles one photo per update
(`handlePhoto`, `src/bot/bot.ts`), and a Telegram media group arrives as several `message:photo`
updates — only one carrying the caption.

Real usage breaks all three assumptions: the user sends **nutrition-facts labels** (exact per-100g
macros) plus a caption that lists what they actually ate with quantities ("coffee + 20g cream + 1 tsp
sugar; protein 25g on 250ml milk"). Today that logs the two labelled products as `estimate` and
drops the coffee and sugar entirely.

The shared LLM seam (`parseStructured`, `src/llm/structured.ts`) **already** accepts
`images: StructuredImage[]` (an array, placed before the text) — multi-image is a caller change, not
a seam change. This design changes the vision contract and adds a media-group buffer; it does **not**
add a dependency, a data-model migration, or a second model call.

## Goals / Non-Goals

**Goals:**
- A nutrition-label photo's printed per-100g/ml macros are logged as **`source: fact`**, scaled by
  the caption quantity (extends invariant #3).
- The **caption is the authoritative item list**; every named item is logged (label→fact,
  plate→estimate, text-only→estimate). No named item is silently dropped.
- A multi-photo message (one `media_group_id`) is processed as **one** vision call over all images.
- All existing invariants hold; the plate-level clarify/Open-Question mechanic keeps working.

**Non-Goals:**
- No new `source` enum value — a label is folded into the existing `fact` (decision D1).
- No OCR/vision on the **text** path — the single-product router (`makeRouterSchema`) is untouched;
  multi-item extraction stays in the vision call, which is the only place a caption is parsed into
  items.
- No barcode lookup, no external food API, no persisting label images (invariant #4 holds).
- No change to progress-photo routing.

## Decisions

### D1 — Label-read macros are `source: fact`, not a new enum value
A printed КБЖУ label is verified data for *this* product, unlike a ±20–30% visual guess. We log it as
`fact` and **extend invariant #3** to "Food Database match **or** a nutrition label the user provided
= fact", recorded in a new ADR and an AGENTS.md wording tweak.
- *Alternative — a third `source: label`:* more literally honest ("read via vision, OCR may err"),
  but it ripples through the Prisma enum (a migration), every confirmation/review string, the Notion
  mapper, and every fact/estimate test — disproportionate to the signal. Rejected.
- *Alternative — keep `estimate`:* rejects the core complaint; the whole point is that a label is not
  a guess. Rejected.
- Precedence when sourcing an item's macros: **label > Food Database > visual/typical**. A label the
  user just showed is more accurate for that product than a fuzzy catalog match, so a `fromLabel`
  item is **not** overridden by `lookupFoodsByNames`.

### D2 — The caption is the item list; the vision call emits one item per caption entry
The vision prompt is rewritten: images may be a plate **or** nutrition labels/screenshots; the
caption lists what was eaten with quantities and is authoritative. The model emits one item per
caption entry and, for each, either reads a matching label (printed per-100g/ml, `fromLabel=true`),
reads the plate visually, or uses typical macros (`fromLabel=false`) — converting the stated amount
(g/ml/tsp/count) into `qty` in the chosen `per` basis. This keeps text-only items (sugar, black
coffee) in the output.
- `plateItemSchema` gains **`fromLabel: boolean`**. `resolvePlate` maps `fromLabel=true` →
  `FoodSource.fact` with the item's own (label) macros, skipping the catalog override; `fromLabel=false`
  keeps today's logic (batched Food-DB hit → `fact` with catalog macros, miss → `estimate` with the
  item's macros). Still **zero** extra LLM calls (invariant #5).
- *Alternative — photo drives, caption annotates:* keeps the current shape but still can't emit an
  item that isn't visible in a photo, so sugar/coffee stay dropped. Rejected.

### D3 — Multi-photo via a bot-layer `media_group_id` debounce buffer
grammY delivers a media group as N separate `message:photo` updates sharing `ctx.message.media_group_id`;
the caption rides one of them. A new buffer (`Map<mediaGroupId, { images: string[]; caption: string;
timer }>`) collects each group's downloaded base64 images and its caption over a short debounce
(reset on each arriving photo), then flushes **once** to `logPhoto(chatId, caption, images)`. A photo
with **no** `media_group_id` flushes immediately as a one-element array — the single-photo path is a
degenerate group of one. The buffer is keyed by media-group id (per chat via the id's uniqueness),
holds only transient base64 + a timer, and is cleared on flush.
- The route decision (`isProgressPhoto`, consuming the `/progress` arming flag) runs **per photo,
  before** buffering, exactly as today — a progress photo never enters the food buffer.
- `logPhoto` signature: `imageBase64: string` → `images: string[]`; `estimatePlate` passes them all
  to the seam as `StructuredImage[]`. Downstream (resolve/write/confirm/clarify) is unchanged.
- *Alternative — keep one call per photo, just fix labels:* leaves 3 photos → 3 replies and the
  caption on only one photo, so cross-photo pairing (25g protein ↔ the protein label) is impossible.
  Rejected.
- *Alternative — buffer in a middleware / external store:* overkill for an in-process, RAM-tight
  single-process bot (invariant #7). An in-memory Map mirrors the existing ephemeral stores
  (clarify/progress-arm, ADR-0019). Chosen.

### D4 — Still exactly one vision call; still no persisted image
The media group collapses to **one** `parseStructured` call with N image blocks + the caption text
(invariant #5 — no agent loop, cached system prefix reused). Every image is base64 in memory only and
released after the call; the CRITICAL fs-spy test is **extended to the N-image path** to prove no
disk/DB/storage write occurs across the whole `logPhoto` run (invariant #4).

## Risks / Trade-offs

- **Debounce flush timing** (a slow-arriving group photo lands after flush → logged as a second
  group) → pick a conservative window (~a few hundred ms, reset on each photo); a late straggler
  degrades to its own single-photo log, never a crash or a lost item. Unit-test the buffer with an
  injected clock/flush so it's deterministic (no real timers in tests).
- **Model mis-classifies a plate as a label (or vice-versa)** → `fromLabel` is model-emitted, so a
  wrong `true` would over-trust a guess as `fact`. Mitigation: the prompt ties `fromLabel=true`
  strictly to a *printed numeric macro table visible in an image*; the estimate tag remains the
  pressure-release for everything else (invariant #3). Covered by an eval case (deferred to
  deploy-time per ADR-0013 — needs the labeled image set + key).
- **Extending invariant #3** is a real semantic change → contained to an ADR + one AGENTS.md line;
  `fact` still means "verified, not a ±20–30% guess", which a printed label satisfies.
- **Larger single request** (N images) slightly raises input tokens per call, but total calls drop
  (3→1) so net LLM cost is neutral-to-lower. Memory footprint is transient base64, well within the
  512 MB bot cap; built off-box (CI → GHCR), no build step on the host (invariant #7).

## Migration Plan

Pure code + prompt + docs change — **no** Prisma migration, **no** new dependency, **no** enum
change. Ships in the normal image build (CI → GHCR → Coolify pull). Rollback = redeploy the prior
image; no data shape changed, so already-written `food_log` rows are unaffected. Live vision-accuracy
eval (label-as-fact, caption-drives) is seeded at deploy-time (needs `ANTHROPIC_API_KEY` + a labeled
image set) per ADR-0013.

## Open Questions

- Exact debounce window (start ~300–500 ms; tune against the on-box eval once a key is available).
  Not a blocker — the value is a single constant behind the buffer seam.
