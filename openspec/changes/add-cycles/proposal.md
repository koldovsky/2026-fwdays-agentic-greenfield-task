## Why

A cycle is the unit HR works with: a template snapshot + a subject + a deadline + a private link
token + a status. This change implements the `cycles` baseline spec (slice 3): create a cycle from a
template + subject + future deadline, mint a unique hard-to-guess link token, snapshot the template
immutably, and show the cycles list with subject/methodology/days-remaining/progress/status
(FR-CYCLE-01..05). It depends on directory (subjects) and templates (sources), both done.

### Schema-driven design decision: create-and-launch is atomic in the MVP

`prisma/schema.prisma` (foundation) declares `Cycle.token String @unique` and
`templateSnapshot Json` as NON-NULL, and `CycleStatus` has no draft value — so the schema cannot
represent a "created-but-not-launched" cycle. Rather than migrate the shared schema mid-build, this
slice treats **create-and-launch as one atomic action**: creating a cycle validates the input,
mints the token, snapshots the template, and writes the cycle as `collecting` in a single
transaction. This satisfies the substance of FR-CYCLE-01/02/03 (a cycle has a future deadline, a
unique non-enumerable token, and a frozen snapshot, and starts `collecting`). The two-phase
create→launch UI collapses to one step and **no separate relaunch path is exposed**, so the spec's
"relaunching an already-launched cycle is refused as a no-op" holds vacuously. This decision is
recorded for the reviewer/user; reopening the two-phase flow would need a schema migration (nullable
token/snapshot + a draft status) deferred out of MVP.

## What Changes

- Add pure, framework-free, unit-tested `lib/cycles/`:
  - `link-token.ts` — `generateCycleToken()`: a high-entropy, URL-safe, non-sequential token
    (32 random bytes → base64url, mirroring `lib/auth/tokens` style), carrying no PII. The single
    home for the link-token generator; the `link` slice (FR-LINK-02) reuses it.
  - `snapshot.ts` — `buildTemplateSnapshot(template)`: a pure immutable copy of the template (name,
    methodology, ordered questions with stable id/order/text/type/required/anchors) + `snapshotSchema`
    (Zod) validating it, reusing the `templates` question/anchor schemas.
  - `status.ts` — pure `deriveStatus({ completedAt, deadline }, now)` → `collecting | done | expired`
    (done if completed; else expired if deadline passed; else collecting; a done cycle never flips to
    expired), `daysRemaining(deadline, now)`, and `isResponseComplete(snapshot, answers)` (every
    required question has a valid answer).
- Add `lib/schemas/cycle.ts` — `createCycleInputSchema` (templateId, subjectId, deadline as a strict
  ISO `YYYY-MM-DD` calendar date that is strictly future and within 365 days; bounded id lengths),
  types via `z.infer`. Rejects locale `28.06.2026`, past/today, and out-of-range deadlines.
- Add `app/(cabinet)/cycles/actions.ts` — `createCycle(formData)`: assert HR session, Zod-parse,
  verify the template exists and the subject exists and is NOT archived (else inline error, no 500),
  then in one transaction mint a unique token (regenerate on the rare unique collision), build +
  validate the snapshot, and create the cycle `collecting`. Typed `{ ok, fieldErrors }` result.
- Replace the `/cycles` placeholder with the real list (subject name, methodology from snapshot, days
  remaining, answered/total progress, text status label), each row linking to the cycle; a create
  form (choose template + subject + future deadline). Empty/loading/error states. A minimal cycle
  detail page (`/cycles/[id]`) showing the snapshot + status (the copy-link, respondent flow, answer
  capture, and progress detail are owned by later slices).
- Extend `lib/i18n/uk.ts` + `en.ts` with a `cycles` namespace.

## Impact

- Affected specs: `cycles` (implements the existing baseline; no spec change).
- Affected code: `lib/cycles/**` (+tests), `lib/schemas/cycle.ts` (+test), `app/(cabinet)/cycles/**`,
  `lib/i18n/{uk,en}.ts`.
- No schema/migration change (Cycle/Response/Answer already exist). No new dependency.
- Progress shows answered/total where answered counts persisted answers (0 until the respond/form
  slices land); status derives on read (no cron — spec exclusion).
- Travelling: NFR-SEC-01 (create/launch/list behind the proxy guard, subject existence checked),
  BC-PRIVACY-02 (token carries no PII, not enumerable), NFR-I18N-01, NFR-A11Y-02, light theme.
