import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NotionSourceTable } from '@prisma/client';
import type { Env } from '../../src/config/env.js';
import {
  computeBackoffMs,
  runNotionBatch,
  startNotionWorker,
  type WorkerDeps,
} from '../../src/notion/worker.js';
import type { NotionPageApi, WorkerClient } from '../../src/notion/types.js';

// The in-process poll worker (US-10, §9; invariant #7). Load-bearing: a pending row is mirrored then
// marked done with its page id; a correction over a prior `done` row UPDATES rather than duplicates;
// Notion calls are throttled (~3 req/s) via an injected sleep; a failure retries with backoff and
// `last_error` = message ONLY (invariant #9); attempts at the cap dead-letter and are never re-picked;
// one bad row never aborts the batch; and an absent/disabled/oauth config skips with NO Notion call.
// Every source read is tenant-scoped (invariant #8). All clocks/sleep/clients are injected — no timers.

const NOW = new Date('2026-07-02T12:00:00.000Z');
const SECRET = 'secret-notion-token';

const env = (): Env => ({ NOTION_TOKEN: SECRET }) as unknown as Env;

const envConfig = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  userId: 7,
  authType: 'env',
  credentialRef: 'NOTION_TOKEN',
  dbFoodlogId: 'db-foodlog',
  dbReviewsId: 'db-reviews',
  dbMetricsId: 'db-metrics',
  dbFooddbId: 'db-fooddb',
  enabled: true,
  ...over,
});

interface SyncRow {
  id: number;
  userId: number;
  sourceTable: NotionSourceTable;
  sourceId: number;
  notionPageId: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: Date | null;
  createdAt: Date;
}

const syncRow = (over: Partial<SyncRow> = {}): SyncRow => ({
  id: 1,
  userId: 7,
  sourceTable: 'food_log',
  sourceId: 100,
  notionPageId: null,
  status: 'pending',
  attempts: 0,
  lastError: null,
  nextAttemptAt: null,
  createdAt: NOW,
  ...over,
});

const foodSourceRow = (): Record<string, unknown> => ({
  id: 100,
  userId: 7,
  date: new Date('2026-07-02T00:00:00.000Z'),
  meal: 'lunch',
  entryName: 'куриное филе',
  qty: 200,
  unit: 'g',
  kcal: 330,
  proteinG: 62,
  fatG: 7.2,
  carbsG: 0,
  source: 'estimate',
  foodDbId: null,
});

interface UpdateCall {
  where: { id: number };
  data: Record<string, unknown>;
}
interface SourceWhere {
  table: NotionSourceTable;
  where: { userId?: number; id?: number };
}

interface World {
  client: WorkerClient;
  notion: NotionPageApi;
  creates: { parent: { database_id: string }; properties: Record<string, unknown> }[];
  updates: { page_id: string; properties: Record<string, unknown> }[];
  syncUpdates: UpdateCall[];
  sourceWheres: SourceWhere[];
}

interface WorldOptions {
  rows: SyncRow[];
  config?: Record<string, unknown> | null;
  createImpl?: () => Promise<{ id: string }>;
}

const makeWorld = (options: WorldOptions): World => {
  const rows = options.rows;
  const config = options.config === undefined ? envConfig() : options.config;
  const creates: World['creates'] = [];
  const updates: World['updates'] = [];
  const syncUpdates: UpdateCall[] = [];
  const sourceWheres: SourceWhere[] = [];

  let pageSeq = 0;
  const notion: NotionPageApi = {
    pages: {
      create: vi.fn(
        (args: { parent: { database_id: string }; properties: Record<string, unknown> }) => {
          if (options.createImpl) {
            return options.createImpl();
          }
          creates.push(args);
          pageSeq += 1;
          return Promise.resolve({ id: `page-${pageSeq}` });
        },
      ),
      update: vi.fn((args: { page_id: string; properties: Record<string, unknown> }) => {
        updates.push(args);
        return Promise.resolve({});
      }),
    },
  };

  const sourceFindFirst = (table: NotionSourceTable): ReturnType<typeof vi.fn> =>
    vi.fn((args: { where: { userId?: number; id?: number } }) => {
      sourceWheres.push({ table, where: args.where });
      if (table !== 'food_log') {
        return Promise.resolve(null);
      }
      const row = foodSourceRow();
      return Promise.resolve(args.where.userId === row.userId ? row : null);
    });

  const client = {
    notionSync: {
      findMany: vi.fn(
        (args: {
          where: { status: { in: string[] }; OR: { nextAttemptAt: { lte: Date } | null }[] };
          take: number;
        }) => {
          const statuses = args.where.status.in;
          const lteClause = args.where.OR.find((c) => c.nextAttemptAt !== null);
          const lte = lteClause?.nextAttemptAt?.lte ?? NOW;
          const due = rows
            .filter(
              (r) =>
                statuses.includes(r.status) && (r.nextAttemptAt === null || r.nextAttemptAt <= lte),
            )
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .slice(0, args.take);
          return Promise.resolve(due);
        },
      ),
      findFirst: vi.fn(
        (args: { where: { sourceTable: NotionSourceTable; sourceId: number; status: string } }) => {
          const prior = rows
            .filter(
              (r) =>
                r.sourceTable === args.where.sourceTable &&
                r.sourceId === args.where.sourceId &&
                r.status === args.where.status &&
                r.notionPageId !== null,
            )
            .sort((a, b) => b.id - a.id)[0];
          return Promise.resolve(prior ? { notionPageId: prior.notionPageId } : null);
        },
      ),
      update: vi.fn((args: UpdateCall) => {
        syncUpdates.push(args);
        const row = rows.find((r) => r.id === args.where.id);
        if (row) {
          Object.assign(row, args.data);
        }
        return Promise.resolve(row);
      }),
    },
    notionConfig: { findUnique: vi.fn().mockResolvedValue(config) },
    foodLog: { findFirst: sourceFindFirst('food_log') },
    foodDatabase: { findFirst: sourceFindFirst('food_database') },
    bodyMetric: { findFirst: sourceFindFirst('body_metrics') },
    review: { findFirst: sourceFindFirst('review') },
  } as unknown as WorkerClient;

  return { client, notion, creates, updates, syncUpdates, sourceWheres };
};

