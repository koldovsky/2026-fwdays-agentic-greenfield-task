# Tasks — add-usage-accounting

Implements FR-USAGE-01, FR-USAGE-03.

Dependencies: `add-token-cost-calculator` must be archived — `lib/ai/cost.ts`,
`lib/ai/pricing.ts`, `lib/schemas/usage.ts` (base schemas), `lib/ai/cost.test.ts`,
`lib/ai/pricing.test.ts` must all exist. `prisma/schema.prisma` must already have
`Cycle`, `Response`, `Answer` models in place (`add-cycles`/`add-form` slices archived).

---

## 1. Schema

- [x] 1.1 Add `UsagePurpose` enum (`interview | summary`) and `UsageRow` model (see
  `design.md`) to `prisma/schema.prisma`. Add `usageRows UsageRow[]` back-relation to
  `Cycle`. Run `npx prisma migrate dev --name add-usage-row` to create and apply the
  migration. Run `npx prisma generate` to regenerate the Prisma client. Confirm the new
  `db.usageRow` accessor and `UsagePurpose` enum appear in the generated client.
  @trace FR-USAGE-01

---

## 2. Domain logic

- [x] 2.1 Extend `lib/schemas/usage.ts` with `recordUsageInputSchema` and
  `RecordUsageInput` (see `design.md`). Reuse the already-present `priceEntrySchema`,
  `priceTableSchema`, `tokenCountsSchema` — do not redefine them. No `any`, no casts.
  @trace FR-USAGE-01 TC-ARCH-01 TC-TS-01

- [x] 2.2 Write `lib/ai/record-usage.test.ts` (RED — must fail before implementation):
  - Valid `interview` call → `db.usageRow.create` called with correct `costUsd`.
  - Valid `summary` call → correct `costUsd` computed from `cost()`.
  - `cachedInputTokens` stored when present, `null` when absent.
  - Negative `inputTokens` → throws before DB call.
  - Non-integer `outputTokens` → throws before DB call.
  - Invalid `purpose` string → throws before DB call.
  - Unknown model id → throws `UnknownModelError`, no DB call.
  - DB failure → propagates (not swallowed).
  @trace FR-USAGE-01 TC-VALID-01

- [x] 2.3 Implement `lib/ai/record-usage.ts` to make 2.2 green:
  - `import "server-only"` at the top.
  - `recordUsage(input: unknown): Promise<void>`.
  - Parse with `recordUsageInputSchema` (throws on failure).
  - Compute `costUsd = cost(parsed.model, parsed.inputTokens, parsed.outputTokens)`.
  - `db.usageRow.create({ data: { ...parsed, cachedInputTokens: parsed.cachedInputTokens ?? null, costUsd } })`.
  - No `any`, no casts.
  @trace FR-USAGE-01 TC-TS-01 TC-PURE-01

---

## 3. UI — HR spend view

- [x] 3.1 Add `"usage"` to `CabinetNavKey` union and `CABINET_NAV` array in
  `lib/nav/cabinet-nav.ts` with `href: "/usage"`. Update `lib/nav/cabinet-nav.test.ts`
  (already done in prior work; verify tests pass). @trace FR-USAGE-03 FR-SHELL-01

- [x] 3.2 Add `case "usage": return <BarChart2 {...props} />` to
  `components/shell/nav-icons.tsx`. @trace FR-USAGE-03 FR-SHELL-01

- [x] 3.3 Add `usage` namespace to `lib/i18n/uk.ts` and `lib/i18n/en.ts` (12 keys: see
  `design.md`). @trace FR-USAGE-03 NFR-I18N-01

- [x] 3.4 Implement `app/(cabinet)/usage/page.tsx` (server component):
  - `fetchRows()`: `db.usageRow.findMany` selecting `cycleId`, `purpose`, `model`,
    `costUsd`, and `cycle.subject.fullName`. No `inputTokens`/`outputTokens`.
  - Grand total: `rows.reduce((sum, r) => sum + r.costUsd, 0)`.
  - Group by `cycleId` preserving `createdAt asc` insertion order.
  - `BreakdownTable` inner component: aggregates rows by `model|purpose` key, renders
    `<table>` with Model | Purpose | Cost columns.
  - Empty rows → `EmptyState`. DB error (try/catch) → `ErrorState`.
  - `subject?.fullName ?? t.unknownCycle` fallback (subject may be archived/null).
  - No `any`, no casts. Sentence case, no exclamation marks.
  @trace FR-USAGE-03 NFR-SEC-01 NFR-A11Y-01

---

## 4. Tests

- [x] 4.1 Verify `lib/ai/record-usage.test.ts` (task 2.2) is fully green, including the
  unknown-model and DB-failure paths. @trace FR-USAGE-01 TC-TS-01

- [x] 4.2 Verify `lib/nav/cabinet-nav.test.ts` has 3 nav entries (cycles, employees,
  usage) with stable hrefs and passes. @trace FR-SHELL-01

---

## 5. Validation and archive

- [x] 5.1 Run full verification loop — all must be green:
  ```
  npm run lint
  npx tsc --noEmit
  npm test
  npm run build
  ```
  Confirm `record-usage.ts` is not bundled into the client (server-only sentinel).
  Confirm no `any`, no casts, no `@ts-ignore`. Console silent on healthy session.
  @trace NFR-DX-01 TC-TS-01

- [x] 5.2 Independent review pass (maker != checker). Reviewer confirms:
  - `recordUsage` never swallows errors.
  - `costUsd` is pre-computed and stored (not re-computed at read time).
  - `inputTokens`/`outputTokens` not selected in `fetchRows()`.
  - `subject?.fullName ?? t.unknownCycle` fallback present.
  - No `any`, no casts in any new file.
  - Three deferred findings logged to `docs/qa/security-backlog.md`
    (SEC-BL-08 float precision, SEC-BL-09 single-layer auth, SEC-BL-10 cycleId ownership).
  @trace TC-VALID-01 NFR-SEC-01

- [x] 5.3 Add deferred security findings to `docs/qa/security-backlog.md`
  (SEC-BL-08..10). @trace NFR-SEC-01

- [x] 5.4 Update `docs/current-state.md`: timestamp, mark `add-usage-accounting` done,
  set next step to STOP (ai-interview and report are manual). @trace handoff

- [x] 5.5 Archive change folder manually (no `specs/` delta, same pattern as `add-form`
  and `add-respond`):
  ```
  cp -r openspec/changes/add-usage-accounting \
        openspec/changes/archive/2026-06-28-add-usage-accounting
  rm -rf openspec/changes/add-usage-accounting
  ```

- [x] 5.6 Run `npx openspec validate --all --strict` — confirm 14/14 specs pass (or
  whatever the current count is). @trace NFR-DX-01

- [x] 5.7 Commit all usage-accounting files:
  ```
  git commit -m "feat(usage): record token usage and HR spend view (FR-USAGE-01, FR-USAGE-03)

  Slice: add-usage-accounting
  Refs: FR-USAGE-01, FR-USAGE-03"
  ```
