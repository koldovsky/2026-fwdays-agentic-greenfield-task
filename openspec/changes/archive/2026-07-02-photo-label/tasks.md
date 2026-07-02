## 1. Vision contract: label-aware, caption-driven

- [x] 1.1 Add `fromLabel: boolean` to `plateItemSchema` in `src/food/photo.ts` with a describe() that
  ties it strictly to "macros read from a printed nutrition-facts / КБЖУ table visible in an image".
- [x] 1.2 Rewrite the `estimatePlate` prompt: images may be a plate OR nutrition labels/screenshots;
  the caption is the authoritative list of eaten items + quantities; emit one item per caption entry;
  for each, if a label gives its macros use those printed per-100g/ml values and set `fromLabel=true`,
  else read the plate visually or use typical macros (`fromLabel=false`); convert stated amounts
  (g/ml/tsp/count) into `qty` in the chosen `per` basis. Keep the plate-level `clarify` guidance.
- [x] 1.3 Change `estimatePlate` to accept `images: string[]` and pass them all as
  `StructuredImage[]` to `parseStructured` — still exactly one call (invariant #5).
- [x] 1.4 In `resolvePlate`, map `fromLabel=true` → `FoodSource.fact` using the item's OWN (label)
  macros WITHOUT a Food-DB override; keep today's hit→fact / miss→estimate logic for `fromLabel=false`.
  Only look up the non-label item names (precedence label > Food-DB > visual).
- [x] 1.5 Confirm `refinePlate` still round-trips a `fromLabel` item correctly (it re-runs `plateSchema`
  text-only); default/carry `fromLabel` so a refined label item stays `fact`.

## 2. Service wiring

- [x] 2.1 Change `logPhoto` in `src/food/service.ts` + the `FoodService`/`logPhoto` type in
  `src/food/types.ts` from `imageBase64: string` to `images: string[]`; forward to `estimatePlate`.
- [x] 2.2 Verify the clarify/Open-Question, write-per-item, and confirmation paths are unchanged by
  the multi-image + label flow (no per-plate total; one code-scaled tenant-scoped row per item).

## 3. Bot layer: media-group buffer

- [x] 3.1 Add a media-group buffer seam (e.g. `src/bot/mediaGroup.ts`): `Map<mediaGroupId,
  { images: string[]; caption: string; timer }>` with a debounce flush; injectable clock/flush so it
  is unit-testable without real timers. A photo with no `media_group_id` flushes immediately as a
  one-element array.
- [x] 3.2 Wire `handlePhoto` (`src/bot/bot.ts`): keep `isProgressPhoto` routing per-photo BEFORE
  buffering; download each food photo to base64 and add to the group buffer; on flush call
  `deps.food.logPhoto(chatId, caption, images)` and reply (confirmation or ask), exactly one reply
  per group.
- [x] 3.3 Ensure the buffer holds only transient base64 + timer and is cleared on flush (invariant #4,
  #7 memory).

## 4. Verification (one per touched invariant)

- [x] 4.1 Test: a `fromLabel=true` item is written as `source: fact` with the label macros scaled by
  the caption qty, and is NOT overridden by a Food-DB match (invariant #3 extension, precedence).
- [x] 4.2 Test: caption-drives — a text-only item with no matching photo (e.g. "1 tsp sugar") is still
  logged (estimate), alongside labelled items; no caption item dropped.
- [x] 4.3 Test: the media-group buffer collects N photos sharing one `media_group_id` and flushes ONE
  `logPhoto` call with all images + the single caption; a lone photo flushes immediately.
- [x] 4.4 Test: fs-spy across the full multi-image `logPhoto` run asserts ZERO disk/DB/storage writes
  of any image bytes (invariant #4 — extend the existing CRITICAL fs-spy test to N images).
- [x] 4.5 Test: still exactly ONE `parseStructured` vision call for a multi-photo group (invariant #5,
  no agent loop); row macros come from code-scaling (invariant #2), writes tenant-scoped (invariant #8).
- [x] 4.6 Test: a progress photo (caption keyword or `/progress` arming) bypasses the food buffer.
- [x] 4.7 Run `npm test`, `npm run typecheck`, `npm run lint`. (Live vision-accuracy eval for
  label-as-fact / caption-drives is deploy-time — needs a labeled image set + `ANTHROPIC_API_KEY`,
  ADR-0013; log the skip.)

## 5. Docs

- [x] 5.1 Write a new ADR (`docs/adr/00XX-photo-label-as-fact.md`): label-as-fact (extends invariant
  #3) + caption-drives-item-list + media-group-one-call; alternatives considered. Add its README index row.
- [x] 5.2 Update `AGENTS.md` invariant #3 wording to "Food Database match **or** a nutrition label the
  user provided = fact; otherwise a flagged estimate".
- [x] 5.3 Update `docs/current-state.md` M4 line + date with the photo-label landing.

## 6. Review (maker ≠ checker)

- [x] 6.1 Hand the diff to a SEPARATE reviewer subagent (the `review` skill: Standards + Spec axes)
  and resolve its findings BEFORE commit. No self-approval.