const deps = (world: World, over: Partial<WorkerDeps> = {}): WorkerDeps => ({
  now: () => NOW,
  random: () => 0,
  sleep: vi.fn().mockResolvedValue(undefined),
  clientFactory: () => world.notion,
  throttleMs: 334,
  maxAttempts: 5,
  ...over,
});

afterEach(() => vi.restoreAllMocks());

describe('runNotionBatch — happy path', () => {
  it('creates a page for a pending row and marks it done + stores the page id', async () => {
    const world = makeWorld({ rows: [syncRow()] });

    await runNotionBatch(world.client, env(), deps(world));

    expect(world.creates).toHaveLength(1);
    expect(world.creates[0]?.parent.database_id).toBe('db-foodlog'); // the food-log DB
    expect(world.updates).toHaveLength(0); // create, not update
    expect(world.syncUpdates[0]?.data).toMatchObject({ status: 'done', notionPageId: 'page-1' });
  });

  it('reads the source row tenant-scoped (invariant #8)', async () => {
    const world = makeWorld({ rows: [syncRow({ userId: 7 })] });

    await runNotionBatch(world.client, env(), deps(world));

    const where = world.sourceWheres.find((s) => s.table === 'food_log')?.where;
    expect(where?.userId).toBe(7); // the tenant filter is present on the source read
    expect(where?.id).toBe(100);
  });
});

describe('runNotionBatch — idempotent correction', () => {
  it('updates the existing page (no duplicate) when a prior done row has a page id', async () => {
    const prior = syncRow({ id: 1, status: 'done', notionPageId: 'existing-page' });
    const correction = syncRow({
      id: 2,
      status: 'pending',
      createdAt: new Date(NOW.getTime() + 1),
    });
    const world = makeWorld({ rows: [prior, correction] });

    await runNotionBatch(world.client, env(), deps(world));

    expect(world.updates).toHaveLength(1);
    expect(world.updates[0]?.page_id).toBe('existing-page'); // patched, not re-created
    expect(world.creates).toHaveLength(0);
    expect(world.syncUpdates[0]?.data).toMatchObject({
      status: 'done',
      notionPageId: 'existing-page',
    });
  });
});

describe('runNotionBatch — rate limiting', () => {
  it('throttles each Notion request to ~3 req/s via the injected sleep', async () => {
    const rows = [
      syncRow({ id: 1, sourceId: 100, createdAt: new Date(NOW.getTime() + 1) }),
      syncRow({ id: 2, sourceId: 100, createdAt: new Date(NOW.getTime() + 2) }),
      syncRow({ id: 3, sourceId: 100, createdAt: new Date(NOW.getTime() + 3) }),
    ];
    const world = makeWorld({ rows });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await runNotionBatch(world.client, env(), deps(world, { sleep }));

    // One throttle sleep per Notion request, each ≥ ~334ms (≤ 3 req/s).
    expect(sleep).toHaveBeenCalledTimes(3);
    for (const call of sleep.mock.calls) {
      expect(call[0]).toBeGreaterThanOrEqual(334);
    }
  });
});

