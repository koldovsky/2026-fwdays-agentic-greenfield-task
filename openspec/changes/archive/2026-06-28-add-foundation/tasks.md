## 1. Dependencies & Prisma init

- [x] 1.1 Add `prisma` (devDependency) and `@prisma/client` (dependency); do not run a
  live DB command. (TC-STACK-04)
- [x] 1.2 Create `prisma/schema.prisma` with the `postgresql` datasource
  (`url = env("DATABASE_URL")` pooled + `directUrl = env("DIRECT_URL")` for migrations) and
  the `prisma-client-js` generator. (TC-STACK-02)

## 2. Schema models & enums (prisma/schema.prisma)

- [x] 2.1 Add enums `QuestionType {scale, open}`, `CycleStatus {collecting, done, expired}`,
  `RespondMode {form, interview}`, `UsagePurpose {interview, summary}`. (FR-TPL-02,
  FR-CYCLE-04, FR-RESP-02, FR-USAGE-01)
- [x] 2.2 Add `Employee` (fullName, **unique** email, optional role/phone/telegramHandle,
  archived flag, timestamps) and `Template` (name, methodology, timestamps) with
  `Template 1—* Question`. (FR-DIR-01: email unique to avoid duplicate employees)
- [x] 2.3 Add `Question` (templateId FK cascade, order, text, type, required, `anchors Json?`)
  with `@@unique([templateId, order])`. (FR-TPL-02)
- [x] 2.4 Add `Cycle` (unique `token`, status default `collecting`, optional `mode`, deadline,
  `subject` → Employee, optional `template` → Template, `templateSnapshot Json`, timestamps)
  with 1—1 Response/Dialog/Summary and 1—* UsageRow. (FR-CYCLE-03, FR-LINK-02)
- [x] 2.5 Add `Response` (1—1 Cycle, cascade) and `Answer` (responseId FK cascade,
  `questionId`, `scaleValue Int?`, `text String?`, `@@unique([responseId, questionId])`).
  (FR-RESP-03, FR-FORM-02, FR-AI-05)
- [x] 2.6 Add `Dialog` (1—1 Cycle, `messages Json`) and `Summary` (1—1 Cycle, `model`,
  `content Json`). (FR-PROGRESS-03, FR-REPORT-04)
- [x] 2.7 Add `UsageRow` (cycle FK, `purpose`, `model`, `inputTokens`, `outputTokens`,
  `cachedInputTokens Int?`, `costUsd Float`, createdAt). (FR-USAGE-01, FR-USAGE-02)

## 3. Shared Prisma client (lib/db/)

- [x] 3.1 Add `lib/db/index.ts` exporting one shared `db` client, cached on `globalThis`
  across hot reloads via `declare global` (no cast, no `@ts-ignore`). (TC-STACK-04, TC-TS-01)

## 4. Env example

- [x] 4.1 Add `.env.example` with `DATABASE_URL` and `DIRECT_URL` placeholders (no real
  secret). (TC-DEPLOY-01)

## 5. Generate & verify

- [x] 5.1 Run `prisma generate` (typed client) and `prisma validate` (schema valid) — both
  offline, no DB connection, no migration.
- [x] 5.2 Run `npm run lint && tsc --noEmit && npm test && npm run build`; all green.
- [x] 5.3 Confirm no live migration ran and no managed DB was provisioned (deferred step).
- [x] 5.4 Update `docs/current-state.md` (slice done, files added, next step).
