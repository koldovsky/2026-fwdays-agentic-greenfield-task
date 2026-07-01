import { describe, expect, it, vi } from 'vitest';
import { writeProgressNote } from '../../src/progress/write.js';
import type { ProgressClient } from '../../src/progress/types.js';

// The write goes through tenantWhere (carries user_id, invariant #8), stores the observations + the
// UTC-midnight date, and NO image field is ever present in the write payload (invariant #4 at rest).

interface Capture {
  data: Record<string, unknown>;
}

const makeClient = (): { client: ProgressClient; created: Capture[] } => {
  const created: Capture[] = [];
  const client = {
    progressNote: {
      create: vi.fn((args: Capture) => {
        created.push(args);
        return Promise.resolve({ id: 1, ...args.data });
      }),
    },
  } as unknown as ProgressClient;
  return { client, created };
};

describe('writeProgressNote', () => {
  it('writes a tenant-scoped row with the observations + UTC-midnight date and no image field', async () => {
    const { client, created } = makeClient();

    await writeProgressNote(client, 7, '2026-07-01', 'Живот в профиль стал площе.');

    const row = created[0]?.data;
    expect(row?.userId).toBe(7); // tenantWhere injected user_id (invariant #8)
    expect(row?.observations).toBe('Живот в профиль стал площе.');
    expect(row?.date).toEqual(new Date('2026-07-01T00:00:00.000Z'));
    // No image bytes anywhere in the payload (invariant #4 at rest).
    expect(Object.keys(row ?? {}).sort()).toEqual(['date', 'observations', 'userId'].sort());
  });
});
