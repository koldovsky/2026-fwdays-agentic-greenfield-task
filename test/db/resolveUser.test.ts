import { describe, expect, it, vi } from 'vitest';
import { resolveUserId, type UserResolveClient } from '../../src/db/resolveUser.js';

// The canonical tenant resolution (design D4): a known chat_id yields its internal id; an unknown one
// yields null so every caller is forced to guard the missing-user case (backend-conventions rule 9).

const makeFake = (user: { id: number } | null): UserResolveClient =>
  ({ user: { findUnique: vi.fn().mockResolvedValue(user) } }) as unknown as UserResolveClient;

describe('resolveUserId', () => {
  it('resolves the internal id for a known chat_id', async () => {
    const client = makeFake({ id: 7 });

    expect(await resolveUserId(client, 99n)).toBe(7);
  });

  it('returns null for an unknown chat_id (no leak, forces the guard)', async () => {
    const client = makeFake(null);

    expect(await resolveUserId(client, 12345n)).toBeNull();
  });

  it('queries by chat_id selecting only the id', async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: 3 });
    const client = { user: { findUnique } } as unknown as UserResolveClient;

    await resolveUserId(client, 42n);

    expect(findUnique).toHaveBeenCalledWith({ where: { chatId: 42n }, select: { id: true } });
  });
});
