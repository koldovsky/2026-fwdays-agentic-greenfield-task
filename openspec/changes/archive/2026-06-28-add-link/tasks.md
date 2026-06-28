# Tasks — add-link

Implements FR-LINK-01, FR-LINK-02, FR-LINK-03.

Dependencies: slice 3 (add-cycles) must be archived first — the `Cycle` model,
`generateCycleToken` in `lib/cycles/link-token.ts`, `snapshotSchema` in
`lib/cycles/snapshot.ts`, and `deriveStatus`/`daysRemaining` in `lib/cycles/status.ts`
must all be present. The respondent layout at `app/respond/[token]/layout.tsx` must
exist (added in add-cabinet-shell).

---

## 1. Dependencies and database schema

- [x] 1.1 Confirm no schema migration is needed: verify `Cycle.token String @unique`
  is present in `prisma/schema.prisma` and `Cycle.status CycleStatus` carries the
  persisted enum. No changes to the schema — do not run `prisma migrate`. @trace
  FR-LINK-02

- [x] 1.2 Confirm `lib/cycles/link-token.ts` exports `generateCycleToken` and that no
  second token generator exists anywhere in the repo. If a duplicate is found, remove
  it and import from the canonical path. @trace FR-LINK-02 TC-ARCH-01

---

## 2. Domain logic (validation, boundary schema)

- [x] 2.1 Create `app/respond/[token]/schemas.ts`: export `tokenBoundarySchema` —
  `z.string().regex(/^[A-Za-z0-9_-]{43}$/)`. This schema is the single boundary
  guard used by the page before any DB call. Mark it as a shared export so the
  `respond` and `form` slices can import it without redefining the regex. @trace
  FR-LINK-03 TC-VALID-01

- [x] 2.2 Write `app/respond/[token]/queries.test.ts` (RED — tests must fail before
  implementation):
  - Mock `lib/db` so no real DB is needed.
  - `getRespondentCycleByToken` returns `null` for an unknown token (mock returns
    `null`).
  - Returns `null` when `templateSnapshot` does not parse against `snapshotSchema`
    (broken snapshot treated as not found, no throw).
  - Returns an enriched object when the cycle is `collecting`: `status`,
    `methodology` from snapshot, `questions` in order, `deadline`, `daysRemaining`
    (positive integer), `subjectFirstName` = first word of `subject.fullName`.
  - `subjectFirstName` is the first word only: given `fullName = "Олена Мельник"`,
    result is `"Олена"`. Given `fullName = "Олена"` (single word), result is `"Олена"`.
  - `subjectFirstName` is never the full name when `fullName` contains a space.
  - The returned object does NOT contain `id`, `subjectId`, `subject.email`,
    `subject.phone`, `subject.telegramHandle`, or `subject.fullName` as a field.
  - Returns the correct `status` value directly from the DB row for `done` and
    `expired` cycles (no re-derivation from deadline).
  @trace FR-LINK-01 FR-LINK-02 FR-LINK-03 BC-PRIVACY-02

- [x] 2.3 Implement `app/respond/[token]/queries.ts` to make 2.2 green:
  ```
  import "server-only";
  ```
  - `db.cycle.findUnique({ where: { token }, include: { subject: { select: { fullName: true } } } })`
  - Parse `templateSnapshot` via `snapshotSchema.safeParse`; return `null` on
    failure (never throw to the caller).
  - Extract `subjectFirstName`: `cycle.subject.fullName.split(" ")[0]`.
  - Read `cycle.status` directly from the DB row (the persisted enum value — do not
    call `deriveStatus` here; see design Decision 1).
  - Compute `daysRemaining` via `daysRemaining(cycle.deadline, new Date())` from
    `lib/cycles/status.ts`.
  - Return typed `RespondentCycle` — the return type must not include any field
    carrying PII beyond `subjectFirstName`. No `any`, no casts.
  @trace FR-LINK-01 FR-LINK-02 FR-LINK-03 BC-PRIVACY-02 TC-PURE-01 TC-TS-01

