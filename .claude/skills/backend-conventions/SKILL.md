---
name: backend-conventions
description: TypeScript backend code conventions for this bot — guard clauses (no else-hell), explicit return types, minimal comments, extracted helpers, no N+1 Prisma queries, explicit-nullable DB returns, Prisma migration workflow. Apply when writing, reviewing, or refactoring any code under src/ (bot, food, metrics, reviews, llm, notion, db, config).
---

# Backend Conventions

Code-craft rules for the Sport & Nutrition Coach bot — plain TypeScript + Node, **grammY**,
**Prisma**, raw Anthropic API. No NestJS, no CQRS, no framework: structure is folder discipline
(see [AGENTS.md](../../../AGENTS.md) → "Code structure").

These are **how to write the code**. The behavioral/architectural laws (DB is memory, totals from
SUM, `source=fact|estimate`, images never persisted, no agent loop) live in AGENTS.md
"Non-negotiable rules" — not restated here.

Each rule below is one tight pair: incorrect → correct. Apply all that bear on the file you touch.

## 1. Guard clauses, not else-hell

Handle edge cases with early returns at the top. The happy path stays flat at the bottom — never
buried in nested `if/else`.

```typescript
// ❌ nested
async function logFood(input: ParsedFood): Promise<FoodLog> {
  if (input) {
    if (input.grams > 0) {
      const match = await catalog.find(input.product);
      if (match) {
        return db.foodLog.create({ data: toRow(input, match) });
      } else {
        throw new Error('no catalog match');
      }
    } else {
      throw new Error('grams must be positive');
    }
  } else {
    throw new Error('empty input');
  }
}

// ✅ guard clauses
async function logFood(input: ParsedFood): Promise<FoodLog> {
  if (!input) {
    throw new Error('empty input');
  }
  if (input.grams <= 0) {
    throw new Error('grams must be positive');
  }

  const match = await catalog.find(input.product);

  return db.foodLog.create({ data: toRow(input, match) });
}
```

## 2. Always curly braces

Braceless single-line `if` is banned — every `if` body uses `{ }`, however trivial. Prevents
silent bugs when a second statement is added later.

```typescript
if (!user) return;                    // ❌
if (!user) {                          // ✅
  return;
}
```

## 3. Explicit return types

Every function and method declares its return type. No inference on signatures — the type is the
contract and catches regressions before runtime.

```typescript
async function dailyKcal(userId: string, date: string) { … }            // ❌
async function dailyKcal(userId: string, date: string): Promise<number> { … }  // ✅
```

## 4. Minimal, purposeful comments

Comment **why**, never **what**. Code is self-documenting through names. The only comments worth
their tokens explain a non-obvious business rule or formula.

```typescript
// ❌ restates the code
// get today's food rows
const rows = await db.foodLog.findMany({ where: { userId, date } });
// sum the protein
const protein = rows.reduce((s, r) => s + r.proteinG, 0);

// ✅ no comment needed — names carry it
const rows = await db.foodLog.findMany({ where: { userId, date } });
const proteinG = rows.reduce((sum, r) => sum + r.proteinG, 0);

// ✅ comment earns its place — explains a non-obvious rule
// Mifflin–St Jeor, then ×activity for TDEE; deficit capped at 20% to avoid muscle loss on a cut.
const targetKcal = tdee * (1 - Math.min(deficitPct, 0.20));
```

## 5. Extract helpers — no inline functions

Don't define utility functions inside method bodies. Extract to the domain module (or a shared
`util`) as a `const` arrow with an explicit return type — reusable and testable. Exception: trivial
callbacks tied to the call site (`.filter(r => r.source === 'fact')`).

```typescript
// ❌ helper born inside the handler
async function handlePhoto(msg: Message): Promise<void> {
  const round1 = (n: number) => Math.round(n * 10) / 10;
  …
}

// ✅ food/macros.ts
export const round1 = (n: number): number => Math.round(n * 10) / 10;
// handler imports it
```

## 6. Top-level helpers are `const` arrows with explicit return types

