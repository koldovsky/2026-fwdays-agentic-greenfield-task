import { describe, expect, it, vi } from 'vitest';
import { startReviewScheduler, sweepReviews } from '../../src/reviews/scheduler.js';
import type { ReviewClient, ReviewService } from '../../src/reviews/types.js';

// Per-user local-midnight sweep (ADR-0020): only users whose LOCAL hour is 00 fire, the finished day
// is their local yesterday, an already-reviewed day is skipped (idempotency guard), and a throwing
// user never aborts the sweep. The clock and cron scheduler are injected — no real timers.

interface FakeUser {
  id: number;
  chatId: bigint;
  tz: string;
}

const makeClient = (users: FakeUser[], existing: (userId: number) => unknown): ReviewClient =>
  ({
    user: { findMany: vi.fn().mockResolvedValue(users) },
    review: {
      findUnique: vi.fn((args: { where: { userId_period_periodStart: { userId: number } } }) =>
        Promise.resolve(existing(args.where.userId_period_periodStart.userId)),
      ),
    },
  }) as unknown as ReviewClient;

// 2026-06-30T00:30Z → local hour 00 in UTC, 09 in Tokyo (UTC+9): only the UTC user is due.
const NOW = new Date('2026-06-30T00:30:00.000Z');

describe('sweepReviews', () => {
  it('generates + sends the finished day only for users at their local midnight', async () => {
    const client = makeClient(
      [
        { id: 1, chatId: 100n, tz: 'UTC' },
        { id: 2, chatId: 200n, tz: 'Asia/Tokyo' },
      ],
      () => null,
    );
    const service: ReviewService = {
      generateDaily: vi.fn().mockResolvedValue({ text: 'ревью' }),
    };
    const send = vi.fn().mockResolvedValue(undefined);

    await sweepReviews(service, client, send, () => NOW);

    expect(service.generateDaily).toHaveBeenCalledTimes(1);
    expect(service.generateDaily).toHaveBeenCalledWith(100n, {
      date: '2026-06-29',
      reviewed: false,
    });
    expect(send).toHaveBeenCalledWith(100n, 'ревью');
  });

  it('skips a day that already has a daily review (no regenerate, no double send)', async () => {
    const client = makeClient([{ id: 1, chatId: 100n, tz: 'UTC' }], () => ({ id: 99 }));
    const service: ReviewService = { generateDaily: vi.fn() };
    const send = vi.fn();

    await sweepReviews(service, client, send, () => NOW);

    expect(service.generateDaily).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('a throwing user does not abort the sweep — later due users still run', async () => {
    const client = makeClient(
      [
        { id: 1, chatId: 100n, tz: 'UTC' },
        { id: 2, chatId: 200n, tz: 'UTC' },
      ],
      () => null,
    );
    const generateDaily = vi
      .fn()
      .mockRejectedValueOnce(new Error('chat blocked'))
      .mockResolvedValueOnce({ text: 'ревью' });
    const service: ReviewService = { generateDaily };
    const send = vi.fn().mockResolvedValue(undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await sweepReviews(service, client, send, () => NOW);

    expect(generateDaily).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(1); // the second user still got their review
    warn.mockRestore();
  });

  it('a transient failure of the outer user-listing query is caught, not an unhandled rejection', async () => {
    const client = {
      user: { findMany: vi.fn().mockRejectedValue(new Error('connection reset')) },
      review: { findUnique: vi.fn() },
    } as unknown as ReviewClient;
    const service: ReviewService = { generateDaily: vi.fn() };
    const send = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(sweepReviews(service, client, send, () => NOW)).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('connection reset');
    expect(service.generateDaily).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('startReviewScheduler', () => {
  it('registers a single hourly cron job wired to the sweep', () => {
    const task = { stop: vi.fn() };
    const schedule = vi.fn().mockReturnValue(task);
    const client = makeClient([], () => null);
    const service: ReviewService = { generateDaily: vi.fn() };

    const returned = startReviewScheduler(service, client, vi.fn(), { schedule });

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
    expect(returned).toBe(task);
  });
});
