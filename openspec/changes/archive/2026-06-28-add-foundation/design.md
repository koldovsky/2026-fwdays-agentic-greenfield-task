## Context

Slice 0 of `docs/mvp-capability-plan.md`. The glossary in `docs/requirements.md` names the
entities; TC-STACK-02 makes Postgres the single datastore and TC-STACK-04 makes Prisma the
ORM with the schema in `prisma/schema.prisma` and all access through one shared client in
`lib/db/`. This change lays that schema and client down once so later slices build on a
stable model rather than evolving it under each other. No live DB is provisioned here
(TC-DEPLOY-01 defers that to a managed provider); `prisma generate` and `prisma validate`
both run offline, giving us typed client + a validated schema without a connection.

## Goals / Non-Goals

**Goals**

- One `prisma/schema.prisma` covering Employee, Template, Question, Cycle, Response, Answer,
  Dialog, Summary, UsageRow with their relations and the enums they need.
- One shared Prisma client in `lib/db/`, reused across Next dev hot reloads, exported with
  generated types and no casts (TC-TS-01).
- `prisma generate` + `prisma validate` green; full verification loop green.
- `.env.example` with a `DATABASE_URL` placeholder (TC-DEPLOY-01).

**Non-Goals**

- No `prisma migrate` / `db push`, no managed Postgres, no seed data.
- No UI, API route, or server action.
- No Zod schemas for the JSON columns yet — they are written by the slice that first reads
  each column, validating at the boundary (TC-VALID-01). This change only shapes storage.
- No auth/session tables — the single HR account (FR-AUTH-02) is configured, not stored, in
  MVP; revisit if multi-user lands.

## Decisions

- **Datasource `postgresql`; connection lives outside the schema (Prisma 7).** Matches
  TC-STACK-02/-04 and TC-DEPLOY-01. Prisma 7 removed `url`/`directUrl` from the schema
  `datasource` block: the migration/CLI connection moves to `prisma.config.ts`
  (`datasource.url`), and the runtime connection is supplied by a **driver adapter** passed
  to `PrismaClient`. So the schema block carries only `provider`; `prisma.config.ts` reads
  the direct/migration URL from `process.env` (left undefined until a DB exists, keeping
  offline `validate`/`generate` green); and `lib/db/` wires the pooled `DATABASE_URL`
  through `@prisma/adapter-pg`. The pool is lazy, so importing the client is build-safe
  with no DB provisioned. (`DATABASE_URL` = pooled/runtime, `DIRECT_URL` = direct/migration,
  both documented in `.env.example`.)
- **Ids are `String @id @default(cuid())`.** Stable, non-enumerable, URL-safe; the cycle's
  separate `token` (not the id) is the unguessable respondent link (FR-LINK-02).
- **Enums in the schema, not free strings:** `QuestionType {scale, open}` (FR-TPL-02),
  `CycleStatus {collecting, done, expired}` (FR-CYCLE-04), `RespondMode {form, interview}`
  (FR-RESP-02), `UsagePurpose {interview, summary}` (FR-USAGE-01). Postgres enforces the
  domain; the generated TS union types flow into `lib/` without hand-written parallels.
- **Template snapshot lives on the Cycle as JSON (`templateSnapshot Json`).** FR-CYCLE-03
  requires the launched cycle to freeze its template + questions so later edits never alter
  it. A JSON snapshot is the frozen copy; `templateId` keeps a soft link to the origin
  template (nullable, so deleting/altering a template never corrupts a cycle). Answers and
  dialog reference questions by the snapshot's stable question id (a `String`), not by FK to
  the live `Question` row — the snapshot is the source of truth for a launched cycle.
- **`scale` anchors are JSON on `Question` (`anchors Json?`).** FR-TPL-02's ordered
  `{value, label}` anchor list is a small, read-only, template-scoped array; a JSON column
  avoids a fourth table for data that is always loaded with its question. `null` for `open`
  questions. (A relational `ScaleAnchor` table was rejected as over-modelling for MVP.)
- **`Answer` holds both shapes, one row per question:** `scaleValue Int?` (chosen anchor
  value) for `scale`, `text String?` for `open` (FR-FORM-02, FR-AI-05). One Response per
  Cycle (one respondent per cycle, MVP), `@@unique([responseId, questionId])` so a question
  is answered once regardless of mode (FR-RESP-03). Form and interview write the same row
  shape — results are mode-independent.
- **`Dialog` stores the transcript as JSON (`messages Json`), 1:1 with Cycle.** Each message
  carries `{role, content, questionId?}` so HR can pull the raw dialog for one question
  (FR-PROGRESS-03). Per-message rows were rejected: the transcript is read whole, never
  queried by message.
- **`Summary` stores a structured report as JSON (`content Json`), 1:1 with Cycle**, plus
  the `model` used. FR-REPORT-04 wants sections + quotes-with-source-question as a
  structured object; JSON holds it, validated by Zod when written/read in the report slice.
