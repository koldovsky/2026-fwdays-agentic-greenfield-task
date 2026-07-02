## Why

Today the photo path assumes a photo is always a **plate of food to identify visually**, so it
(a) tags everything read from the image as an `estimate` (±20–30%) even when the image is a
**nutrition-facts label** that prints exact per-100g macros, (b) drops any item the caption names
that has no matching photo (a real breakfast logged coffee+cream+sugar and protein+milk, but only
the two labelled products were logged — coffee and sugar were silently dropped), and (c) processes a
multi-photo Telegram message as several independent vision calls, only one of which sees the caption.
This makes the primary US-3 flow (log food from a photo) both inaccurate and lossy for the most
common real usage: "here are the labels, here's what I actually ate". Fixing it now, before the
demo/deploy, protects the core logging metric in PRD §4.

## What Changes

- **Nutrition-label photos are first-class.** A photo may be a КБЖУ / macro-facts label (or a macro
  screenshot), not only a plate. Macros read from a label are logged as **`source: fact`** using the
  printed per-100g/ml values scaled by the caption quantity — **not** a ±20–30% estimate. This
  **extends invariant #3** from "Food Database match = fact" to "Food Database match **or** a
  nutrition label the user provided = fact". Recorded in a new ADR + an AGENTS.md wording tweak.
- **The caption drives the item list; photos are reference.** Every item the caption names is logged
  — matched to a label photo → fact (per-100g scaled by the stated qty), visible on a plate → visual
  estimate, or text-only with no photo (sugar, black coffee) → typical estimate. Text-only items are
  no longer dropped. The vision model converts stated amounts (g / ml / tsp / count) into the qty in
  the chosen basis unit. Precedence when sourcing macros: **label > Food Database > visual/typical**.
- **Multi-photo messages collapse to one logging event.** Photos sharing a Telegram
  `media_group_id` are buffered (short debounce) and sent as **one** vision call with all images plus
  the single caption — still exactly one `parseStructured` call (invariant #5). A single photo keeps
  working as a one-image group.
- The plate-level precision-first clarify / Open Question mechanic is preserved under the new
  multi-image, caption-driven flow.

## Capabilities

### New Capabilities
<!-- none — this extends the existing photo-logging capability -->

### Modified Capabilities
- `food-photo-logging`: the vision call now treats the **caption as the authoritative item list** and
  each image as either a plate or a nutrition label; label-sourced macros are logged as **fact**
  (printed per-100g/ml scaled by the caption qty), text-only items are always logged, and a
  **multi-photo media group** is processed as one vision call over all images.

## Impact

- **Code:** `src/food/photo.ts` (schema gains `fromLabel`; prompt rewritten; `resolvePlate` maps
  `fromLabel → fact`), `src/food/service.ts` (`logPhoto` takes `images: string[]`),
  `src/bot/bot.ts` (new `media_group_id` debounce buffer seam; `downloadPhotoBase64` reused per
  photo), `src/food/types.ts` (`logPhoto` signature). Progress-photo routing (`isProgressPhoto`) is
  unchanged and still runs **before** buffering.
- **Docs:** new ADR (label-as-fact + caption-drives-item-list); AGENTS.md invariant #3 wording;
  `docs/current-state.md` M4 line.
- **Invariants touched:** **#3** (extended — label = fact; documented); **#5** stays intact (the
  media group still collapses to a single vision call, no agent loop); **#4** must hold across the
  multi-image run (the CRITICAL fs-spy test extends to N images — bytes live in memory only, never
  persisted); **#1/#2/#6/#8** unchanged (no chat history beyond caption+reply, one code-scaled row
  per item from SUM-safe writes, prose mirrors the caption, tenant-scoped).
- **LLM cost:** neutral-to-lower — a 3-photo group goes from 3 vision calls to **1**. Input tokens
  rise modestly with N images in that one call, but total calls drop. Memory: base64 for N images is
  transient and released after the call; the debounce buffer holds only base64 strings + a timer
  keyed by media-group id, well within the 512 MB cap (host is RAM-tight — invariant #7).