Top-level helpers and factories (utility functions, test builders) are `const` arrow functions with
an explicit return type — not `function` declarations. Pairs with rule 5 (which governs helpers
*inside* bodies) and rule 3. When a test mock doesn't satisfy the full type, cast `as unknown as T`
— **never** `as any`, so the annotation stays meaningful.

```typescript
// ❌ function declaration, no return type, `as any`
function buildFoodLog(over = {}) {
  return { id: '1', source: 'fact', proteinG: 30, ...over } as any;
}

// ✅ const arrow, explicit return type, honest cast
const buildFoodLog = (over: Partial<FoodLog> = {}): FoodLog =>
  ({ id: '1', source: 'fact', proteinG: 30, ...over }) as unknown as FoodLog;

// ✅ multi-statement body uses block form
const buildPrismaMock = (rows: FoodLog[]): PrismaClient => {
  const mock = { foodLog: { findMany: vi.fn().mockResolvedValue(rows) } };

  return mock as unknown as PrismaClient;
};
```

## 7. Vertical rhythm

Separate the three phases of a body with blank lines: **declarations → logic → return**. Makes the
data flow scannable at a glance.

```typescript
async function review(userId: string, date: string): Promise<DailyReview> {
  const rows = await db.foodLog.findMany({ where: { userId, date } });

  const totals = sumMacros(rows);
  const prose = await llm.writeReview(totals);

  return { ...totals, prose };
}
```

## 8. No N+1 — batch Prisma queries

Never query the DB inside a loop. A list of N items must not fire N queries — it wrecks the review
cron that walks many users/days. Batch with `in`, a relation `include`, or `Promise.all` after one
fetch.

```typescript
// ❌ N+1 — one query per user
for (const userId of userIds) {
  const rows = await db.foodLog.findMany({ where: { userId, date } });
  await buildReview(userId, rows);
}

// ✅ one query, grouped in memory
const rows = await db.foodLog.findMany({
  where: { userId: { in: userIds }, date },
});
const byUser = Map.groupBy(rows, (r) => r.userId);
await Promise.all(userIds.map((id) => buildReview(id, byUser.get(id) ?? [])));
```

## 9. DB single-record reads return `T | null` explicitly

Any function fetching one row declares `Promise<T | null>`, so every caller is forced to guard the
missing-row case. Prisma `findUnique`/`findFirst` already return `null` — surface it, don't hide it
behind a non-null signature.

```typescript
// ❌ signature lies — caller assumes it always exists
async function findUser(chatId: bigint): Promise<User> {
  return db.user.findUnique({ where: { chatId } }) as Promise<User>;
}

// ✅ honest contract forces the guard
async function findUser(chatId: bigint): Promise<User | null> {
  return db.user.findUnique({ where: { chatId } });
}

const user = await findUser(chatId);
if (!user) {
  return startOnboarding(chatId);   // unknown chat_id → create flow
}
```

## 10. Prisma migration workflow

All schema changes go through Prisma migrations — never `prisma db push` against prod, never
hand-edited SQL outside a migration.

1. Edit `prisma/schema.prisma`.
2. `npx prisma migrate dev --name <kebab-name>` — generates the SQL migration.
3. **Inspect the generated SQL** before committing; one concern per migration.
4. Commit `schema.prisma` + the migration folder together.
5. Prod applies via `prisma migrate deploy` in the container start, not on the host
   (builds are off-box — AGENTS.md memory-cap rules).

Every domain table carries `user_id` (multi-tenancy, AGENTS.md). Money/macro columns: use Prisma
`Decimal` or integer grams/kcal — never `Float` for stored nutrition values.

## 11. Test the rules that can drift

The behavioral laws are testable — cover them, don't trust them. Each `src/<area>/x.ts` with real
logic gets a sibling test. Minimum targets (from PRD acceptance criteria):

- daily/period total **always equals** the `SUM` of `food_log` rows (never hand-summed);
- catalog match → `source=fact`; miss → `source=estimate`;
- "вчера"/"yesterday" back-dates to the correct user-TZ date;
- food/progress images are **never** written to disk.