describe('runNotionBatch — failure handling', () => {
  it('schedules a retry with backoff and a message-only last_error (invariant #9)', async () => {
    const world = makeWorld({
      rows: [syncRow()],
      createImpl: () => Promise.reject(new Error('notion 500')),
    });

    await runNotionBatch(world.client, env(), deps(world));

    const data = world.syncUpdates[0]?.data;
    expect(data?.status).toBe('failed');
    expect(data?.attempts).toBe(1);
    expect(data?.lastError).toBe('notion 500'); // the message only — no row/body values
    // backoff = min(1000·2^1, cap) + jitter(0) = 2000ms from the injected clock.
    expect(data?.nextAttemptAt).toEqual(new Date(NOW.getTime() + 2000));
  });

  it('truncates last_error to 500 chars (invariant #9 residual-leak guard)', async () => {
    const world = makeWorld({
      rows: [syncRow()],
      createImpl: () => Promise.reject(new Error('x'.repeat(2000))),
    });

    await runNotionBatch(world.client, env(), deps(world));

    const lastError = world.syncUpdates[0]?.data.lastError as string;
    expect(lastError).toHaveLength(500); // bounded — a Notion error echoing a value can't leak in full
    expect(lastError).toBe('x'.repeat(500));
  });

  it('dead-letters at the max attempt count and never re-picks the row', async () => {
    const rows = [syncRow({ attempts: 4 })]; // one more failure hits maxAttempts = 5
    const world = makeWorld({
      rows,
      createImpl: () => Promise.reject(new Error('still down')),
    });

    await runNotionBatch(world.client, env(), deps(world));
    expect(world.syncUpdates[0]?.data.status).toBe('dead');

    // A second tick must not re-pick a dead row (findMany filters to pending|failed).
    const createCallsAfterFirst = (world.notion.pages.create as ReturnType<typeof vi.fn>).mock.calls
      .length;
    await runNotionBatch(world.client, env(), deps(world));
    expect((world.notion.pages.create as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      createCallsAfterFirst,
    );
  });

  it('one bad row does not abort the rest of the batch', async () => {
    const rows = [
      syncRow({ id: 1, sourceId: 100, createdAt: new Date(NOW.getTime() + 1) }),
      syncRow({ id: 2, sourceId: 100, createdAt: new Date(NOW.getTime() + 2) }),
    ];
    let call = 0;
    const world = makeWorld({
      rows,
      createImpl: () => {
        call += 1;
        return call === 1 ? Promise.reject(new Error('flaky')) : Promise.resolve({ id: 'page-ok' });
      },
    });

    await runNotionBatch(world.client, env(), deps(world));

    const byId = new Map(world.syncUpdates.map((u) => [u.where.id, u.data]));
    expect(byId.get(1)?.status).toBe('failed'); // first row failed
    expect(byId.get(2)?.status).toBe('done'); // second row still processed
  });
});

describe('runNotionBatch — config skip', () => {
  it.each([
    ['no config row', null],
    ['disabled config', envConfig({ enabled: false })],
    ['oauth config', envConfig({ authType: 'oauth' })],
  ])('skips the row with no Notion call: %s', async (_label, config) => {
    const world = makeWorld({ rows: [syncRow()], config });

    await runNotionBatch(world.client, env(), deps(world));

    expect(world.creates).toHaveLength(0);
    expect(world.updates).toHaveLength(0);
    expect(world.syncUpdates).toHaveLength(0); // not marked dead by a skip alone
  });
});

describe('runNotionBatch — graceful shutdown', () => {
  it('stops after the in-flight row; the rest of the batch stays pending (invariant #7)', async () => {
    const rows = [
      syncRow({ id: 1, sourceId: 100, createdAt: new Date(NOW.getTime() + 1) }),
      syncRow({ id: 2, sourceId: 100, createdAt: new Date(NOW.getTime() + 2) }),
    ];
    const world = makeWorld({ rows });

    // Request stop as soon as the first row has been mirrored — mid-batch shutdown.
    await runNotionBatch(world.client, env(), deps(world), () => world.creates.length >= 1);

    expect(world.creates).toHaveLength(1); // only the in-flight row hit Notion
    const byId = new Map(world.syncUpdates.map((u) => [u.where.id, u.data]));
    expect(byId.get(1)?.status).toBe('done'); // in-flight row finished cleanly
    expect(byId.has(2)).toBe(false); // second row was never touched
    expect(rows[1]?.status).toBe('pending'); // ...and stays pending for the next boot
  });
});

describe('computeBackoffMs', () => {
  it('is exponential in attempts and adds bounded jitter', () => {
    expect(computeBackoffMs(1, () => 0)).toBe(2000); // 1000·2^1
    expect(computeBackoffMs(2, () => 0)).toBe(4000); // 1000·2^2
    expect(computeBackoffMs(1, () => 0.5)).toBe(2500); // + jitter 0.5·1000
  });
});

describe('startNotionWorker', () => {
  it('polls on an interval and stop() halts further ticks', async () => {
    vi.useFakeTimers();
    const world = makeWorld({ rows: [] });
    const worker = startNotionWorker(world.client, env(), { ...deps(world), intervalMs: 1000 });

    await vi.advanceTimersByTimeAsync(1000);
    const callsAfterOneTick = (world.client.notionSync.findMany as ReturnType<typeof vi.fn>).mock
      .calls.length;
    expect(callsAfterOneTick).toBeGreaterThanOrEqual(1);

    await worker.stop();
    await vi.advanceTimersByTimeAsync(3000);
    expect((world.client.notionSync.findMany as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      callsAfterOneTick,
    );
    vi.useRealTimers();
  });
});