- **`UsageRow` is append-only accounting** (FR-USAGE-01): `purpose`, `model`, `inputTokens`,
  `outputTokens`, optional `cachedInputTokens` (captured when available), and `costUsd`
  (`Float`) — the precomputed `cost()` result, stored so a historical row keeps the price
  that applied when written (FR-USAGE-02). Tied to its `Cycle`.
- **Shared client without a cast (TC-TS-01).** Augment `globalThis` with a typed
  `prismaClient` via `declare global` so the singleton needs no `as` cast; cache it off
  production to survive hot reloads:

  ```ts
  // lib/db/index.ts
  import { PrismaClient } from "@prisma/client";
  import { PrismaPg } from "@prisma/adapter-pg";

  declare global {
    // A global cache var must be declared with `var` to augment globalThis.
    var prismaClient: PrismaClient | undefined;
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

  export const db = globalThis.prismaClient ?? new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalThis.prismaClient = db;
  }
  ```

  `declare global { var prismaClient }` types `globalThis.prismaClient`, so no `as unknown
  as` is needed. Prisma 7 connects via the driver adapter (`@prisma/adapter-pg`) rather than
  a schema datasource url; the pool is lazy so importing the client opens no connection. No
  `@ts-ignore`/`@ts-expect-error` is used.

## Schema (target `prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // Prisma 7: connection URLs live in prisma.config.ts (migrations) and the
  // runtime driver adapter in lib/db/ (DATABASE_URL), not in this block.
}

enum QuestionType { scale  open }
enum CycleStatus  { collecting  done  expired }
enum RespondMode  { form  interview }
enum UsagePurpose { interview  summary }

model Employee {
  id             String   @id @default(cuid())
  fullName       String
  email          String   @unique
  role           String?
  phone          String?
  telegramHandle String?
  archived       Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  cycles         Cycle[]
}

model Template {
  id          String     @id @default(cuid())
  name        String
  methodology String
  createdAt   DateTime   @default(now())
  questions   Question[]
  cycles      Cycle[]
}

model Question {
  id         String       @id @default(cuid())
  templateId String
  template   Template     @relation(fields: [templateId], references: [id], onDelete: Cascade)
  order      Int
  text       String
  type       QuestionType
  required   Boolean      @default(true)
  anchors    Json?        // [{ value: Int, label: String }] for scale; null for open
  @@unique([templateId, order])
}

model Cycle {
  id               String       @id @default(cuid())
  token            String       @unique
  status           CycleStatus  @default(collecting)
  mode             RespondMode?
  deadline         DateTime
  subjectId        String
  subject          Employee     @relation(fields: [subjectId], references: [id])
  templateId       String?
  template         Template?    @relation(fields: [templateId], references: [id])
  templateSnapshot Json         // frozen template + questions at launch (FR-CYCLE-03)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  response         Response?
  dialog           Dialog?
  summary          Summary?
  usageRows        UsageRow[]
}

model Response {
  id        String   @id @default(cuid())
  cycleId   String   @unique
  cycle     Cycle    @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  answers   Answer[]
}

model Answer {
  id         String   @id @default(cuid())
  responseId String
  response   Response @relation(fields: [responseId], references: [id], onDelete: Cascade)
  questionId String   // stable id from the cycle's template snapshot
  scaleValue Int?     // chosen anchor value for scale; null for open
  text       String?  // respondent's words for open; null for scale
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@unique([responseId, questionId])
}

model Dialog {
  id        String   @id @default(cuid())
  cycleId   String   @unique
  cycle     Cycle    @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  messages  Json     // [{ role, content, questionId? }]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Summary {
  id        String   @id @default(cuid())
  cycleId   String   @unique
  cycle     Cycle    @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  model     String
  content   Json     // { sections: [...], quotes: [{ text, questionId }] } (FR-REPORT-04)
  createdAt DateTime @default(now())
}

model UsageRow {
  id                String       @id @default(cuid())
  cycleId           String
  cycle             Cycle        @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  purpose           UsagePurpose
  model             String
  inputTokens       Int
  outputTokens      Int
  cachedInputTokens Int?
  costUsd           Float        // precomputed cost() result, USD (FR-USAGE-02)
  createdAt         DateTime     @default(now())
}
```

## Risks / Trade-offs

- **JSON columns trade DB-level validation for flexibility** → every read/write of
  `templateSnapshot`, `anchors`, `messages`, `content` MUST go through a Zod parse in the
  consuming slice (TC-VALID-01); the schema notes this at each column.
- **Snapshot duplicates template data** → intentional (FR-CYCLE-03); the soft `templateId`
  link stays nullable so origin changes never break a launched cycle.
- **`Float` for `costUsd`** → consistent with `cost()` returning a `number`; rounding is the
  display layer's job, summed once at aggregation, not per row.
- **No migration in this slice** → schema correctness rests on `prisma validate` + generated
  types compiling; the first persistence slice runs the initial `prisma migrate` against the
  provisioned DB. If the model proves wrong then, that migration is where it is corrected.
