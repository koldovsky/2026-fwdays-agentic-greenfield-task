import type {
  BodyMetric,
  FoodDatabase,
  FoodLog,
  NotionSourceTable,
  PrismaClient,
  Review,
} from '@prisma/client';

// Notion mirror domain shapes (US-10, §9). The mirror is async + best-effort: Postgres is truth and
// Notion is a write-only downstream (invariant #1). Enum values stay English structural literals
// (invariant #6). Clients are narrow structural `Pick`s over Prisma so tests pass cast fakes
// (backend-conventions rule 6); the Notion SDK is fronted by the minimal {@link NotionPageApi} seam
// so the worker is unit-testable without a real token.

/** A single mirror job: which source row to mirror, and for which tenant (invariant #8). */
export interface EnqueueJob {
  sourceTable: NotionSourceTable;
  sourceId: number;
  userId: number;
}

/**
 * The enqueue seam injected into the writing services. Best-effort by contract: {@link
 * NotionOutbox.enqueue} never throws — a failure is swallowed + logged so it can never break the
 * user reply (the data is already safe in Postgres, invariant #1).
 */
export interface NotionOutbox {
  enqueue: (job: EnqueueJob) => Promise<void>;
}

/** Narrow Prisma surface the outbox writes through (append a row + lazily seed owner config). */
export type OutboxClient = Pick<PrismaClient, 'notionSync' | 'notionConfig'>;

/** Narrow Prisma surface the credential resolver reads. */
export type ResolveClient = Pick<PrismaClient, 'notionConfig'>;

/**
 * Narrow Prisma surface the worker touches: the outbox itself + config, plus read-only access to the
 * four mirrored source tables (to map a row → Notion properties). Notion is never read back
 * (invariant #1) — the source of truth is always these Postgres rows.
 */
export type WorkerClient = Pick<
  PrismaClient,
  'notionSync' | 'notionConfig' | 'foodLog' | 'foodDatabase' | 'bodyMetric' | 'review'
>;

/** The Notion page `properties` payload for one row — shape validated at deploy (see mapper.ts). */
export type NotionProperties = Record<string, unknown>;

/**
 * The minimal Notion page API the worker needs — the real `@notionhq/client` `Client` satisfies it
 * structurally (cast at the resolve seam). Fronting the SDK here keeps the worker testable with a
 * fake and shields the rest of the code from the SDK's wide return unions.
 */
export interface NotionPageApi {
  pages: {
    create: (args: {
      parent: { database_id: string };
      properties: NotionProperties;
    }) => Promise<{ id: string }>;
    update: (args: { page_id: string; properties: NotionProperties }) => Promise<unknown>;
  };
}

/** Builds a Notion client from a raw token (the `env`-auth branch); injectable for tests. */
export type NotionClientFactory = (token: string) => NotionPageApi;

/** The four Notion database ids a mirror write targets, one per mirrored source table. */
export interface NotionDbIds {
  foodLog: string;
  fooddb: string;
  metrics: string;
  reviews: string;
}

/** A resolved mirror destination for one user: an authenticated client + their four DB ids. */
export interface NotionTarget {
  notion: NotionPageApi;
  dbIds: NotionDbIds;
}

/** A source row of any mirrored table, tagged by table — the worker maps one to Notion properties. */
export type SourceRow =
  | { sourceTable: 'food_log'; row: FoodLog }
  | { sourceTable: 'food_database'; row: FoodDatabase }
  | { sourceTable: 'body_metrics'; row: BodyMetric }
  | { sourceTable: 'review'; row: Review };
