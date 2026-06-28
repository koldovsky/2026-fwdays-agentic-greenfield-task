# Proposal — add-usage-accounting

## Why this slice exists

Every Claude API call consumes tokens and has a cost. Without instrumentation, the HR
team has no visibility into how much AI usage accrues per assessment cycle or per
purpose (interview vs summary). This slice adds two things: a server-only `recordUsage`
helper that any AI pipeline module can call after each Claude API response, and a
read-only HR spend view at `/usage` that aggregates stored costs by cycle and by
model×purpose.

The token-cost-calculation capability (`add-token-cost-calculator`) already exists and
provides `cost(modelId, inputTokens, outputTokens)` — this slice depends on it and does
not reimplement it.

## What changes

### FR-USAGE-01 — Usage row recording

`lib/ai/record-usage.ts` (`"use server"` / `import "server-only"`) validates inbound
token-count data with `recordUsageInputSchema` (from `lib/schemas/usage.ts`, defined
once, imported here), computes `costUsd = cost(model, inputTokens, outputTokens)` at
write time, and writes a `UsageRow` to Postgres. Storing `costUsd` at write time means
historical rows keep the price that was in effect when the call was made — the price
table can change without retroactively altering past costs.

The `UsageRow` model (added to `prisma/schema.prisma`) records: `cycleId`, `purpose`
(UsagePurpose enum: `interview | summary`), `model`, `inputTokens`, `outputTokens`,
`cachedInputTokens? Int`, `costUsd Float`, `createdAt DateTime @default(now)`.

`recordUsage` throws on any validation failure or DB error; it never swallows errors,
because a silent cost-miss would be worse than a visible server-side exception.

### FR-USAGE-03 — HR spend view

`app/(cabinet)/usage/page.tsx` is a server component (auth-gated by the proxy middleware
that guards all `/cabinet/*` routes). It reads all `UsageRow` rows with their parent
cycle's subject name, then:
1. Computes a grand total.
2. Groups by cycle, each group showing the subject name and per-model×purpose cost
   breakdown.
3. Renders an `EmptyState` when no rows exist yet.
4. Renders an `ErrorState` when the DB call fails.

Costs are aggregated in-process from the pre-stored `costUsd` field — no re-run of the
price formula at read time.

## Impact

- `prisma/schema.prisma`: adds `UsagePurpose` enum and `UsageRow` model; migration
  required.
- `lib/schemas/usage.ts`: extends existing file with `recordUsageInputSchema`
  (shared schema, defined once, imported by `record-usage.ts`).
- `lib/ai/record-usage.ts`: new server-only helper.
- `lib/ai/record-usage.test.ts`: 9 unit tests (written RED-first).
- `app/(cabinet)/usage/page.tsx`: new HR spend view.
- `lib/nav/cabinet-nav.ts` + `components/shell/nav-icons.tsx`: adds `"usage"` nav entry.
- `lib/i18n/uk.ts` / `en.ts`: adds `usage` namespace.

## Out of scope

- FR-USAGE-02 and FR-USAGE-04 are handled by the existing
  `add-token-cost-calculator` slice (`lib/ai/cost.ts`, `lib/ai/pricing.ts`); this slice
  only wires the call.
- Actual Claude API calls (wired by `ai-interview` and `report` slices, manual).
- Per-row token details visible in the spend view (aggregate cost only).
- Role-based access beyond the single-HR-user MVP.
