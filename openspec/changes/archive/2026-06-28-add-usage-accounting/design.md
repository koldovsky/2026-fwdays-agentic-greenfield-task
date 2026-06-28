# Design — add-usage-accounting

## Architecture decisions

### Decision 1 — `recordUsage` lives in `lib/ai/`, not `app/`

`lib/ai/` is the designated home for all AI pipeline modules (prompts, model config,
usage, cost). `recordUsage` is `server-only` (guarded by the `import "server-only"`
sentinel that prevents accidental client bundling) and calls `lib/db` directly —
precedent is already set by `lib/auth/session.ts`. It is never called from a client
component or a public route handler; the only callers are server-side AI pipeline code
in `ai-interview` and `report` (manual slices).

### Decision 2 — `costUsd` stored at write time, not computed at read time

Storing `costUsd = cost(model, inputTokens, outputTokens)` at write time (inside
`recordUsage`) means each row is self-contained: the price that was in effect when the
call was made is baked into the row. The spend view reads and sums the stored values
rather than running the price formula again — this satisfies FR-USAGE-02's "historical
rows keep the price that applied when they were recorded" requirement.

### Decision 3 — `Float` for `costUsd` (deferred to `Decimal`)

Prisma's `Float` maps to Postgres `float8` (IEEE-754 double), which can accumulate
rounding error across many rows when summed in JavaScript with `+`. For MVP scale this
is imperceptible, but it is logged as SEC-BL-08 in `docs/qa/security-backlog.md` for a
future schema-hardening slice that migrates to `Decimal` / Postgres `numeric`.

### Decision 4 — Grand total and per-cycle grouping done in-process

The spend view has no SLA on response time beyond page-render latency. Grouping in JS
(`Map<cycleId, ...>`) is simple, correct, and avoids a complex GROUP-BY SQL query for
MVP scale. If row counts grow large enough to make this slow, a DB aggregation view or a
`SUM()` query can replace it without changing the page's public interface.

### Decision 5 — `inputTokens`/`outputTokens` not selected in the spend view

The spend view shows only cost, not raw token counts. Selecting and transmitting
`inputTokens`/`outputTokens` to the client would expose implementation detail data that
is not rendered (and could accumulate in memory for large datasets). The fields are
stored in the DB for debugging and future reporting but omitted from the spend view's
`fetchRows()` select clause.

## Prisma model

```prisma
enum UsagePurpose {
  interview
  summary
}

model UsageRow {
  id                 String       @id @default(cuid())
  cycleId            String
  cycle              Cycle        @relation(fields: [cycleId], references: [id])
  purpose            UsagePurpose
  model              String
  inputTokens        Int
  outputTokens       Int
  cachedInputTokens  Int?
  costUsd            Float
  createdAt          DateTime     @default(now())

  @@index([cycleId])
}
```

`Cycle` gets a back-relation: `usageRows UsageRow[]`.

## `recordUsage` contract

```typescript
// lib/ai/record-usage.ts
import "server-only";
export async function recordUsage(input: unknown): Promise<void>
```

- Accepts `unknown` — validates with `recordUsageInputSchema` (Zod, throws on failure).
- Computes `costUsd` via `cost(parsed.model, parsed.inputTokens, parsed.outputTokens)`.
- Writes `db.usageRow.create(...)`.
- Never swallows errors — the DB write failing will surface as a server-side exception.

## Spend view layout

```
/usage
├─ PageHeader (title: uk.usage.pageTitle)
├─ Grand total
│   ├─ Heading: uk.usage.grandTotal
│   ├─ Value: formatUsd(grandTotal)
│   └─ BreakdownTable (all rows, aggregated by model×purpose)
└─ Per cycle
    ├─ Heading: uk.usage.perCycle
    └─ For each cycle (order: first usage row, asc):
        ├─ Subheading: subjectName + formatUsd(group.total)
        └─ BreakdownTable (that cycle's rows)
```

`BreakdownTable` renders a `<table>` with columns: Model | Purpose | Cost, USD.
Rows are aggregated by `model|purpose` key, sorted by model then purpose.
Empty → `EmptyState`. DB error → `ErrorState` (try/catch wraps `fetchRows()`).
