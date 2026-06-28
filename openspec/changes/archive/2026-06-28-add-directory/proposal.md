## Why

The HR manager needs employees to assess before any cycle can run. This change implements the
`directory` baseline spec (slice 2a in `docs/mvp-capability-plan.md`): add, list, edit, and archive
employees, with a required full name + email and optional role/phone/Telegram, validated on blur and
at the server boundary (FR-DIR-01..04). It fills the `/employees` placeholder the cabinet-shell slice
shipped and introduces the first DB-writing forms, so it also lands the shared design-system form
components later slices reuse.

The `Employee` model already exists in `prisma/schema.prisma` (fullName, email unique, role?, phone?,
telegramHandle?, archived, timestamps) from the foundation slice — no schema change. Validation is a
single Zod schema in `lib/schemas/` used by both the client (on blur) and the server action boundary,
with types via `z.infer` (TC-VALID-01, TC-TS-01). Archiving is a soft state change (`archived=true`),
never a hard delete, so historical cycles keep their subject (FR-DIR-02). Personal data lives only in
the DB and is never placed in any AI prompt (BC-PRIVACY-04).

## What Changes

- Add `lib/schemas/employee.ts` — the canonical Zod schema with the exact decidable rules (fullName
  1–120 trimmed; email 3–254 + email shape; role 0–80; phone `^\+?[0-9 ()\-]{6,32}$`; Telegram
  `^@[A-Za-z0-9_]{5,32}$`), plus a pure `toFieldErrors(zodError)` mapping a ZodError to
  `Record<fieldName, string>` of specific messages. Types via `z.infer`. Unit-tested (the red target).
- Add server actions `app/(cabinet)/employees/actions.ts` — `createEmployee` / `updateEmployee` /
  `archiveEmployee`, each Zod-parsing at the boundary and returning a typed
  `{ ok: true } | { ok: false, fieldErrors }` result; never a raw 500. DB via the shared `lib/db`.
- Add a data-access helper for the active/archived list query (active employees, ordered).
- Replace the `/employees` placeholder with the real screen: a server component listing active
  employees (with empty/loading/error states from the cabinet-shell state components) and a sticky
  PageHeader primary action "Add employee"; a client add/edit form with on-blur validation driven by
  the shared schema and `{ ok:false, fieldErrors }` rendered inline per field; an archive control with
  a confirm.
- Port the shared Kolo360 design-system form primitives into `components/forms/` (Input/Field/Button,
  matching `docs/KoloDesign/components/forms/**`) so the form and later slices reuse them — define once.
- Extend `lib/i18n/uk.ts` + `en.ts` with a `directory` namespace (labels, the specific field
  messages, empty/archive copy) — sentence case, no exclamation marks, no emoji.

## Impact

- Affected specs: `directory` (implements the existing baseline; no spec change).
- Affected code: `lib/schemas/employee.ts` (+test), `app/(cabinet)/employees/**`,
  `components/forms/**`, `lib/i18n/{uk,en}.ts`, possibly `lib/db` query helper.
- No schema/migration change (Employee already exists). No new dependency.
- Travelling standards: NFR-A11Y-01/02 (focus ring, accessible names, AA, status not by colour),
  NFR-I18N-01, BC-BRAND-01, BC-PRIVACY-04 (PII stays in DB, never in prompts), light theme only.
- Writes are HR-only — `/employees` is inside the proxy-guarded cabinet group (NFR-SEC-01).
