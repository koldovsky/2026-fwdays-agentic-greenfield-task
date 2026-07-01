import type { PrismaClient } from '@prisma/client';

// Canonical tenant resolution (design D4): the single shared home that turns a Telegram `chat_id`
// into the internal `user_id` — the chat IS the auth (invariant #8). The param is the narrow
// structural `user` delegate, so any service's `Pick<PrismaClient, 'user' | …>` client satisfies it.
// `reviews` imports THIS; the four pre-existing inline copies (food/metrics/query/progress) are
// repointed by the separate `shared-tenant-resolve` change, not here — this change adds no fifth copy.

/** Any client exposing the Prisma `user` delegate (a real client or a narrow service `Pick`). */
export type UserResolveClient = Pick<PrismaClient, 'user'>;

/** The tenant's internal id for a `chat_id`, or `null` when the chat has never onboarded. */
export const resolveUserId = async (
  client: UserResolveClient,
  chatId: bigint,
): Promise<number | null> => {
  const user = await client.user.findUnique({ where: { chatId }, select: { id: true } });
  return user?.id ?? null;
};
