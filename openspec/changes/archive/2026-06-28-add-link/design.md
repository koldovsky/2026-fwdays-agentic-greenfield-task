# Design — add-link

Implements `openspec/specs/link/spec.md` (FR-LINK-01..03). No schema migration; reuses
`generateCycleToken` from `lib/cycles/link-token.ts`, `snapshotSchema` from
`lib/cycles/snapshot.ts`, `deriveStatus` / `daysRemaining` from `lib/cycles/status.ts`,
and `formatDaysRemaining` from `lib/i18n/format.ts`.

## Goals

- Make every cycle's token routable to a stable public landing page.
- Give HR a one-click "Copy link" UX on the cycle detail page.
- Render calm, non-enumerable explanatory pages for invalid / non-collecting tokens.
- Surface subject first name only (privacy invariant, BC-PRIVACY-02).
- Keep the public respondent route free of authentication (it is token-gated only).

## Non-goals

- Answer capture or submission (respond/form slices).
- Mode selection between form and AI interview (respond slice).
- Email or messenger delivery of the link.
- Showing live answer progress on the respondent landing (results slice).

---

## Key decisions

### Decision 1: Landing driven by persisted `status`, not re-derived deadline

**Options considered:**

A. Read `status` directly from the DB row (chosen).
B. Re-derive status from `deadline` and `completedAt` at request time using
   `deriveStatus`.

**Chosen: A.** The spec (FR-LINK-03) explicitly states the landing decision is made
from the persisted `status` enum value, not by re-deriving the deadline. A `done`
cycle whose deadline has since passed must still show "completed", not "expired".
Reading the stored value honours this requirement and is simpler. `deriveStatus` is
used only to validate internal consistency during the cycles slice; the link slice
reads the already-persisted value.

**Trade-off:** If the status is stale in the DB (e.g. no background job has yet
flipped `collecting` → `expired` for a past-deadline cycle), the page reflects the
stale state. This is accepted in MVP — status transition ownership belongs to the
cycles/respond slices, not link.

### Decision 2: Same "not found" message for unknown and malformed tokens

**Options considered:**

A. Show "not found" for both unknown and malformed tokens (chosen).
B. Show a distinct "invalid link format" message for malformed tokens.

**Chosen: A.** A distinct message for malformed tokens gives a partial oracle — an
attacker can distinguish "I generated a correctly-structured token that happens to
not exist" from "I sent garbage". Using the same calm not-found message for both
eliminates this signal (BC-PRIVACY-02, NFR-SEC-01).

### Decision 3: Query lives in `app/respond/[token]/queries.ts`, not `lib/`

**Options considered:**

A. Put the query function in `app/respond/[token]/queries.ts` (chosen).
B. Put it in `lib/` as a framework-free function.

**Chosen: A.** The query uses Prisma (`db` from `lib/db/`), which is fine in `app/`
server files. `lib/` is strictly framework-free (TC-PURE-01); importing Prisma there
would violate that constraint. The query file is marked server-only via the
`import "server-only"` guard.

**ADR-worthy:** This is a project-wide pattern decision. If future slices want
co-located DB queries near their route, they follow this pattern.

### Decision 4: Copy-link as a client component co-located with the cycle detail page

**Options considered:**

A. Inline client component in `app/(cabinet)/cycles/[id]/` (chosen).
B. Shared `components/` component reusable from many screens.

**Chosen: A.** Only the cycle detail page needs copy-link in this slice. Premature
extraction adds complexity. If the respond or results slices need it too, promote it
then (TC-ARCH-01 — define once, but define when reuse is confirmed).

---

## Route: public respondent landing

**File:** `app/respond/[token]/page.tsx` (server component, no auth — public route)

```
params.token
  │
  ▼
tokenBoundarySchema.safeParse(token)
  │ failure → render <NotFoundPage />  (same as unknown token — no oracle)
  │ success
  ▼
getRespondentCycleByToken(token)
  │ returns null → render <NotFoundPage />
  │ returns cycle with status "done"     → render <DonePage />
  │ returns cycle with status "expired"  → render <ExpiredPage />
  │ returns cycle with status "collecting" → render <CollectingPage />
```

The page imports i18n strings from `lib/i18n/uk.ts` (the `respondent` namespace).
No `notFound()` from Next.js — a custom calm page is rendered for all non-collecting
cases instead of the framework's 404 mechanism, to avoid leaking route existence
through HTTP status codes (BC-PRIVACY-02).

**Note on HTTP status:** The server component returns 200 for all cases (collecting,
done, expired, unknown). Returning 404 for an unknown token would allow enumeration
via response code; a calm 200 "not found" page is the correct privacy posture here.

---

## Query: `getRespondentCycleByToken`

**File:** `app/respond/[token]/queries.ts`

```typescript
import "server-only";
// @trace FR-LINK-01 FR-LINK-02 FR-LINK-03

type RespondentCycle = {
  status: "collecting" | "done" | "expired";
  methodology: string;
  questions: TemplateSnapshot["questions"];
  deadline: Date;
  daysRemaining: number;
  subjectFirstName: string; // first word of fullName only — BC-PRIVACY-02
};

async function getRespondentCycleByToken(
  token: string,
): Promise<RespondentCycle | null>
```

Implementation steps:

