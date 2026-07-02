## 1. Save function (re-read rows → sum → portion row)

- [x] 1.1 Add `saveDishToCatalog(client, userId, rowIds: number[], name: string)` in `src/food/`
  (sibling of `addToCatalog.ts`): re-read the tenant-scoped `food_log` rows by id (invariant #1/#8),
  sum kcal/protein/fat/carbs **in code** (invariant #2), find-or-update the user's `food_database` row
  by `(userId, name)` case-insensitive with `per: 'portion'` and the summed macros; return the row id
  + entryName. Skip missing rows; if none remain, return a not-saved result (honest, no empty row).
- [x] 1.2 Unit-test: sums the re-read rows into one portion row; find-or-update refreshes (no
  duplicate) on a second save; tenant-scoped (never touches another user's / a global row); a missing
  row id is skipped; empty → not saved.

## 2. Pending `saveDish` name question + service method

- [x] 2.1 Add a `saveDish` variant to the pending Open-Question union (`src/clarify/types.ts`) holding
  the row ids + meal/date (NO macros — invariant #1) + `askedAt` for the lazy TTL (ADR-0019). It is a
  free-text question (no options).
- [x] 2.2 Add `FoodService.saveDish(chatId, rowIds, name)` in `service.ts` + `types.ts`: resolve user,
  call `saveDishToCatalog`, enqueue the `food_database` mirror job (US-10, best-effort), return a
  localized confirmation. Route the pending `saveDish` answer through the existing `resolveAnswer`
  dispatch (variant branch) so the name reply lands here.
- [x] 2.3 Localize the name prompt + the saved confirmation (RU/UA/EN, invariant #6; `per`/enums stay
  English).

## 3. Plate confirmation button + bot wiring

- [x] 3.1 Extend `Confirmation` with an optional `dish?: { rowIds: number[]; suggestedName: string }`
  (`src/food/types.ts`); `buildPlateConfirmation` sets it when `rows.length > 1` (row ids from the
  written rows; suggested name from the caption).
- [x] 3.2 In `logPhoto` (and the plate answer/expiry paths that confirm a multi-row plate), populate
  `confirmation.dish` from the written rows.
- [x] 3.3 Bot (`src/bot/bot.ts`): a new `food:savedish:<ids>` callback prefix. `replyConfirmation`
  renders the "➕ Save as dish" button when `confirmation.dish` is present AND the `food:savedish:<ids>`
  payload fits the 64-byte callback limit (else omit + `log` a note). The tap parses the ids, sets the
  pending `saveDish` question (clarify store) + asks the localized name; the next text resolves it via
  the existing pending path → `deps.food.saveDish`. Reply with the saved confirmation.

## 4. Verification (invariants)

- [x] 4.1 Test (service/bot): tap → name reply → one `food_database` `portion` row with the summed
  macros; confirms; no LLM call.
- [x] 4.2 Test (reuse — invariant #3): after saving, logging the dish name resolves to `fact` with the
  saved portion macros (one portion); "2 <name>" scales by two in code. (Drive `resolveFood`/log path
  with a stubbed catalog row = the saved dish; assert `source: fact`, no estimate call.)
- [x] 4.3 Test: numbers are re-read from the rows at save (invariant #1) — a stale macro in UI/callback
  state is never used; the sum matches the DB rows.
- [x] 4.4 Test: single-item plate → no `dish` payload / no button (guard); oversized id payload →
  button omitted, logged.
- [x] 4.5 Test: the mirror enqueue fires after a successful save and a mirror failure never breaks the
  reply (invariant #1, US-10).
- [x] 4.6 Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`. (No LLM eval —
  the flow is deterministic; log the ADR-0013 skip.)

## 5. Docs

- [x] 5.1 `docs/current-state.md` — note composite-dish landed (M3/M4 food track) + date.
- [x] 5.2 `docs/requirements.md` §8.2 (food logging) — document save-a-dish + reuse-by-name; PRD US-2
  acceptance note. `CONTEXT.md` glossary: "Composite Dish" (a user `portion` product = summed
  components).
- [x] 5.3 ADR check: the composite = plain `portion` row (no new table) is a real design choice with a
  rejected alternative (dishes table) — write a short ADR if the docs-check ADR trigger fires; else
  cite this change's design.md. Update `docs/adr/README.md` if an ADR is added.
- [x] 5.4 `npm run docs:check` exits 0.

## 6. Review (maker ≠ checker)

- [ ] 6.1 Hand the diff to a SEPARATE reviewer subagent (the `review` skill: Standards + Spec axes) and
  resolve findings BEFORE commit. No self-approval.
