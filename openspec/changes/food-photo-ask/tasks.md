## 1. Open Question union (clarify types)

- [x] 1.1 In `src/clarify/types.ts` make `OpenQuestion` a discriminated union on `variant`: the
  existing fields under `variant: 'text'`, plus a new `variant: 'photo'` holding `items:
  ResolvedFood[]`, `clarification`, `meal`, `date`, `askedAt` (no `parsed`, no image). Keep `LogOutcome`
  and `OutboundQuestion` unchanged.
- [x] 1.2 Update `test/clarify/*` and any text-path constructor of `OpenQuestion` to set `variant:
  'text'`; confirm the existing clarify suite still compiles/passes (no behavior change).

## 2. Vision plate `clarify` flag + text-only refine (food/photo)

- [x] 2.1 In `src/food/photo.ts` add an **optional** plate-level `clarify` field to `plateSchema` (the
  `RawClarify` shape: `unknown`, `question`, optional `kind`, optional `options`); update
  `estimatePlate` to return `{ items, clarify }` and prompt the model to raise `clarify` only for a
  hidden high-leverage mover (oil/butter, sauce/dressing, fried-vs-baked, unknown portion). Still ONE
  vision call (invariant #5).
- [x] 2.2 Add `refinePlate(anthropic, items, answer)`: ONE text-only `parseStructured` call (no
  `images`) over the held items + the answer → adjusted `PlateItem[]`. No re-vision (invariant #4),
  ≤1 call (invariant #5), only items + reply to the model (invariant #1).

## 3. Service: logPhoto → LogOutcome + photo resolve/expiry (food/service)

- [x] 3.1 Change `logPhoto` to return `Promise<LogOutcome | null>`: build the photo-variant
  `OpenQuestion` + `buildQuestion(clarify)` when `estimatePlate` flags `clarify` (via `toClarification`),
  else write rows and return `{ kind: 'logged', confirmation: buildPlateConfirmation(...) }` as today.
- [x] 3.2 Extend `resolveAnswer` to branch on `pending.variant`: photo → `refinePlate` → `resolvePlate`
  → one `writeFoodLog` per item (tenant-scoped, invariant #8) → `buildPlateConfirmation`; text →
  unchanged. Route through the existing catalog fact/estimate + code-scaling (invariant #2).
- [x] 3.3 Extend `logExpiredEstimate` to branch on `variant`: photo → write every held item as
  `source: estimate` for the captured meal/date (invariant #3, never drop); text → unchanged.

## 4. Bot wiring (bot/bot.ts)

- [x] 4.1 Update `handlePhoto` for the new `LogOutcome`: on `kind === 'ask'` → `deps.clarify.set` +
  `askClarify` (mirror `dispatch`); on `kind === 'logged'` → `replyConfirmation`. Image still base64
  in memory, never persisted (invariant #4).
- [x] 4.2 Confirm `handleText` / `handleClarifyCallback` need no per-variant code (the variant branch
  lives in the service `resolveAnswer` / `logExpiredEstimate`); adjust only if a type requires it.

## 5. Tests + invariant verification

- [x] 5.1 `test/food/photo.test.ts`: `estimatePlate` surfaces `clarify` when the model returns it and
  omits it otherwise (still one vision call); `refinePlate` makes exactly one text-only call with **no
  image** in the request (assert the `images` arg is absent).
- [x] 5.2 `test/food/service.test.ts` (or photo-service suite): a flagged plate returns `{ kind: 'ask'
  }` and writes NO row until answered; an unflagged plate logs immediately (regression). A resolved
  plate answer writes one row per item with code-scaled macros (invariant #2, totals never hand-summed)
  and correct `fact`/`estimate` tags (invariant #3).
- [x] 5.3 Invariant #4 (image-never-persisted): extend/assert the fs-spy path so the resolve/refine flow
  performs ZERO filesystem/DB writes of image bytes and issues no vision call on the refine.
- [x] 5.4 Invariant #8 (tenant scope) + expiry: a two-user test shows a plate answer/expiry writes only
  the acting user's rows; an expired plate question logs ALL held items as estimates (never drops).
- [x] 5.5 `test/bot/*`: a flagged plate stores the photo Open Question and poses it (inline keyboard for
  fixed choices); a `q:<index>` tap and a free-text answer both resolve-and-log via the service.

## 6. Static gates + docs

- [x] 6.1 `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck` all green (TS
  exhaustiveness on `variant` confirms no unhandled branch).
- [x] 6.2 Update `docs/current-state.md` (food-photo-ask landed line + M4 milestone note + date) and
  flip the backlog row; `npm run docs:check` green.

## 7. Review (maker ≠ checker)

- [x] 7.1 Hand the diff to a SEPARATE reviewer subagent (the `review` skill: Standards + Spec axes).
  Resolve every finding before commit. No self-approval.
