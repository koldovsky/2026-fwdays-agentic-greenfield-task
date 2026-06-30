import { describe, expect, it, vi } from 'vitest';
import { createMetricsService } from '../../src/metrics/service.js';
import type { MetricsClient } from '../../src/metrics/types.js';

// End-to-end service wiring over a fake Prisma: every row carries user_id and the prior-history read
// is tenant-scoped (invariant #8); a same-date second message MERGES fields onto the existing row
// (no duplicate, no null-out); "вчера" lands on the router-resolved date (invariant #1); the
// confirmation shows code-built values + deltas, prose mirrors language (invariants #2/#6); an empty
// parse nudges with no write (log-by-default). No LLM call on this path (invariant #5).

interface Capture {
  data: Record<string, unknown>;
}
interface UpdateCapture {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
}

const makeFake = (
  history: unknown[] = [],
  existing: unknown = null,
): {
  client: MetricsClient;
  created: Capture[];
  updated: UpdateCapture[];
  findManyArgs: { value: unknown };
} => {
  const created: Capture[] = [];
  const updated: UpdateCapture[] = [];
  const findManyArgs = { value: undefined as unknown };

  const client = {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 7 }) },
    bodyMetric: {
      findMany: vi.fn((args: unknown) => {
        findManyArgs.value = args;
        return Promise.resolve(history);
      }),
      findFirst: vi.fn().mockResolvedValue(existing),
      create: vi.fn((args: Capture) => {
        created.push(args);
        return Promise.resolve({ id: 1, ...args.data });
      }),
      update: vi.fn((args: UpdateCapture) => {
        updated.push(args);
        return Promise.resolve({ id: 1, ...args.data });
      }),
    },
  } as unknown as MetricsClient;

  return { client, created, updated, findManyArgs };
};

describe('createMetricsService.logMetric', () => {
  it('writes a tenant-scoped row and scopes the prior-history read to the user (invariant #8)', async () => {
    const { client, created, findManyArgs } = makeFake();

    const confirmation = await createMetricsService(client).logMetric(99n, 'вес 89.2, талия 90', {
      date: '2026-06-30',
    });

    const row = created[0]?.data;
    expect(row?.userId).toBe(7);
    expect(row?.weightKg).toBe(89.2);
    expect(row?.waistCm).toBe(90);
    // The history fetch is filtered by the tenant + strictly-earlier date.
    const where = (findManyArgs.value as { where: Record<string, unknown> }).where;
    expect(where.userId).toBe(7);
    expect(where.date).toEqual({ lt: new Date('2026-06-30T00:00:00.000Z') });
    expect(confirmation?.text).toContain('89.2');
  });

  it('merges a same-date second message onto the existing row (no duplicate, no null-out)', async () => {
    // The row already has weight; a later "талия 90" must update, adding waist only.
    const existing = { id: 5, userId: 7, date: new Date('2026-06-30T00:00:00.000Z'), weightKg: 89 };
    const { client, created, updated } = makeFake([], existing);

    await createMetricsService(client).logMetric(99n, 'талия 90', { date: '2026-06-30' });

    expect(created).toHaveLength(0); // no second row
    expect(updated).toHaveLength(1);
    expect(updated[0]?.where).toEqual({ id: 5 });
    expect(updated[0]?.data).toEqual({ waistCm: 90 }); // only the mentioned field; weight untouched
    expect(updated[0]?.data).not.toHaveProperty('weightKg');
  });

  it('back-dates the row to the router-resolved date on "вчера"', async () => {
    const { client, created } = makeFake();

    await createMetricsService(client).logMetric(99n, 'вчера вес 90', { date: '2026-06-29' });

    expect(created[0]?.data.date).toEqual(new Date('2026-06-29T00:00:00.000Z'));
  });

  it('confirms code-built values + signed deltas vs the prior, mirroring Russian prose', async () => {
    const history = [
      { id: 2, userId: 7, date: new Date('2026-06-22T00:00:00.000Z'), weightKg: 90 },
    ];
    const { client } = makeFake(history);

    const confirmation = await createMetricsService(client).logMetric(99n, 'вес 89.2', {
      date: '2026-06-30',
    });

    expect(confirmation?.text).toContain('Записал'); // ru voice
    expect(confirmation?.text).toContain('Вес');
    expect(confirmation?.text).toContain('89.2');
    expect(confirmation?.text).toContain('↓0.8'); // signed delta from code
    expect(confirmation?.text).toContain('2026-06-22'); // since the prior entry
  });

  it('mirrors English prose and units for an English message', async () => {
    const { client } = makeFake();

    const confirmation = await createMetricsService(client).logMetric(99n, 'weight 89.2', {
      date: '2026-06-30',
    });

    expect(confirmation?.text).toContain('Logged');
    expect(confirmation?.text).toContain('Weight');
    expect(confirmation?.text).toContain('kg');
  });

  it('shows no delta for a first-ever metric', async () => {
    const { client } = makeFake();

    const confirmation = await createMetricsService(client).logMetric(99n, 'талия 90', {
      date: '2026-06-30',
    });

    expect(confirmation?.text).toContain('90');
    expect(confirmation?.text).not.toContain('↓');
    expect(confirmation?.text).not.toContain('↑');
  });

  it('nudges (no write) when nothing parses — log-by-default', async () => {
    const { client, created, updated } = makeFake();

    const confirmation = await createMetricsService(client).logMetric(99n, 'спасибо', {
      date: '2026-06-30',
    });

    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(0);
    expect(confirmation?.text).toBeTruthy();
  });

  it('returns null for an unknown chat_id (no row, no leak)', async () => {
    const { client, created } = makeFake();
    (client.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const confirmation = await createMetricsService(client).logMetric(99n, 'вес 89', {
      date: '2026-06-30',
    });

    expect(confirmation).toBeNull();
    expect(created).toHaveLength(0);
  });
});
