## Why

The "resolve the tenant's internal `id` from their Telegram `chat_id`" preamble (invariant #8 —
the chat is the auth) has drifted into three verbatim homes: a module-private `resolveUserId` in
`src/food/service.ts` **and** `src/progress/service.ts`, plus the inline
`user.findUnique({ where: { chatId }, select: { id: true } })` form in `src/metrics/service.ts`.
The canonical shared home already exists — `src/db/resolveUser.ts` (landed by `reviews`, imported by
`src/reviews/service.ts`) — so this is backend-conventions rule #12 (reuse-first): repoint the copies
to the one home, don't keep copy N+1. Sibling of the archived `shared-lang`/`shared-fmt` changes;
surfaced by the `progress-photo` step-7 dup gate + reviewer SUGGESTION #4. No US — tech debt paydown,
done now to stop the duplication from spreading to future tenant-scoped services.

## What Changes

- Repoint `src/food/service.ts`, `src/progress/service.ts`, and `src/metrics/service.ts` to import
  `resolveUserId` from `src/db/resolveUser.js`; delete their local `resolveUserId` / inline
  `findUnique` tenant-lookup copies.
- Extend `test/db/resolveUser.test.ts` if the shared home needs additional coverage; the existing
  food/metrics/progress suites are the regression guard.
- **Explicit non-target: `src/query/service.ts` stays as-is.** Its `findUnique` is a *fused* fetch —
  it selects the tenant `id` **and** the four macro targets in one round-trip, not a pure
  tenant-resolve. Repointing it to `resolveUserId` (id-only) would split one query into two, an N+1
  regression that violates backend-conventions for a no-behavior-change dedup. Documented in design.
- **No behavior change.** The existing food/metrics/progress/query suites stay green byte-for-byte.

## Capabilities

### New Capabilities
<!-- None. The shared home src/db/resolveUser.ts already exists (added by `reviews`); this change
     only repoints existing copies to it — no new capability is introduced. -->

### Modified Capabilities
- `data-layer`: strengthens the multi-tenancy requirement to mandate a **single-sourced** tenant
  resolver (`resolveUserId` in `src/db/`) that every tenant-scoped service imports — no service SHALL
  define its own copy of the `chat_id → user_id` lookup.

## Impact

- **Code:** edits to `src/food/service.ts`, `src/progress/service.ts`, `src/metrics/service.ts`
  (delete local copies, add import from `../db/resolveUser.js`). `src/query/service.ts` unchanged
  (documented fused-fetch non-target). Touches files from already-archived changes (food-text,
  metrics, progress-photo) — hence its own change, not folded into a feature.
- **Invariants:** #8 (multi-tenancy) — behavior preserved, now single-sourced through one home; the
  service layer still enforces the `user_id` filter. No change to stored values or enums.
- **Memory-cap / LLM-cost:** none — no new dependency, no runtime allocation change, no LLM call.
  Net effect is a small reduction in duplicated code shipped in the image.
- **Dependencies:** none added.
