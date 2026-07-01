## 1. Repoint the three id-only copies

- [x] 1.1 `src/food/service.ts`: delete the local `resolveUserId` (lines ~33-36); add
  `import { resolveUserId } from '../db/resolveUser.js';` (keep the existing six call sites, which
  already read `resolveUserId(prisma, chatId)`).
- [x] 1.2 `src/progress/service.ts`: delete the local `resolveUserId` (lines ~12-15); add
  `import { resolveUserId } from '../db/resolveUser.js';` (keep the existing call site).
- [x] 1.3 `src/metrics/service.ts`: replace the inline
  `const user = await client.user.findUnique({ where: { chatId }, select: { id: true } });`
  + `if (!user) return null;` with
  `const userId = await resolveUserId(client, chatId);` + `if (userId === null) return null;`;
  repoint the two downstream `user.id` uses (`priorHistory`, `upsertMetrics`) to `userId`; add
  `import { resolveUserId } from '../db/resolveUser.js';`.
- [x] 1.4 Grep `src/` for any remaining `resolveUserId` definition (`const resolveUserId =`) or inline
  `findUnique({ where: { chatId }, select: { id: true } })` — confirm `src/db/resolveUser.ts` is the
  only id-only tenant-resolve home (query's fused id+targets `findUnique` is the documented exception).

## 2. Verify no behavior change

- [x] 2.1 Confirm `test/db/resolveUser.test.ts` covers the resolver contract (returns id for a known
  chat, `null` for an unknown one, uses the narrow `user` delegate). Add cases only if a gap exists.
- [x] 2.2 Run `npm test` — the shared resolver suite green AND the existing food/metrics/progress/query
  suites pass unchanged (regression guard for invariant #8, no behavior change).
- [x] 2.3 Run `npm run lint`, `npm run format:check`, `npm run typecheck` — all green (each narrow
  client must still satisfy `UserResolveClient` structurally).

## 3. Review

- [x] 3.1 Hand the diff to a SEPARATE reviewer subagent (the `review` skill: Standards + Spec axes)
  before commit. Maker ≠ checker; no self-approval. Resolve every finding.
