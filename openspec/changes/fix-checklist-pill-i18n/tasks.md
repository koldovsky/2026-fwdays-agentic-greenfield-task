# Tasks — fix-checklist-pill-i18n

## 1. StatusPill: add locale prop

- [x] 1.1 Add `locale?: Locale` to `StatusPillProps` in
  `src/shared/ui/status-pill/ui/StatusPill.tsx`. Import `t` (or the `Locale` type
  + `t()` accessor) from `@/shared/lib/i18n`. Replace
  `label ?? ua.checklist.statusLabel[status]` with
  `label ?? t(locale ?? "ua").checklist.statusLabel[status]`. Remove the direct
  `ua` import if it is no longer used elsewhere in the file.
- [x] 1.2 Update `src/shared/ui/status-pill/index.ts` barrel if the `StatusPillProps`
  type export needs no change (it re-exports by name; confirm the type is still
  correctly exported after adding the new optional field).

## 2. ChecklistRow: forward locale

- [x] 2.1 Add `locale?: Locale` to `ChecklistRowProps` in
  `src/shared/ui/checklist-row/ui/ChecklistRow.tsx`. Import `Locale` from
  `@/shared/lib/i18n`. Forward the prop to the `StatusPill` call site:
  `<StatusPill status={toPillStatus[status]} locale={locale} />`. Default is
  `undefined`, which lets `StatusPill` apply its own `"ua"` default.
- [x] 2.2 Confirm `src/shared/ui/checklist-row/index.ts` re-exports `ChecklistRowProps`
  so the updated type is visible to callers without reaching into internal files.

## 3. ChecklistPreview: thread locale to rows

- [x] 3.1 In `src/views/landing/ui/ChecklistPreview.tsx`, pass `locale={locale}` to
  each `ChecklistRow` in the map call. The `locale` prop already arrives on
  `ChecklistPreview`; only the forwarding to `ChecklistRow` is missing.

## 4. Tests

- [x] 4.1 In the `StatusPill` test file, add a scenario: render with `status="met"`
  and `locale="en"`, assert the rendered text is "Met" (not "Підтверджено").
  Add a parallel scenario for `locale="ua"` asserting the Ukrainian label. Confirm
  the no-locale default still renders the Ukrainian label (TC-PURE-01 — no DOM or
  Next.js dependency in the test).
- [x] 4.2 In the `ChecklistRow` test file (or create one if absent), add a scenario:
  render with `status="partial"` and `locale="en"`, assert the `StatusPill` inside
  shows "Partial". Confirm the no-locale default renders the Ukrainian label.
- [x] 4.3 In the `ChecklistPreview` test file (or create one if absent), add a
  scenario: render with `locale="en"`, assert at least one status pill contains an
  English label from `en.checklist.statusLabel`. Confirm `locale="ua"` renders a
  Ukrainian label.

## 5. Verify

- [x] 5.1 `yarn lint` passes with no new errors or warnings. Confirm no FSD import
  violations: `StatusPill` and `ChecklistRow` are in `shared/ui` and may import
  from `shared/lib/i18n` (same layer is allowed downward).
- [x] 5.2 `yarn build` passes. No TypeScript errors on the updated prop interfaces
  or the `t()` call site.
- [x] 5.3 `yarn test` passes. All pre-existing tests remain green; the new locale
  scenarios from task 4 are also green.

## 6. Independent review (maker != checker)

- [x] 6.1 Run the `checker` subagent (or `checker-review` skill) on the diff.
  Scope: confirm (a) the `ua` default is preserved and no existing caller is broken,
  (b) no new brand hues / emoji / exclamation points / em-dashes are introduced
  (BC-BRAND-01), (c) `StatusPill` and `ChecklistRow` remain framework-free
  (TC-PURE-01), (d) the EN labels in the test assertions match the strings in
  `en.checklist.statusLabel` exactly, and (e) `GroundingBadge` is NOT modified
  (out of scope, as noted in the proposal).
- [x] 6.2 Fix any blockers raised by the checker before marking the change complete.