1. `db.cycle.findUnique({ where: { token }, include: { subject: true } })` — if
   null, return null.
2. Parse `cycle.templateSnapshot` via `snapshotSchema.safeParse`. If parse fails,
   return null (broken snapshot treated as not found — defensive, no 500).
3. Extract `subjectFirstName`: `cycle.subject.fullName.split(" ")[0]` — never the
   full name, never email, never id (BC-PRIVACY-02, BC-PRIVACY-04).
4. Read `cycle.status` directly from the DB row (Decision 1).
5. Compute `daysRemaining` via `daysRemaining(cycle.deadline, now)` from
   `lib/cycles/status.ts`, where `now = new Date()`.
6. Return the typed object — never returns `cycle.id`, `cycle.subjectId`,
   `subject.fullName`, `subject.email`, `subject.phone`, or `subject.telegramHandle`.

**Privacy invariants enforced in the return type:** the return type `RespondentCycle`
does not include any field that could carry PII other than `subjectFirstName`.

---

## Token boundary schema

**Location:** inline in `app/respond/[token]/page.tsx` or extracted to
`app/respond/[token]/schemas.ts` if reused by the respond/form slices later.

```typescript
const tokenBoundarySchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
```

Validated before any DB call (TC-VALID-01). A token that is empty, shorter or longer
than 43 characters, or contains an out-of-charset character is rejected and renders
the same calm not-found page without a DB round-trip.

---

## Copy-link component

**File:** `app/(cabinet)/cycles/[id]/CopyLinkButton.tsx` (client component)

- Receives `token: string` as a prop (the opaque token, not the full URL).
- Constructs the full URL client-side: `window.location.origin + "/respond/" + token`.
- Calls `navigator.clipboard.writeText(url)` on activation.
- Shows an inline transient confirmation ("Посилання скопійовано") for ~2 s after
  success, then resets. No page navigation, no modal.
- On clipboard API failure (not permitted / non-HTTPS), shows an inline error message
  in Ukrainian.
- Never exposes the cycle database id. The prop is typed `token: string`; the
  caller passes only the token string.
- Styled with Kolo360 design tokens; Lucide outline icon (e.g. `Copy`); sentence case.

---

## i18n additions

Extend `lib/i18n/uk.ts` and `en.ts` with a `respondent` namespace:

| Key | Ukrainian | English |
|-----|-----------|---------|
| `respondent.notFound` | "Посилання не знайдено або застаріло" | "Link not found or expired" |
| `respondent.notFoundBody` | "Перевірте посилання або зверніться до HR" | "Check the link or contact HR" |
| `respondent.expired` | "Час на відповідь сплив" | "The response window has closed" |
| `respondent.expiredBody` | "Дедлайн цього циклу минув" | "The deadline for this cycle has passed" |
| `respondent.done` | "Відповідь вже надано" | "Response already submitted" |
| `respondent.doneBody` | "Цей цикл оцінювання вже завершено" | "This assessment cycle has already been completed" |
| `respondent.greeting` | "Вітаємо, {name}" | "Hello, {name}" |
| `respondent.methodology` | "Методологія" | "Methodology" |
| `respondent.deadline` | "Дедлайн" | "Deadline" |
| `respondent.questions` | "Питання" | "Questions" |
| `respondent.questionsCount` | "питань" | "questions" |
| `respondent.copyLink` | "Скопіювати посилання" | "Copy link" |
| `respondent.linkCopied` | "Посилання скопійовано" | "Link copied" |
| `respondent.copyFailed` | "Не вдалося скопіювати" | "Could not copy" |

`formatDaysRemaining` from `lib/i18n/format.ts` is reused for the deadline display;
no new formatting utility is needed.

---

## Error handling strategy

| Situation | Handling |
|-----------|----------|
| Malformed token (Zod rejects) | Calm not-found page, no DB call, no 500 |
| Token not in DB | Calm not-found page |
| Broken `templateSnapshot` (Zod parse fails on DB read) | Treat as not found; log server-side (NFR-OBS-01 — no stack trace to client) |
| Cycle status `done` | Calm "already completed" page |
| Cycle status `expired` | Calm "window closed" page |
| Clipboard API unavailable | Inline error message in Ukrainian, no throw |

---

## Data model — no changes

The `Cycle` model in `prisma/schema.prisma` already has:
- `token String @unique` — the only credential needed.
- `status CycleStatus` — the persisted enum value read directly.
- `templateSnapshot Json` — validated via `snapshotSchema` on read.
- `subject Employee` — relation; only `fullName` (first word) is used.
- `deadline DateTime` — for `daysRemaining` calculation.

No migration. No new columns.

---

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Stale `status` in DB (expired cycle not yet flipped) | Accepted in MVP. Link slice reads persisted status. Status update mechanism belongs to respond/form slices. |
| `subject.fullName` is a single-word name (no space) | `split(" ")[0]` returns the full single-word name in that edge case. This is the best available first-name proxy without a separate `firstName` column. |
| Clipboard API unavailable (non-HTTPS dev environment) | CopyLinkButton catches the rejection and shows a Ukrainian error message inline. |
| Oversized token (e.g. 10 000-character URL injection) | `z.string().regex(/^[A-Za-z0-9_-]{43}$/)` rejects anything that is not exactly 43 characters before the DB call. |
