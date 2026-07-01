## Context

The `chat_id → user_id` tenant-resolution preamble (invariant #8) has three verbatim homes:
a module-private `resolveUserId` in `src/food/service.ts` (id-only, `FoodClient`) and
`src/progress/service.ts` (id-only, `ProgressClient`), plus the inline
`const user = await client.user.findUnique({ where: { chatId }, select: { id: true } })` in
`src/metrics/service.ts` (`MetricsClient`). The canonical shared home **already exists** —
`src/db/resolveUser.ts`, exporting `resolveUserId(client: UserResolveClient, chatId): Promise<number | null>`
and `type UserResolveClient = Pick<PrismaClient, 'user'>` — landed by the `reviews` change and already
imported by `src/reviews/service.ts`. Its unit test `test/db/resolveUser.test.ts` also exists. This is
rule #12 (reuse-first): repoint the three copies to the one home, add no copy N+1. Sibling of the
archived `shared-lang` / `shared-fmt` extractions.

## Goals / Non-Goals

**Goals:**
- One home for id-only tenant resolution: `src/db/resolveUser.ts`, imported by food, metrics, progress.
- Zero behavior change; existing food/metrics/progress/query suites stay green untouched.
- Confirm the shared home's unit coverage in `test/db/resolveUser.test.ts` is sufficient.

**Non-Goals:**
- No new resolver variant, no broadening of `resolveUserId` (it stays id-only).
- No refactor of surrounding service logic beyond removing the copied lookup.
- No change to `src/query/service.ts` (see the fused-fetch decision below).

## Decisions

- **Repoint the three id-only copies (food, progress, metrics).** All three narrow clients are
  `Pick<PrismaClient, 'user' | …>`, so each structurally satisfies `UserResolveClient =
  Pick<PrismaClient, 'user'>` and passes to `resolveUserId` without widening. Delete each local copy,
  add `import { resolveUserId } from '../db/resolveUser.js';`.
  - food/progress: named `resolveUserId` deleted; call sites already read `(client, chatId)` — no
    call-site edit beyond the import.
  - metrics: inline `findUnique` + `if (!user)` replaced with
    `const userId = await resolveUserId(client, chatId); if (userId === null) return null;` then
    `user.id` → `userId` at the two downstream uses (`priorHistory`, `upsertMetrics`). Same null
    semantics (`!user` ⇔ `userId === null` for an absent row).

- **`src/query/service.ts` is a deliberate NON-target — keep its fused `findUnique`.** Query selects
  the tenant `id` **and** `targetKcal`/`targetProteinG`/`targetFatG`/`targetCarbsG` in one round-trip.
  Repointing to `resolveUserId` (id-only) would force a second `findUnique` for the targets — an N+1
  regression that backend-conventions forbids, for zero dedup benefit (the target projection is unique
  to query). It is a distinct fetch-user-with-targets query, not copy N+1 of the id-only resolver. The
  spec's "fused fetch is not a copy" scenario records this so a future dup gate doesn't re-flag it.
  (The backlog item named query as a fourth copy; on inspection it is a fused fetch, so it is
  documented out rather than force-merged.)

- **No export-surface change to `src/db/resolveUser.ts`.** `resolveUserId` + `UserResolveClient` are
  exactly what the three consumers need; nothing added or renamed.

## Risks / Trade-offs

- **Risk: a copy silently diverged.** Mitigation — the three id-only copies are confirmed identical in
  shape (`findUnique({ where: { chatId }, select: { id: true } })`, `?.id ?? null`); the shared home's
  unit test pins the contract, and the untouched food/metrics/progress suites are the regression guard.
- **Trade-off: query keeps a near-duplicate `where: { chatId }` shape.** Accepted — merging it would
  add a round-trip. The shared spec explicitly carves out fused fetches so this is a recorded decision,
  not undetected debt.
- **No LLM, no new dependency, no memory-cap impact** — a pure code move; net image size shrinks.