---

## 3. Services and server actions

There are no server actions in this slice — the respondent landing is a server
component (read-only fetch, no mutation). The copy-link action is client-side
clipboard API only (no server round-trip needed).

- [x] 3.1 Implement `app/(cabinet)/cycles/[id]/CopyLinkButton.tsx` (client component,
  `"use client"` directive):
  - Prop: `token: string` (opaque token, never the cycle id).
  - Constructs URL: `window.location.origin + "/respond/" + token` (client-side only,
    no server needed).
  - On click: `navigator.clipboard.writeText(url)` — on success show inline
    "Посилання скопійовано" (from `uk.respondent.linkCopied`) for ~2 s then reset;
    on failure show "Не вдалося скопіювати" (from `uk.respondent.copyFailed`) inline.
  - No page navigation. No modal. No exposure of cycle id. Lucide `Copy` outline icon.
    Sentence case. Design-system tokens.
  @trace FR-LINK-01 BC-PRIVACY-02 BC-BRAND-01

---

## 4. UI and route handlers

- [x] 4.1 Replace the body of `app/respond/[token]/page.tsx` (server component, no
  auth):
  - Await `params` then read `params.token` (Next.js App Router async params
    pattern — read `node_modules/next/dist/docs/` for the exact API before writing).
  - Validate with `tokenBoundarySchema.safeParse(token)` before any DB call. On
    failure: render the not-found UI (`respondent.notFound` + `respondent.notFoundBody`).
  - Call `getRespondentCycleByToken(token)`.
  - On `null`: render not-found UI (same message as malformed — no oracle).
  - On `status === "done"`: render a calm "already completed" page using
    `respondent.done` + `respondent.doneBody`.
  - On `status === "expired"`: render a calm "window closed" page using
    `respondent.expired` + `respondent.expiredBody`.
  - On `status === "collecting"`: render the respondent landing:
    - Greeting: `respondent.greeting` with `subjectFirstName` interpolated.
    - Methodology: `respondent.methodology` label + value.
    - Deadline: `respondent.deadline` label + `formatDaysRemaining(daysRemaining,
      uk.cycles.overdue)`.
    - Questions section header: `respondent.questions` label + count.
    - Ordered question list: text + type (read-only, no answer input controls — those
      are the respond/form slices' concern). Required questions marked with a subtle
      indicator.
  - No `notFound()` from Next.js (see design — calm 200 page, not a framework 404).
  - No cycle id anywhere in rendered HTML. No subject full name, email, or any other
    PII beyond the first name greeting.
  @trace FR-LINK-01 FR-LINK-02 FR-LINK-03 BC-PRIVACY-02 NFR-SEC-01

- [x] 4.2 Update `app/(cabinet)/cycles/[id]/page.tsx` to import and render
  `<CopyLinkButton token={cycle.token} />` in the cycle detail page header or action
  area. The cycle `token` field must be fetched in the existing detail query. Confirm
  the token is NOT rendered as a visible text element — it is passed as a prop only.
  @trace FR-LINK-01

---

## 5. Tests

- [x] 5.1 Verify `app/respond/[token]/queries.test.ts` (from task 2.2) is fully green.
  No test should use `any`, casts, or `@ts-ignore`. @trace TC-TS-01 NFR-DX-01

- [x] 5.2 Add a unit test for `tokenBoundarySchema` in
  `app/respond/[token]/schemas.test.ts`:
  - Accepts a valid 43-character `[A-Za-z0-9_-]` string.
  - Rejects an empty string.
  - Rejects a 42-character string (one short).
  - Rejects a 44-character string (one long).
  - Rejects a 10 000-character string (oversized — no DB call should occur for these).
  - Rejects a string with a disallowed character (`+`, `=`, `/`, space, `@`).
  - Rejects a valid base64 (padded with `=`) token that would otherwise be the right
    entropy but wrong charset.
  @trace FR-LINK-03 TC-VALID-01

- [x] 5.3 Manual smoke test (after tasks 4.1 and 4.2, against a real local DB):
  a. Seed or create a cycle in `collecting` status. Copy its `token` from the DB.
  b. Open `/respond/<token>` in a browser — confirm subject first name (not full name),
     methodology, deadline with days remaining, and question list render. Confirm no
     cycle id in the page HTML (inspect source).
  c. Open `/respond/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` (valid format,
     no matching cycle) — confirm the calm not-found message appears, no stack trace,
     no error screen.
  d. Open `/respond/tooshort` — confirm the same calm not-found message appears
     (Zod rejects before DB).
  e. Open `/respond/<token-of-expired-cycle>` (manually set `status = expired` in DB)
     — confirm the "window closed" page with no answer form.
  f. Open `/respond/<token-of-done-cycle>` (manually set `status = done` and
     `completedAt`) — confirm the "already completed" page, no "expired" wording.
  g. On the cycle detail page in the cabinet, click "Copy link" — confirm the URL
     `/respond/<token>` (not the id) is in the clipboard; confirm the inline
     "Посилання скопійовано" transient appears and disappears.
  @trace FR-LINK-01 FR-LINK-02 FR-LINK-03 BC-PRIVACY-02

---

## 6. Validation, docs, and archive prep

- [x] 6.1 Add the `respondent` namespace to `lib/i18n/uk.ts`:
  ```
  respondent: {
    notFound: "Посилання не знайдено або застаріло",
    notFoundBody: "Перевірте посилання або зверніться до HR",
    expired: "Час на відповідь сплив",
    expiredBody: "Дедлайн цього циклу минув",
    done: "Відповідь вже надано",
    doneBody: "Цей цикл оцінювання вже завершено",
    greeting: "Вітаємо, {name}",
    methodology: "Методологія",
    deadline: "Дедлайн",
    questions: "Питання",
    questionsCount: "питань",
    copyLink: "Скопіювати посилання",
    linkCopied: "Посилання скопійовано",
    copyFailed: "Не вдалося скопіювати",
  },
  ```
  Mirror in `lib/i18n/en.ts`. Append-only — no existing key is modified.
  @trace NFR-I18N-01

- [x] 6.2 Run full verification loop — all must be green before proceeding:
  ```
  npm run lint
  npx tsc --noEmit
  npm test
  npm run build
  ```
  No `any`, no casts, no `@ts-ignore`. Console must be silent on a healthy session.
  @trace NFR-DX-01 TC-TS-01

- [x] 6.3 Independent review pass (maker != checker): reviewer confirms:
  - Token validation fires before any DB call (task 2.1 / 4.1).
  - Same calm not-found message for malformed and unknown tokens (no oracle).
  - `subjectFirstName` is the first word only — full name never in rendered HTML.
  - No cycle id anywhere in the respondent page HTML or URL.
  - Done cycle renders "completed" page, not "expired", regardless of deadline.
  - `lib/` remains framework-free (no `next/*`, `react`, or DOM in
    `lib/cycles/`, `lib/i18n/`, `lib/schemas/`).
  - CopyLinkButton passes `token` only (not cycle id) and never renders the token
    as visible text.
  - No auth check on the public `/respond/[token]` route.
  @trace BC-PRIVACY-02 NFR-SEC-01 TC-PURE-01

- [x] 6.4 Run `npx openspec validate add-link --strict` — fix any validation errors
  before proceeding.

- [x] 6.5 Run `npx openspec validate --all --strict` — confirm no regressions in any
  other capability spec.

- [x] 6.6 Update `docs/current-state.md`:
  - Timestamp.
  - Mark `add-link` as complete.
  - Set next step to `add-respond-entry` (slice 5 — depends on this slice).

- [x] 6.7 Gate on smoke test (task 5.3) passing in full, then run:
  ```
  npx openspec archive add-link --yes
  ```
  This moves the change to `openspec/changes/archive/` and promotes the ADDED
  requirements into `openspec/specs/link/spec.md`. Do NOT archive if any smoke
  test step failed or the verification loop (6.2) is not fully green.
