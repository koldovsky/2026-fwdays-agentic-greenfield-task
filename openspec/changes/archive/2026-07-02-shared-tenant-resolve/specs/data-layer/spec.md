## ADDED Requirements

### Requirement: Tenant resolution is single-sourced

The system SHALL expose one shared resolver, `resolveUserId(client, chatId): Promise<number | null>`,
from `src/db/resolveUser.ts`, that turns a Telegram `chat_id` into the internal `user_id` (invariant
#8 — the chat is the auth). Every tenant-scoped service that needs *only* the tenant id SHALL import
this resolver; no such service SHALL define its own copy of the `chat_id → user_id` lookup (a
module-private `resolveUserId` or an inline `user.findUnique({ where: { chatId }, select: { id: true } })`).

The resolver's client parameter SHALL be the narrow structural `UserResolveClient =
Pick<PrismaClient, 'user'>`, so any service's own narrow client (`Pick<PrismaClient, 'user' | …>`)
satisfies it without widening.

#### Scenario: A tenant-scoped service resolves the tenant id via the shared home

- **WHEN** the food, metrics, or progress service resolves a `chat_id` to its internal `user_id`
- **THEN** it calls `resolveUserId` imported from `src/db/resolveUser.ts`, and defines no local copy
  of the lookup

#### Scenario: Unknown chat returns null

- **WHEN** `resolveUserId` receives a `chat_id` with no matching `users` row
- **THEN** it returns `null`, and the calling service returns `null` (no side effect) exactly as before

#### Scenario: A fused fetch is not a copy

- **WHEN** a service needs the tenant `id` **and** additional user columns in the same round-trip
  (e.g. `nutrition-query` fetching macro targets alongside the id)
- **THEN** it MAY keep its own `findUnique`, because splitting it into `resolveUserId` plus a second
  query would add a round-trip (N+1); this is a distinct fetch, not a copy of the id-only resolver

### Requirement: Tenant-resolution extraction preserves observable behavior

Repointing the food, metrics, and progress services to the shared resolver SHALL NOT change their
observable behavior. Each SHALL resolve the same `user_id` (or `null`) for any given `chat_id` as
before, and their existing test suites SHALL stay green with no modification.

#### Scenario: Existing service behavior unchanged

- **WHEN** the food, metrics, and progress logging paths resolve the tenant after the extraction
- **THEN** the resolved `user_id` for any given `chat_id` matches the pre-extraction result, and the
  food/metrics/progress suites pass without modification
