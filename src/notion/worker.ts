import { Client } from '@notionhq/client';
import type { NotionSourceTable, NotionSync } from '@prisma/client';
import type { Env } from '../config/env.js';
import { tenantWhere } from '../db/tenancy.js';
import { systemNow } from '../util/date.js';
import { errorMessage } from '../util/error.js';
import { mapSourceRow } from './mapper.js';
import { resolveNotionTarget } from './resolve.js';
import type {
  NotionClientFactory,
  NotionDbIds,
  NotionPageApi,
  NotionProperties,
  NotionTarget,
  SourceRow,
  WorkerClient,
} from './types.js';

// In-process poll worker (US-10, §9; invariant #7 — one lightweight in-process poller, no second
// process, no LISTEN/NOTIFY; mirrors the review-scheduler precedent). A `setInterval` tick fetches a
// bounded batch of due rows in ONE query (no N+1) and processes them sequentially, throttled to
// ~3 Notion req/s. Per row: resolve the user's target → map the source row → create (or update, when
// a prior `done` row already has a `notion_page_id` for this `(source_table, source_id)`) → mark
// `done`. On error: `attempts++`, `failed` + backoff, or `dead` at the cap. Notion is write-only
// downstream — nothing is ever read back (invariant #1); `last_error` carries a message only
// (invariant #9). One row's failure never aborts the batch.

const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_THROTTLE_MS = 334; // ~3 requests/second
const DEFAULT_MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1_000;
const CAP_BACKOFF_MS = 60 * 60 * 1_000; // 1h ceiling
const MAX_LAST_ERROR_LEN = 500; // bound the stored error string (invariant #9 residual-leak guard)

export interface NotionWorker {
  stop: () => Promise<void>;
}

export interface WorkerDeps {
  now?: () => Date;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  clientFactory?: NotionClientFactory;
  intervalMs?: number;
  batchSize?: number;
  throttleMs?: number;
  maxAttempts?: number;
}

interface WorkerConfig {
  now: () => Date;
  random: () => number;
  sleep: (ms: number) => Promise<void>;
  makeClient: NotionClientFactory;
  batchSize: number;
  throttleMs: number;
  maxAttempts: number;
}

const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const defaultClientFactory: NotionClientFactory = (token) =>
  new Client({ auth: token }) as unknown as NotionPageApi;

const resolveConfig = (deps: WorkerDeps): WorkerConfig => ({
  now: deps.now ?? systemNow,
  random: deps.random ?? Math.random,
  sleep: deps.sleep ?? realSleep,
  makeClient: deps.clientFactory ?? defaultClientFactory,
  batchSize: deps.batchSize ?? DEFAULT_BATCH_SIZE,
  throttleMs: deps.throttleMs ?? DEFAULT_THROTTLE_MS,
  maxAttempts: deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
});

/** Exponential backoff with jitter: `min(base·2^attempts, cap) + random·base` (design D-worker). */
export const computeBackoffMs = (attempts: number, random: () => number): number => {
  const exponential = Math.min(BASE_BACKOFF_MS * 2 ** attempts, CAP_BACKOFF_MS);
  return exponential + Math.floor(random() * BASE_BACKOFF_MS);
};

const databaseIdFor = (sourceTable: NotionSourceTable, dbIds: NotionDbIds): string => {
  switch (sourceTable) {
    case 'food_log':
      return dbIds.foodLog;
    case 'food_database':
      return dbIds.fooddb;
    case 'body_metrics':
      return dbIds.metrics;
    case 'review':
      return dbIds.reviews;
  }
};

/** Load the tenant-scoped source row for a mirror job (invariant #8), or `null` if it's gone. */
const loadSourceRow = async (
  client: WorkerClient,
  sourceTable: NotionSourceTable,
  sourceId: number,
  userId: number,
): Promise<SourceRow | null> => {
  const where = tenantWhere(userId, { id: sourceId });
  switch (sourceTable) {
    case 'food_log': {
      const row = await client.foodLog.findFirst({ where });
      return row ? { sourceTable, row } : null;
    }
    case 'food_database': {
      const row = await client.foodDatabase.findFirst({ where });
      return row ? { sourceTable, row } : null;
    }
    case 'body_metrics': {
      const row = await client.bodyMetric.findFirst({ where });
      return row ? { sourceTable, row } : null;
    }
    case 'review': {
      const row = await client.review.findFirst({ where });
      return row ? { sourceTable, row } : null;
    }
  }
};

/** The `notion_page_id` of any prior `done` mirror of the same source (idempotency key), else `null`. */
const existingPageId = async (
  client: WorkerClient,
  sourceTable: NotionSourceTable,
  sourceId: number,
): Promise<string | null> => {
  const prior = await client.notionSync.findFirst({
    where: { sourceTable, sourceId, status: 'done', notionPageId: { not: null } },
    orderBy: { id: 'desc' },
    select: { notionPageId: true },
  });
  return prior?.notionPageId ?? null;
};

