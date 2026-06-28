## 1. i18n strings (NFR-I18N-01, BC-BRAND-01)

- [x] 1.1 Extend `lib/i18n/uk.ts` (+ mirror `en.ts`) with a `directory` namespace: field labels
  (fullName/email/role/phone/telegram), the SPECIFIC validation messages (required + invalid + length
  per field, matching the spec wording), list/empty/archive/confirm copy, and the "Add employee" /
  "Save" / "Archive" action labels. Sentence case, no exclamation marks, no emoji. Keep `Messages` in
  sync (uk canonical). The validation-message constants are exported for the schema to reference.

## 2. Pure validation schema + tests-first (TC-VALID-01, TC-PURE-01, red before green)

- [x] 2.1 Write `lib/schemas/employee.test.ts` FIRST (red), `// @trace FR-DIR-01, FR-DIR-03`,
  asserting BEHAVIOUR (which field carries the issue + that `toFieldErrors` yields a non-empty message
  per failing field — not exact human text, since messages are uk-first i18n): `employeeInputSchema`
  accepts all-fields and required-only payloads; flags an issue on the right field for oversized
  fullName (>120), email (>254), role (>80) and phone (33 chars), malformed email, empty required
  fields, phone with letters (`call me`), and telegram without `@` (`mihailo`) / too-short (`@abc`);
  ACCEPTS locale phones `+380 (44) 123-45-67` and `+1 650-555-0100`; accepts blank optional fields;
  `toFieldErrors` maps a multi-field ZodError to keys `{ email, fullName }`. (The full length caps
  incl. telegram >33 and email min 3 are still encoded in the schema per the spec, even where the test
  exercises pass/fail behaviour rather than an isolated boundary.) (TC-VALID-01, TC-PURE-01)
- [x] 2.2 Implement `lib/schemas/employee.ts` (`employeeInputSchema`, `EmployeeInput = z.infer<...>`,
  `toFieldErrors`) — framework-free, messages from the i18n constants — to turn the tests green. No
  hand-written parallel type, no cast. (FR-DIR-01, FR-DIR-03, TC-VALID-01, TC-TS-01)

## 3. Shared design-system form primitives (TC-ARCH-01, BC-BRAND-01)

- [x] 3.1 Port `components/forms/` Input, Field (label + control + inline error slot, `aria-describedby`
  + `aria-invalid`), and Button from `docs/KoloDesign/components/forms/**`: tokens, hairline borders,
  2px accent focus ring, sentence case. No reinvented styling. Reusable by later slices.

## 4. Server actions (boundary, TC-VALID-01)

- [x] 4.1 Add `app/(cabinet)/employees/actions.ts` (`"use server"`): `createEmployee`, `updateEmployee(id)`,
  `archiveEmployee(id)`. Each parses FormData with `employeeInputSchema` BEFORE any DB write and returns
  the typed `{ ok:true; id } | { ok:false; fieldErrors }`. Catch Prisma unique-email (P2002) → email
  field error; catch any other throw → typed error result, never a raw 500. Archive is `archived=true`
  (soft), never a hard delete. DB via shared `lib/db`. (FR-DIR-01, FR-DIR-02, FR-DIR-03)

## 5. List + form UI (FR-DIR-02, FR-DIR-04, FR-SHELL-03)

- [x] 5.1 Replace `app/(cabinet)/employees/page.tsx` placeholder with the active-employee list (server
  component): `db.employee.findMany({ where:{archived:false}, orderBy:{fullName:"asc"} })`; PageHeader
  with the "Add employee" primary action; `EmptyState` when none; rows show name + mono email + role +
  an active/archived TEXT status label + edit/archive controls. Data-fetch failure surfaces the cabinet
  `ErrorState` boundary, never a raw 500. (FR-DIR-02, FR-SHELL-03)
- [x] 5.2 Add the client add/edit form (design-system primitives): on-blur validation via
  `employeeInputSchema` showing the specific inline message per field; required fields block submit each
  with its own message (never one generic banner); on submit call the action and render returned
  `fieldErrors` inline; one quiet success (no confetti). (FR-DIR-01, FR-DIR-03, NFR-A11Y-01)
- [x] 5.3 Wire archive with a confirm; archived employees drop from the active list. (FR-DIR-02)

## 6. Verify (maker ≠ checker)

- [x] 6.1 `npm run lint && npx tsc --noEmit && npm test && npm run build` all green; no `any`, no casts,
  no `@ts-ignore`; console silent. PII never logged. (NFR-DX-01, NFR-OBS-01, TC-TS-01, BC-PRIVACY-04)
- [x] 6.2 Static + review verification: build resolves `/employees`; create/edit/archive parse at the
  Zod boundary; archive is soft (row retained, dropped from active list); empty/loading/error states
  present; status by text label. Eyes-on-pixels deferred to Phase 6 vision-verify (no Playwright, TC-TEST-01).
- [ ] 6.3 Independent review pass (review-gate, separate agents; maker ≠ checker) against FR-DIR-01..04
  and the typing/validation/a11y/privacy rules before archive.
