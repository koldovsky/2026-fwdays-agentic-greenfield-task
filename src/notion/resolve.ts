import type { Env } from '../config/env.js';
import type { NotionClientFactory, NotionTarget, ResolveClient } from './types.js';

// Per-user credential resolution (US-10, §9) — the SINGLE seam a future OAuth extends. Reads the
// user's `notion_config`; absent / `enabled = false` / `auth_type = "oauth"` all resolve to `null`
// (skip, no crash). For `auth_type = "env"` the client is built from the env var NAMED by
// `credential_ref` (never a stored secret — invariant #9). Notion is write-only downstream: nothing
// is ever read back from it (invariant #1).

/**
 * Resolve one user's Notion destination, or `null` when the mirror should skip this row. `null` is a
 * benign skip (not a failure) — the worker leaves such rows for a later config/OAuth change.
 */
export const resolveNotionTarget = async (
  client: ResolveClient,
  env: Env,
  userId: number,
  makeClient: NotionClientFactory,
): Promise<NotionTarget | null> => {
  const config = await client.notionConfig.findUnique({ where: { userId } });
  if (!config?.enabled) {
    return null;
  }
  if (config.authType !== 'env') {
    return null; // oauth (or any future branch) is declared but unimplemented in v1 → skip
  }
  if (config.credentialRef !== 'NOTION_TOKEN') {
    return null; // v1 sources the token only from NOTION_TOKEN; other refs await the OAuth seam
  }

  const token = env.NOTION_TOKEN; // type-safe: the only v1 credential ref (never a stored secret)
  if (!token) {
    return null;
  }

  return {
    notion: makeClient(token),
    dbIds: {
      foodLog: config.dbFoodlogId,
      fooddb: config.dbFooddbId,
      metrics: config.dbMetricsId,
      reviews: config.dbReviewsId,
    },
  };
};