const writePage = async (
  notion: NotionPageApi,
  databaseId: string,
  pageId: string | null,
  properties: NotionProperties,
): Promise<string> => {
  if (pageId) {
    await notion.pages.update({ page_id: pageId, properties });
    return pageId;
  }

  const created = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
  return created.id;
};

const markDone = (client: WorkerClient, id: number, pageId: string | null): Promise<unknown> =>
  client.notionSync.update({
    where: { id },
    data: { status: 'done', notionPageId: pageId, lastError: null },
  });

/** Retry with backoff, or dead-letter at the cap. `last_error` is the message only (invariant #9). */
const markFailure = (
  client: WorkerClient,
  row: NotionSync,
  error: unknown,
  config: WorkerConfig,
): Promise<unknown> => {
  const attempts = row.attempts + 1;
  // Cap the stored message: Notion validation errors can echo property values (e.g. a body weight),
  // so bound the residual leak surface (invariant #9).
  const lastError = errorMessage(error).slice(0, MAX_LAST_ERROR_LEN);
  if (attempts >= config.maxAttempts) {
    return client.notionSync.update({
      where: { id: row.id },
      data: { status: 'dead', attempts, lastError },
    });
  }

  const nextAttemptAt = new Date(
    config.now().getTime() + computeBackoffMs(attempts, config.random),
  );
  return client.notionSync.update({
    where: { id: row.id },
    data: { status: 'failed', attempts, lastError, nextAttemptAt },
  });
};

/** Mirror one row. Never throws — a failure is recorded so the rest of the batch still runs. */
const processRow = async (
  client: WorkerClient,
  env: Env,
  row: NotionSync,
  targets: Map<number, NotionTarget | null>,
  config: WorkerConfig,
): Promise<void> => {
  try {
    if (!targets.has(row.userId)) {
      targets.set(
        row.userId,
        await resolveNotionTarget(client, env, row.userId, config.makeClient),
      );
    }
    const target = targets.get(row.userId) ?? null;
    if (!target) {
      return; // absent / disabled / oauth config → skip, not dead (spec)
    }

    const source = await loadSourceRow(client, row.sourceTable, row.sourceId, row.userId);
    if (!source) {
      await markDone(client, row.id, row.notionPageId); // source gone → nothing to mirror
      return;
    }

    const properties = mapSourceRow(source);
    const databaseId = databaseIdFor(row.sourceTable, target.dbIds);
    const priorPageId =
      row.notionPageId ?? (await existingPageId(client, row.sourceTable, row.sourceId));

    await config.sleep(config.throttleMs); // throttle each Notion request to ~3 req/s
    const pageId = await writePage(target.notion, databaseId, priorPageId, properties);

    await markDone(client, row.id, pageId);
  } catch (error) {
    await markFailure(client, row, error, config);
  }
};

/**
 * One poll pass: fetch a bounded batch of due rows (single query) and mirror them sequentially.
 * `shouldStop` is polled after each row so a shutdown finishes the in-flight row then stops, leaving
 * the rest of the batch `pending` for the next boot (invariant #7 — no long drain past SIGTERM grace).
 */
export const runNotionBatch = async (
  client: WorkerClient,
  env: Env,
  deps: WorkerDeps = {},
  shouldStop: () => boolean = () => false,
): Promise<void> => {
  const config = resolveConfig(deps);
  const rows = await client.notionSync.findMany({
    where: {
      status: { in: ['pending', 'failed'] },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: config.now() } }],
    },
    orderBy: { createdAt: 'asc' },
    take: config.batchSize,
  });

  const targets = new Map<number, NotionTarget | null>();
  for (const row of rows) {
    await processRow(client, env, row, targets, config);
    if (shouldStop()) {
      break; // shutdown requested — the in-flight row finished; leave the rest pending
    }
  }
};

/**
 * Start the in-process mirror poller. Ticks are non-overlapping (a slow batch is never re-entered)
 * and started only by the caller when `NOTION_TOKEN` is set. `stop()` halts polling and awaits the
 * in-flight batch so the current row finishes cleanly on shutdown (invariant #7).
 */
export const startNotionWorker = (
  client: WorkerClient,
  env: Env,
  deps: WorkerDeps = {},
): NotionWorker => {
  const intervalMs = deps.intervalMs ?? DEFAULT_INTERVAL_MS;
  let inFlight: Promise<void> = Promise.resolve();
  let running = false;
  let stopped = false;

  const tick = (): void => {
    if (running || stopped) {
      return;
    }
    running = true;
    inFlight = runNotionBatch(client, env, deps, () => stopped)
      .catch((error: unknown) => console.warn(`notion worker batch failed: ${errorMessage(error)}`))
      .finally(() => {
        running = false;
      });
  };

  const timer = setInterval(tick, intervalMs);

  return {
    async stop(): Promise<void> {
      stopped = true;
      clearInterval(timer);
      await inFlight;
    },
  };
};
