import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../src/config/env.js';
import { resolveNotionTarget } from '../../src/notion/resolve.js';
import type { NotionClientFactory, NotionPageApi, ResolveClient } from '../../src/notion/types.js';

// The single per-user credential seam (US-10, §9) a future OAuth extends. Load-bearing: the `env`
// branch builds a client from the env var the config NAMES (never a stored secret — invariant #9)
// and returns the four DB ids; absent / disabled / `oauth` all resolve to a benign `null` skip.

const SECRET = 'secret-notion-token';

const fullEnv = (over: Partial<Env> = {}): Env =>
  ({ NOTION_TOKEN: SECRET, ...over }) as unknown as Env;

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

const makeClient = (config: unknown): ResolveClient =>
  ({ notionConfig: { findUnique: vi.fn().mockResolvedValue(config) } }) as unknown as ResolveClient;

const factory = (): { make: NotionClientFactory; tokens: string[] } => {
  const tokens: string[] = [];
  const make: NotionClientFactory = (token) => {
    tokens.push(token);
    return { pages: {} } as unknown as NotionPageApi;
  };
  return { make, tokens };
};

describe('resolveNotionTarget', () => {
  it('env branch → a client from the env token + the four DB ids (token never from the DB)', async () => {
    const client = makeClient(envConfig());
    const { make, tokens } = factory();

    const target = await resolveNotionTarget(client, fullEnv(), 7, make);

    expect(tokens).toEqual([SECRET]); // built from the env value the config named
    expect(target?.dbIds).toEqual({
      foodLog: 'db-foodlog',
      fooddb: 'db-fooddb',
      metrics: 'db-metrics',
      reviews: 'db-reviews',
    });
  });

  it('returns null when no config row exists', async () => {
    const target = await resolveNotionTarget(makeClient(null), fullEnv(), 7, factory().make);
    expect(target).toBeNull();
  });

  it('returns null when the config is disabled', async () => {
    const target = await resolveNotionTarget(
      makeClient(envConfig({ enabled: false })),
      fullEnv(),
      7,
      factory().make,
    );
    expect(target).toBeNull();
  });

  it('returns null for the unimplemented oauth branch (declared, skipped in v1)', async () => {
    const { make, tokens } = factory();

    const target = await resolveNotionTarget(
      makeClient(envConfig({ authType: 'oauth' })),
      fullEnv(),
      7,
      make,
    );

    expect(target).toBeNull();
    expect(tokens).toHaveLength(0); // no client built
  });

  it('returns null when credential_ref is not NOTION_TOKEN (v1 only sources that env var)', async () => {
    const { make, tokens } = factory();

    const target = await resolveNotionTarget(
      makeClient(envConfig({ credentialRef: 'SOME_OTHER_REF' })),
      fullEnv(),
      7,
      make,
    );

    expect(target).toBeNull();
    expect(tokens).toHaveLength(0); // no client built for an unknown ref
  });

  it('returns null when the named env token is absent', async () => {
    const target = await resolveNotionTarget(
      makeClient(envConfig()),
      fullEnv({ NOTION_TOKEN: undefined }),
      7,
      factory().make,
    );
    expect(target).toBeNull();
  });
});
