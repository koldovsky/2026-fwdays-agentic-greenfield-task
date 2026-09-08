import { createEmailnatorInboxProvider } from "../providers/emailnator/inbox-provider.server.ts";
import { systemClock } from "../session/clock.server.ts";
import {
  loadSessionCoreConfig,
  loadUpstashSessionRepositoryConfig,
} from "../session/config.server.ts";
import { createEncryptionService } from "../session/encryption.server.ts";
import { AnonymousSessionService } from "../session/service.server.ts";
import { createUpstashRedisRestClient } from "../session/upstash-redis-client.server.ts";
import { UpstashSessionRepository } from "../session/upstash-session-repository.server.ts";
import { createVisitorHashService } from "../session/visitor-hash.server.ts";
import { RepositoryBackedActiveInboxLimiter } from "./active-inbox-limit.server.ts";
import { loadPublicApiConfig } from "./config.server.ts";
import { noopPublicApiLogger } from "./diagnostics.server.ts";
import type { PublicApiDependencies } from "./handlers.server.ts";
import { UpstashOperationLockManager } from "./operation-lock.server.ts";
import { UpstashFixedWindowRateLimiter } from "./rate-limit.server.ts";

export function createProductionPublicApiDependencies(
  env: Record<string, string | undefined> = process.env,
): PublicApiDependencies {
  const sessionCoreConfig = loadSessionCoreConfig(env);
  const upstashConfig = loadUpstashSessionRepositoryConfig(env);
  const publicApiConfig = loadPublicApiConfig(env);
  const upstashClient = createUpstashRedisRestClient({
    url: upstashConfig.url,
    token: upstashConfig.token,
  });
  const repository = new UpstashSessionRepository({
    client: upstashClient,
    namespace: upstashConfig.namespace,
    clock: systemClock,
  });
  const visitorHashService = createVisitorHashService({
    key: sessionCoreConfig.visitorHashKey,
  });

  return {
    config: publicApiConfig,
    clock: systemClock,
    logger: noopPublicApiLogger,
    sessionService: new AnonymousSessionService({
      provider: createEmailnatorInboxProvider(),
      repository,
      encryption: createEncryptionService({
        key: sessionCoreConfig.sessionEncryptionKey,
      }),
      visitorHashService,
      sessionTtlMs: sessionCoreConfig.sessionTtlMs,
      clock: systemClock,
    }),
    visitorHashService,
    rateLimiter: new UpstashFixedWindowRateLimiter({
      client: upstashClient,
      namespace: upstashConfig.namespace,
    }),
    activeInboxLimiter: new RepositoryBackedActiveInboxLimiter({
      repository,
    }),
    operationLockManager: new UpstashOperationLockManager({
      client: upstashClient,
      namespace: upstashConfig.namespace,
    }),
  };
}
