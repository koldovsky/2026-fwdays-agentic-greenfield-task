# Design — add-cycles

Implements `openspec/specs/cycles/spec.md` (FR-CYCLE-01..05). Pure token/snapshot/status logic in
`lib/`; create-and-launch atomic (see proposal's schema-driven decision).

## Pure logic (lib/cycles/, unit-tested — red-first)

- `link-token.ts` — `generateCycleToken(): string`: 32 cryptographically-random bytes → base64url
  (charset `[A-Za-z0-9_-]`, ~43 chars), like `lib/auth/tokens` `generateRefreshTokenValue`. No PII,
  non-sequential, not derived from any input. Tests: charset/length, and that many generated tokens
  are all distinct (no collisions in a large sample) and contain no separator/sequential pattern.
  This is the ONE home for the link-token generator; `link` (FR-LINK-02) imports it.
- `snapshot.ts` — `buildTemplateSnapshot(template: TemplateWithQuestions): TemplateSnapshot` returns a
  deep, immutable plain object: `{ name, methodology, questions: [{ id, order, text, type, required,
  anchors? }] }` (questions ordered). `snapshotSchema` (Zod) validates it, reusing the `templates`
  question/anchor schemas (one home). Tests: snapshot equals the template at build time; a later
  mutation of the source object does not change a previously-built snapshot (frozen/cloned); snapshot
  parses against `snapshotSchema`; a malformed snapshot is rejected.
- `status.ts` —
  - `deriveStatus({ completedAt: Date | null, deadline: Date }, now: Date): CycleStatus` — `done` if
    `completedAt` set; else `expired` if `now > deadline`; else `collecting`. A done cycle stays done.
  - `daysRemaining(deadline, now): number` — whole days from `now` to `deadline` (overdue ⇒ ≤ 0,
    surfaced as overdue, never "time left").
  - `isResponseComplete(snapshot, answers): boolean` — every REQUIRED snapshot question has a valid
    answer (scale ⇒ a value matching an anchor; open ⇒ non-empty text). Pure; reused by the slices
    that write answers to decide when to set `completedAt`.
  All framework-free, no `Date.now()` inside (now is passed in) — deterministic + testable.

## Input schema (boundary)

`lib/schemas/cycle.ts` — `createCycleInputSchema`:
- `templateId`, `subjectId`: non-empty bounded strings (cuid-shaped, max length cap).
- `deadline`: a STRICT ISO `YYYY-MM-DD` (regex + real-calendar-date check, NO coercion of locale
  forms like `28.06.2026`), refined to be strictly after "today" and at most 365 days ahead. "Today"
  is injected (a `todayISO` param/closure) so the rule is pure + testable, not wall-clock-coupled.
- Types via `z.infer`. Tests: accept a future ISO date; reject `28.06.2026`, today, a past date,
  `9999-12-31` (>365d), an oversized id, and missing template/subject — each on the right field.

## Server action (transaction)

`app/(cabinet)/cycles/actions.ts` `createCycle(formData)` (`"use server"`):
1. `getCurrentHrUser()` — null ⇒ refuse (typed error / the route is proxy-guarded anyway).
2. `createCycleInputSchema.safeParse` ⇒ on failure return `{ ok:false, fieldErrors }`.
3. Load template (+ordered questions) and subject; if template missing, or subject missing/archived ⇒
   inline error, no write.
4. In a `db.$transaction`: `buildTemplateSnapshot` + `snapshotSchema.parse`; `generateCycleToken()`,
   retrying on the unique-constraint collision (P2002 on token) a bounded number of times; create the
   cycle `{ token, status: collecting, deadline, subjectId, templateId, templateSnapshot }`.
5. Return `{ ok:true, id }`. Any unexpected throw ⇒ typed error, never a raw 500.

## UI (cabinet group)

- `app/(cabinet)/cycles/page.tsx` (server) — list cycles; each row: subject name (from the live
  subject relation), methodology (from the snapshot), days remaining (`daysRemaining`, overdue shown
  as overdue), answered/total progress (total = required snapshot questions; answered = persisted
  answers, 0 for now), and a TEXT status label (`deriveStatus`, never colour alone). Row → `/cycles/[id]`.
  Empty/loading/error states (reuse the shared components + cabinet `error.tsx`). PageHeader primary
  action "Create cycle".
- The create form (client) — choose a seeded template, a non-archived employee, and a future date
  (native `<input type="date">` so the value is ISO `YYYY-MM-DD`); on-blur/submit validation via
  `createCycleInputSchema`; renders `fieldErrors`.
- `app/(cabinet)/cycles/[id]/page.tsx` (server) — minimal detail: subject, methodology, deadline,
  status, and the snapshot questions in order; unknown id ⇒ calm not-found. Copy-link, the respondent
  flow, answer capture, and progress detail are explicitly later slices.

## Out of scope (spec exclusions)

Time-of-day/timezone/reminders; multi-reviewer; post-launch editing or manual status override;
cancel/delete/reopen; background status cron (status derived on read); the respondent link page,
answer capture, results detail, and AI summary (owned by link/respond/form/ai-interview/results/report).
