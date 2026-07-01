import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../src/config/env.js';
import {
  createNotionOutbox,
  noopOutbox,
  warnIfIncompleteNotionConfig,
} from '../../src/notion/outbox.js';
import type { OutboxClient } from '../../src/notion/types.js';

// The post-write enqueue seam (US-10, §9). Load-bearing: every enqueue writes a `pending` row
// carrying the tenant `user_id` (invariant #8); the owner's config is seeded lazily with the env var
// NAME — never the secret (invariant #9); a failing enqueue is swallowed + logged so it can NEVER
// break the reply (invariant #1); and `noopOutbox` (mirror off) writes nothing.

const SECRET = 'secret-notion-token';

const fullEnv = (over: Partial<Env> = {}): Env =>
  ({
    NOTION_TOKEN: SECRET,
    NOTION_DB_FOODLOG_ID: 'db-foodlog',
    NOTION_DB_REVIEWS_ID: 'db-reviews',
    NOTION_DB_METRICS_ID: 'db-metrics',
    NOTION_DB_FOODDB_ID: 'db-fooddb',
    ...over,
  }) as unknown as Env;

interface Capture {
  syncCreates: { data: Record<string, unknown> }[];
  configUpserts: { where: Record<string, unknown>; create: Record<string, unknown> }[];
}

const makeClient = (createThrows = false): { client: OutboxClient; capture: Capture } => {
  const capture: Capture = { syncCreates: [], configUpserts: [] };
  const client = {
    notionSync: {
      create: vi.fn((args: { data: Record<string, unknown> }) => {
        if (createThrows) {
          return Promise.reject(new Error('transient db error'));
        }
        capture.syncCreates.push(args);
        return Promise.resolve({ id: 1, ...args.data });
      }),
    },
    notionConfig: {
      upsert: vi.fn((args: { where: Record<string, unknown>; create: Record<string, unknown> }) => {
        capture.configUpserts.push(args);
        return Promise.resolve({ id: 1 });
      }),
    },
  } as unknown as OutboxClient;

  return { client, capture };
};

describe('createNotionOutbox.enqueue', () => {
  it('writes a pending row with the tenant user_id + source key (invariant #8)', async () => {
    const { client, capture } = makeClient();

    await createNotionOutbox(client, fullEnv()).enqueue({
      sourceTable: 'food_log',
      sourceId: 42,
      userId: 7,
    });

    expect(capture.syncCreates).toHaveLength(1);
    expect(capture.syncCreates[0]?.data).toEqual({
      userId: 7,
      sourceTable: 'food_log',
      sourceId: 42,
      status: 'pending',
    });
  });

  it('seeds the owner config with the env var NAME, never the token (invariant #9)', async () => {
    const { client, capture } = makeClient();

    await createNotionOutbox(client, fullEnv()).enqueue({
      sourceTable: 'body_metrics',
      sourceId: 3,
      userId: 7,
    });

    expect(capture.configUpserts).toHaveLength(1);
    const upsert = capture.configUpserts[0];
    expect(upsert?.where).toEqual({ userId: 7 });
    expect(upsert?.create.authType).toBe('env');
    expect(upsert?.create.credentialRef).toBe('NOTION_TOKEN'); // the NAME, not the secret
    expect(upsert?.create.dbFoodlogId).toBe('db-foodlog');
    // The raw token is NEVER persisted to any config column.
    expect(Object.values(upsert?.create ?? {})).not.toContain(SECRET);
  });

  it('idempotently seeds (upsert, not insert) so repeat enqueues never duplicate the config', async () => {
    const { client, capture } = makeClient();
    const outbox = createNotionOutbox(client, fullEnv());

    await outbox.enqueue({ sourceTable: 'food_log', sourceId: 1, userId: 7 });
    await outbox.enqueue({ sourceTable: 'food_log', sourceId: 2, userId: 7 });

    // Both seed calls are upserts (idempotent, empty update) — the DB keeps exactly one config row.
    expect(capture.configUpserts).toHaveLength(2);
    expect(capture.configUpserts.every((u) => u.where.userId === 7)).toBe(true);
  });

  it('swallows + logs a failing enqueue so the reply is never broken (invariant #1)', async () => {
    const { client } = makeClient(true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(
      createNotionOutbox(client, fullEnv()).enqueue({
        sourceTable: 'body_metrics',
        sourceId: 9,
        userId: 7,
      }),
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('still enqueues but skips seeding when the NOTION_* env is incomplete', async () => {
    const { client, capture } = makeClient();

    await createNotionOutbox(client, fullEnv({ NOTION_DB_FOODDB_ID: undefined })).enqueue({
      sourceTable: 'review',
      sourceId: 5,
      userId: 7,
    });

    expect(capture.syncCreates).toHaveLength(1); // the row is still recorded
    expect(capture.configUpserts).toHaveLength(0); // but no partial config is seeded
  });
});

describe('warnIfIncompleteNotionConfig', () => {
  it('warns (no raw values) when the token is set but a DB id is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    warnIfIncompleteNotionConfig(fullEnv({ NOTION_DB_FOODDB_ID: undefined }));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).not.toContain(SECRET); // never echo the token
    warn.mockRestore();
  });

  it('stays silent when the config is complete', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    warnIfIncompleteNotionConfig(fullEnv());

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('stays silent when the mirror is off (no token)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    warnIfIncompleteNotionConfig(fullEnv({ NOTION_TOKEN: undefined }));

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('noopOutbox', () => {
  it('writes nothing and resolves (mirror off)', async () => {
    await expect(
      noopOutbox.enqueue({ sourceTable: 'food_log', sourceId: 1, userId: 1 }),
    ).resolves.toBeUndefined();
  });
});
