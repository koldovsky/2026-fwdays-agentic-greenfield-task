# ADR-0024 — Nutrition-label photos are `fact`; the caption drives the item list; a media group is one vision call

*Status: Accepted · Date: 2026-07-02 · Source: [openspec/changes/photo-label](../../openspec/changes/photo-label/design.md)
(design D1/D2/D3), US-3 (`food-photo-logging`). Builds on: [ADR-0003](./0003-raw-anthropic-api-no-agent-framework.md)
(one structured call, no agent loop), [ADR-0008](./0008-no-image-persistence.md) (images never persisted),
[ADR-0019](./0019-in-memory-open-question-store.md) (ephemeral in-memory store precedent). Extends
invariant #3 (see [AGENTS.md](../../AGENTS.md)).*

## Context

The photo path (US-3, `food-photo`) was built on one assumption: a photo is a **plate of food to
identify visually**. `estimatePlate` prompted the model to "identify every distinct food on this
plate", returned visual macro guesses, and everything read from the image was tagged `estimate`
(±20–30%). The caption was a naming hint, not a source of items.

Real usage breaks that. A user sends **nutrition-facts labels** (КБЖУ tables with exact per-100g/ml
macros) plus a caption listing what they actually ate with quantities: *"coffee + 20g cream + 1 tsp
sugar; protein 25g on 250ml milk"*. The old flow (a) logged the labelled cream/protein/milk as
`estimate` even though the label prints exact numbers, (b) **dropped** the coffee and sugar entirely
(no matching photo to "see"), and (c) processed a multi-photo Telegram message as several independent
vision calls, only one of which carried the caption — so cross-photo pairing (25g protein ↔ the
protein label) was impossible.

## Decision

Three coupled changes, kept to code + prompt + docs — no Prisma migration, no new dependency, no
second model call.

### D1 — A nutrition label the user provides is a `source: fact`
Macros read from a printed label are **verified data for that product**, unlike a ±20–30% visual
guess. We log them as `fact` using the printed per-100g/ml values scaled by the caption quantity, and
**extend invariant #3** from "Food Database match = fact" to "Food Database match **or** a nutrition
label the user provided = fact". The vision item carries a model-emitted `fromLabel: boolean` tied
strictly to "macros read from a printed nutrition-facts / КБЖУ table visible in an image".
- **Precedence: label > Food Database > visual/typical.** A `fromLabel` item keeps its own label
  macros and is **not** overridden by `lookupFoodsByNames` — the label the user just showed is more
  accurate for that product than a fuzzy catalog match. Only non-label item names are looked up (one
  batched query, no N+1; a fully-labelled group issues no query at all).

### D2 — The caption is the authoritative item list; one item per caption entry
The vision prompt is rewritten: images may be a plate **or** nutrition labels/screenshots; the
caption lists what was eaten with quantities and is authoritative. The model emits **one item per
caption entry** and, for each, either reads a matching label (`fromLabel=true`), reads the plate
visually, or uses typical macros (`fromLabel=false`) — converting the stated amount (g/ml/tsp/count)
into `qty` in the chosen `per` basis. **Text-only items with no photo (sugar, black coffee) are
therefore kept, not dropped.** `resolvePlate` maps `fromLabel=true → fact` (own macros), else keeps
today's batched hit→fact / miss→estimate logic. Still **zero** extra LLM calls (invariant #5).

### D3 — A multi-photo media group is one logging event (one vision call)
grammY delivers a Telegram media group as N separate `message:photo` updates sharing one
`ctx.message.media_group_id`, with the caption on one of them. A bot-layer buffer
(`src/bot/mediaGroup.ts`: `Map<mediaGroupId, { images, caption, timer }>`) collects each group's
downloaded base64 images + caption over a short debounce (reset on each photo) and flushes **once** to
`logPhoto(chatId, caption, images)` → **one** `parseStructured` vision call over all images (invariant
#5, no agent loop). A photo with **no** media group flushes immediately as a one-element array.
Progress-photo routing (`isProgressPhoto`) is decided **per photo, before** buffering, so a progress
photo never enters the food buffer. The buffer holds only transient base64 + a timer and is cleared on
flush — **no image bytes are ever persisted** (invariant #4, extended CRITICAL fs-spy test across the
N-image run). The debounce scheduler is injected so the buffer is unit-testable with no real timers.

## Consequences

- **+** The primary US-3 flow ("here are the labels, here's what I ate") is now accurate (labels =
  fact) and lossless (every caption item logged). Protects the core logging metric in PRD §4.
- **+** LLM cost is neutral-to-lower: a 3-photo group goes from 3 vision calls to 1. Input tokens rise
  modestly with N images in that one call, but total calls drop.
- **+** No schema change, no new dependency, no second model call — ships in the normal image build
  (CI → GHCR → Coolify pull); rollback = redeploy the prior image (no data shape changed).
- **−** `fromLabel` is model-emitted, so a wrong `true` would over-trust a visual guess as `fact`.
  Mitigation: the prompt ties `fromLabel=true` strictly to a printed numeric macro table visible in an
  image; the estimate tag stays the pressure-release for everything else. Covered by a deploy-time
  vision eval (needs a labeled image set + key — ADR-0013).
- **−** A straggler group photo landing after the debounce flush degrades to its own single-photo log
  (never a crash or a lost item). The debounce window is a single constant (~400ms) behind the seam.
- **−** Extending invariant #3 is a real semantic change, contained to this ADR + one AGENTS.md line;
  `fact` still means "verified, not a ±20–30% guess", which a printed label satisfies.

## Alternatives considered

- **A third `source: label` enum value** (instead of folding into `fact`) — more literally honest
  ("read via vision, OCR may err"), but it ripples through the Prisma enum (a migration), every
  confirmation/review string, the Notion mapper, and every fact/estimate test — disproportionate to
  the signal. Rejected (design D1).
- **Keep label macros as `estimate`** — rejects the core complaint; the whole point is that a printed
  label is not a ±20–30% guess. Rejected.
- **Photo drives the item list, caption only annotates** — keeps the current shape but still can't
  emit an item that appears in no photo, so sugar/coffee stay dropped. Rejected (design D2).
- **One vision call per photo, just fix labels** — leaves 3 photos → 3 replies with the caption on
  only one, so cross-photo pairing is impossible. Rejected (design D3).
- **Buffer the media group in a middleware / external store** — overkill for an in-process, RAM-tight
  single-process bot (invariant #7). An in-memory `Map` mirrors the existing ephemeral stores
  (clarify / progress-arm, ADR-0019). Chosen.
