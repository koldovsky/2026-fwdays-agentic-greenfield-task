## 1. Dedupe `toDbDate` (dup-gate rule #12, prerequisite)

- [x] 1.1 Add `src/util/date.ts` with `export const toDbDate = (isoDate: string): Date => new Date(\`${isoDate}T00:00:00.000Z\`)` (one home, doc-commented: user-local calendar day as a `@db.Date` UTC-midnight value, no TZ skew).
- [x] 1.2 Repoint the four verbatim copies to import it and delete the local `const`: `src/food/write.ts`, `src/metrics/write.ts`, `src/metrics/service.ts`, `src/query/aggregate.ts`. No behavior change.
- [x] 1.3 Add `test/util/date.test.ts`: asserts the ISO date maps to UTC midnight (e.g. `2026-07-01` → `2026-07-01T00:00:00.000Z`). Existing food/metrics/query suites stay green.

## 2. Data layer — `progress_notes` table + migration

- [x] 2.1 In `prisma/schema.prisma`, add model `ProgressNote` (`@@map("progress_notes")`, `id Int @id @default(autoincrement())`, `userId Int @map("user_id")`, `date DateTime @db.Date`, `observations String`, `createdAt DateTime @default(now()) @map("created_at")`, `user User @relation(fields:[userId], references:[id], onDelete: Cascade)`, `@@index([userId, date])`). Add `progressNotes ProgressNote[]` to `User`. Remove `progress_notes` from the schema-comment deferred-tables list. **No image column** (invariant #4 at rest).
- [x] 2.2 Hand-author the migration `prisma/migrations/<ts>_progress_notes/migration.sql` following the `_init` style: `CREATE TABLE "progress_notes"` (columns + `created_at` default now), a FK to `users(id)` `ON DELETE CASCADE`, and an index on `("user_id","date")`. Sandbox has no DB — `prisma migrate dev` cannot run; `migrate deploy` applies it on-box at container start.
- [x] 2.3 Run `npm run db:generate` so the Prisma client types include `ProgressNote` (needed for typecheck). If the client cannot be regenerated in-sandbox, log the skip and note the deploy-time generate.

## 3. Trigger detection (`src/progress/detect.ts`)

- [x] 3.1 Add `isProgressCaption(caption: string): boolean` matching a progress keyword case-insensitively: RU `прогресс`, UA `прогрес`, EN `progress` (a single anchored regex; note the UA form is a prefix of the RU form). Comment the intentional keyword-opt-in collision (a food photo captioned "progress" diverts — accepted).
- [x] 3.2 `test/progress/detect.test.ts`: RU/UA/EN captions match (any case, embedded in a sentence); a plain food caption and empty string do not.

## 4. Ephemeral `/progress` arming store (`src/progress/store.ts`)

- [x] 4.1 Add a module-scoped `Map<bigint, Date>` (armed-at) with `arm(chatId)`, `take(chatId): Date | null` (read-and-remove), a `ProgressStore` interface, and the process-wide singleton — reusing the `isExpired`/`TTL_MS` expiry semantics from `clarify/store.ts` (import `isExpired`; do not re-implement TTL — rule #12). No timer, nothing persisted (ADR-0019, invariant #1).
- [x] 4.2 `test/progress/store.test.ts`: `arm` then `take` returns the timestamp once (second `take` → null); an armed flag past `TTL_MS` reads as expired via `isExpired`; a never-armed chat → null.

## 5. Vision analysis (`src/progress/analyze.ts`)

- [x] 5.1 Add a zod schema `{ observations: string }` and `analyzeProgress(client, imageBase64, caption): Promise<string>` that calls `parseStructured` with ONE image block + a text prompt (invariant #5): describe visible markers (esp. **belly in profile**) in the honest coach voice, **forbid** a body-fat % or any diagnosis/number (invariant #2), and set the language rule — "respond in the caption's language; if no caption, respond in Russian" (invariant #6, design D6). Media type reuses the JPEG constant pattern from food-photo. Returns the observations string.
- [x] 5.2 `test/progress/analyze.test.ts` (mocked client returning fixed `{observations}`): asserts exactly ONE call, the image block is passed (base64 + media_type before the text), the caption + belly-in-profile + no-body-fat/no-diagnosis + language rule appear in the prompt text, and the parsed observations are returned.

## 6. Persist (`src/progress/write.ts`)

- [x] 6.1 Add `writeProgressNote(client, userId, date, observations): Promise<ProgressNote>` → `client.progressNote.create({ data: tenantWhere(userId, { date: toDbDate(date), observations }) })` (invariant #8; imports `toDbDate` from `src/util/date.ts`). The signature never accepts image bytes (invariant #4 at the type level).
- [x] 6.2 `test/progress/write.test.ts`: the create goes through `tenantWhere` (carries `user_id`), stores the observations + UTC-midnight date, and no image field is present in the write payload.

## 7. Orchestrator (`src/progress/service.ts` + `types.ts`)

- [x] 7.1 Add `types.ts`: `ProgressClient` (Prisma subset — `user.findUnique`, `progressNote.create`), `ProgressService` (`analyzeAndSave(chatId, caption, imageBase64): Promise<{ text: string } | null>`), `ProgressReply`.
- [x] 7.2 Add `service.ts` `createProgressService(client, anthropic, tz)`: resolve userId (tenant; null user → null, mirroring metrics/food); `analyzeProgress` (one call) → `writeProgressNote` (date = today in user TZ via `resolveDate`) → return `{ text: observations }`. Never logs raw observation values verbosely (invariant #9).
- [x] 7.3 `test/progress/service.test.ts`: happy path issues ONE vision call, writes ONE tenant-scoped row, returns the observations as the reply; unknown user → null (no call, no write).

## 8. Bot wiring (`src/bot/bot.ts`, `src/bot/types.ts`, `src/index.ts`)

- [x] 8.1 Add `ProgressService` + the arming store to `BotDeps` (`src/bot/types.ts`); wire `createProgressService(prisma, anthropic, env.TZ)` + the progress store singleton in `src/index.ts`.
- [x] 8.2 Add `bot.command('progress', ...)`: arm the store for the chat and reply with a short send-your-photo instruction.
- [x] 8.3 Add the progress branch in `handlePhoto` (before `logPhoto`): after the onboarding gate, `take` the arming flag; if `isProgressCaption(caption)` **or** the flag is present-and-fresh (`!isExpired`), download the bytes and call `deps.progress.analyzeAndSave`, reply with the observations; else fall through to the existing food `logPhoto`. Consume the flag on every photo so a stray `/progress` can't reroute a later food photo.
- [x] 8.4 `test/bot/bot.test.ts`: `/progress` arms + replies; a captioned progress photo routes to the progress service (not `logPhoto`); an armed uncaptioned photo routes to progress; an unarmed uncaptioned photo still routes to `logPhoto`; an expired/absent flag → food path.

## 9. Verify the invariants (tests)

- [x] 9.1 **CRITICAL — image never persisted (invariant #4):** vitest tests spy on `fs` write paths (`writeFile`/`writeFileSync`/`createWriteStream`/`fs.promises.writeFile`) and assert ZERO calls across the progress run. Coverage is a union: `test/progress/service.test.ts` spies the analyze→save half and `test/bot/bot.test.ts` (the "writes nothing to disk across the progress route" case) spies the download→base64 half on the progress route — together spanning download → analyze → save. The download helper returns base64 and receives no path. (Split-then-unified per reviewer finding #1.)
- [x] 9.2 **One vision call, no loop (invariant #5):** assert `analyzeProgress` / `analyzeAndSave` issues exactly one client call and no re-vision.
- [x] 9.3 **Tenancy (invariant #8):** the `progress_notes` write goes through `tenantWhere`; another user's rows are never touched.
- [x] 9.4 **No numbers/no image at rest (invariants #2/#4):** the stored row holds only `user_id`/`date`/`observations`/`created_at`; the schema has no image column and the model emits prose, not a fabricated metric.
- [x] 9.5 **Language mirror (invariant #6):** covered by 5.2 — the prompt carries the mirror-caption + Russian-default rule.

## 10. Evals (deferred, logged)

- [x] 10.1 Do NOT wire a live judge eval in this change: observation quality (coach voice, belly marker, no body-fat %/no diagnosis) is subjective and needs a labeled image set + a key — can't run in-sandbox. Log the skip (ADR-0013 local-run) and note the deploy-time follow-up; the load-bearing behaviors are covered by the §9 tests.

## 11. Gates, docs, review

- [x] 11.1 Run the static + test gates: `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck` — all green (skip-with-note any gate blocked in-sandbox, e.g. typecheck if the Prisma client can't regenerate without a DB).
- [x] 11.2 Duplication gate: cross-checked every new symbol/schema/regex against all of `src/`. `toDbDate`→`src/util/date.ts` (one home, 5 importers); `detectLang`/`isExpired`/`TTL_MS` reused (no re-impl); the `image/jpeg` media type extracted to `src/llm/structured.ts` `TELEGRAM_PHOTO_MEDIA_TYPE` (killed copy #2 in food/photo + progress/analyze). One pre-existing spread — `resolveUserId` across food/metrics/query(+progress) — is too large to fold cleanly (touches 3 archived services); filed as follow-up backlog change **`shared-tenant-resolve`** (shared-lang/shared-fmt precedent), progress follows food's established per-service pattern meanwhile.
- [x] 11.3 Update `docs/current-state.md` (M5 progress-photo landed; body track closed alongside metrics) + flip any AGENTS.md planned→live if applicable; run `npm run docs:check`.
- [x] 11.4 **Maker ≠ checker (mandatory, final):** a SEPARATE Opus reviewer subagent ran the `review` skill (Standards + Spec axes) → **APPROVE, no CRITICAL/MAJOR** on either axis; the six invariants were verified at the type/schema level. Findings resolved: #1 (fs-spy split) closed by the new unified progress-route fs-spy test (task 9.1); #2 (regex substring match) is in-spec (accepted collision, design Risks); #3 (silent drop on failed download) matches the existing food-path behavior — accepted; #4 (`resolveUserId` spread) filed as the `shared-tenant-resolve` follow-up. No self-approval — maker and checker were distinct Opus subagents.
