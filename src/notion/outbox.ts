import type { Env } from '../config/env.js';
import { errorMessage } from '../util/error.js';
import type { EnqueueJob, NotionOutbox, OutboxClient } from './types.js';

// Post-write enqueue seam (US-10, §9). Each mirrored Postgres write appends a `pending` `notion_sync`
// row through here (best-effort, non-transactional — design decision). The whole enqueue is wrapped
// so ANY failure is warn-logged and never propagates to the user reply: the data is already safe in
// Postgres (invariant #1). The owner's `notion_config` is seeded lazily on first enqueue so the
// worker can resolve a target without a separate onboarding step (single-user ⇒ the writer is the
// owner). `credential_ref` stores the env var NAME, never the secret (invariant #9).

const CREDENTIAL_ENV_VAR = 'NOTION_TOKEN';

interface OwnerEnvConfig {
  credentialRef: string;
  dbFoodlogId: string;
  dbReviewsId: string;
  dbMetricsId: string;
  dbFooddbId: string;
}

/** The owner's `env`-auth config from the environment — or `null` when any `NOTION_*` var is unset. */
const ownerEnvConfig = (env: Env): OwnerEnvConfig | null => {
  if (
    !env.NOTION_TOKEN ||
    !env.NOTION_DB_FOODLOG_ID ||
    !env.NOTION_DB_REVIEWS_ID ||
    !env.NOTION_DB_METRICS_ID ||
    !env.NOTION_DB_FOODDB_ID
  ) {
    return null;
  }

  return {
    credentialRef: CREDENTIAL_ENV_VAR,
    dbFoodlogId: env.NOTION_DB_FOODLOG_ID,
    dbReviewsId: env.NOTION_DB_REVIEWS_ID,
    dbMetricsId: env.NOTION_DB_METRICS_ID,
    dbFooddbId: env.NOTION_DB_FOODDB_ID,
  };
};

/**
 * Seed the owner's `env` config once (idempotent): `upsert` with an empty `update` creates the row on
 * first enqueue and NEVER overwrites an existing one (so a later `enabled = false` sticks). Only the
 * env var NAME is stored (invariant #9). No-op when the environment lacks a full `NOTION_*` set.
 */
const seedOwnerConfig = async (client: OutboxClient, env: Env, userId: number): Promise<void> => {
  const config = ownerEnvConfig(env);
  if (!config) {
    return;
  }

  await client.notionConfig.upsert({
    where: { userId },
    create: { userId, authType: 'env', enabled: true, ...config },
    update: {},
  });
};

/** The real outbox: seed owner config, append a `pending` row; any failure is swallowed + logged. */
export const createNotionOutbox = (client: OutboxClient, env: Env): NotionOutbox => ({
  async enqueue({ sourceTable, sourceId, userId }: EnqueueJob): Promise<void> {
    try {
      await seedOwnerConfig(client, env, userId);
      await client.notionSync.create({
        data: { userId, sourceTable, sourceId, status: 'pending' },
      });
    } catch (error) {
      // Best-effort: the reply must not break on a mirror-bookkeeping failure (invariant #1). Message
      // only — never the row's raw values (invariant #9).
      console.warn(`notion enqueue failed (${sourceTable} #${sourceId}): ${errorMessage(error)}`);
    }
  },
});

/**
 * Warn once at startup when `NOTION_TOKEN` is set but the four `NOTION_DB_*` ids are incomplete: the
 * outbox + worker run, yet every row skips forever (owner config never seeds). No raw values logged
 * (invariant #9). No-op when the token is unset (mirror off) or the config is complete.
 */
export const warnIfIncompleteNotionConfig = (env: Env): void => {
  if (env.NOTION_TOKEN && !ownerEnvConfig(env)) {
    console.warn(
      'NOTION_TOKEN is set but one or more NOTION_DB_* ids are missing — the Notion mirror will skip every row until all four are configured.',
    );
  }
};

/** Mirror-off no-op with the same interface (bot booted without `NOTION_TOKEN`): enqueue does nothing. */
export const noopOutbox: NotionOutbox = {
  enqueue(): Promise<void> {
    return Promise.resolve();
  },
};
