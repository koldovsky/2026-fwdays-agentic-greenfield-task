# Design — add-directory

Implements `openspec/specs/directory/spec.md` (FR-DIR-01..04). One Zod schema drives both client
on-blur validation and the server boundary; archiving is soft; PII stays in the DB.

## Validation (pure, lib/, unit-tested — red-first)

`lib/schemas/employee.ts`:
- `employeeInputSchema` — Zod object with the spec's exact decidable rules:
  - `fullName`: trim, min 1 ("Full name is required"), max 120 ("Full name must be at most 120 characters").
  - `email`: min 3, max 254, `.email()` shape ("Email is not valid" / "Email is required" when empty).
  - `role`: optional, max 80; empty string → undefined.
  - `phone`: optional; when present must match `/^\+?[0-9 ()\-]{6,32}$/` ("Phone format is not valid").
  - `telegramHandle`: optional; when present must match `/^@[A-Za-z0-9_]{5,32}$/` ("Telegram handle is not valid").
  - Optional fields normalise "" → undefined so a blank optional passes.
  - Per-field messages come from `lib/i18n` (uk-first) — the schema references message constants,
    not hard-coded English, so the same messages render on blur and from the server.
- `type EmployeeInput = z.infer<typeof employeeInputSchema>` (no hand-written parallel type).
- `toFieldErrors(error: ZodError): Partial<Record<keyof EmployeeInput, string>>` — pure mapping from a
  ZodError to first-message-per-field. Unit-tested alongside the schema.
- These are framework-free (no next/react/DOM). This is the slice's red-first unit target: tests assert
  all-fields valid, required-only valid, each oversized field rejected, malformed email, empty required,
  phone with letters rejected, locale phone accepted (`+380 (44) 123-45-67`, `+1 650-555-0100`),
  telegram without `@` rejected, blank optional accepted.

## Server actions (boundary)

`app/(cabinet)/employees/actions.ts` (`"use server"`), result type
`EmployeeActionResult = { ok: true; id: string } | { ok: false; fieldErrors: Partial<Record<...,string>> }`:
- `createEmployee(formData)` — build a plain object from FormData, `safeParse`; on failure return
  `{ ok:false, toFieldErrors(...) }`; on success `db.employee.create`. Unique-email collision (P2002)
  is caught and returned as a `{ email: <message> }` field error, never a raw 500.
- `updateEmployee(id, formData)` — same parse, `db.employee.update where id` (same identity).
- `archiveEmployee(id)` — `db.employee.update { archived: true }` (soft). No hard delete anywhere.
- All wrapped so any unexpected throw returns a typed error, never surfacing a stack/500.

## Data access

Active list: `db.employee.findMany({ where: { archived: false }, orderBy: { fullName: "asc" } })`.
Archived employees are excluded from the active list and (later) from cycle-subject selection, but
remain resolvable by id for historical cycles.

## UI (cabinet group, design system)

- `app/(cabinet)/employees/page.tsx` (server) — fetch active employees; render inside the cabinet shell
  with a `PageHeader` title + a single right-aligned "Add employee" primary action. Zero employees →
  `EmptyState` (invite to add the first). Fetch throw → the cabinet `error.tsx` boundary / `ErrorState`.
  Each row shows name, email (mono), role, and an active/archived **text** label (status never by colour
  alone), with edit + archive controls.
- Add/edit form — a client component using the shared form primitives; validates each field on blur via
  `employeeInputSchema` (safeParse the single field or the whole object), shows the specific inline
  message under the field, blocks submit while a required field is empty, and on submit calls the server
  action and renders any returned `fieldErrors` inline. One quiet success path (no celebratory UI).
- `components/forms/` — port `Input`, `Field` (label + control + error slot + accessible
  `aria-describedby`/`aria-invalid`), and `Button` from `docs/KoloDesign/components/forms/**`: hairline
  borders, tokens, 2px accent focus ring, sentence case. Reused by later slices.

## Accessibility, i18n, privacy (travelling)

Every control: accessible name, keyboard tab order, 2px `--focus-ring`. Errors associated via
`aria-describedby`, `aria-invalid` on the field. Status by text label + AA contrast. All copy from
`lib/i18n/uk.ts` (English fallback), sentence case, no exclamation marks, no emoji, Lucide outline icons.
PII (name/email/phone/Telegram) is persisted only in the DB and never placed in an AI prompt.

## Out of scope (spec exclusions)

Hard delete, bulk import/export, employee self-service, avatars, org-chart/manager hierarchy, and any
non-HR directory writes. Cycle-subject selection consuming this list is the cycles slice.
