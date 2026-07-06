import type {
  InboxProvider,
  ProviderInboxMessageSummary,
} from "../../server/providers/inbox-provider.server.ts";
import { InMemoryFixedWindowRateLimiter } from "../../server/api/rate-limit.server.ts";
import { InMemoryOperationLockManager } from "../../server/api/operation-lock.server.ts";
import { RepositoryBackedActiveInboxLimiter } from "../../server/api/active-inbox-limit.server.ts";
import { createPublicApiHandlers } from "../../server/api/handlers.server.ts";
import type { PublicApiDependencies } from "../../server/api/handlers.server.ts";
import type { PublicApiConfig } from "../../server/api/config.server.ts";
import { createEmptyProviderState } from "../../server/providers/emailnator/provider.server.ts";
import { emailnatorProviderStateSchema } from "../../server/providers/emailnator/schemas.server.ts";
import { createEncryptionService } from "../../server/session/encryption.server.ts";
import { InMemorySessionRepository } from "../../server/session/in-memory-session-repository.server.ts";
import { AnonymousSessionService } from "../../server/session/service.server.ts";
import { createVisitorHashService } from "../../server/session/visitor-hash.server.ts";
import {
  MutableClock,
  TEST_SESSION_ENCRYPTION_KEY,
  TEST_VISITOR_HASH_KEY,
  createDeterministicRandomBytes,
} from "../phase1/test-helpers.ts";

export interface ProviderController {
  calls: {
    createInbox: number;
    listMessages: number;
    getMessageDetail: number;
  };
  signals: {
    createInbox?: AbortSignal;
    listMessages?: AbortSignal;
    getMessageDetail?: AbortSignal;
  };
}

function createProviderState(address = "shadow.panel.001@gmail.com") {
  return emailnatorProviderStateSchema.parse({
    ...createEmptyProviderState(),
    address,
  });
}

function createMessage(id: string, subject = "Verification code"): ProviderInboxMessageSummary {
  return {
    providerMessageId: id,
    from: "Verification Robot",
    subject,
    time: "2026-07-06 12:00",
  };
}

export function createDefaultConfig(overrides?: Partial<PublicApiConfig>): PublicApiConfig {
  return {
    providerEnabled: true,
    requestTimeoutMs: 12_000,
    maxActiveInboxesPerVisitor: 3,
    createLimitPerVisitor: 5,
    createLimitPerIp: 20,
    createWindowMs: 3_600_000,
    readLimitPerCapability: 60,
    readWindowMs: 60_000,
    operationLockTtlMs: 15_000,
    activeInboxReservationTtlMs: 15_000,
    visitorCookieName: "esp_anon_v1",
    visitorCookieMaxAgeSeconds: 2_592_000,
    secureVisitorCookie: false,
    ...overrides,
  };
}

export function createApiHarness(options?: {
  clock?: MutableClock;
  config?: Partial<PublicApiConfig>;
  provider?: InboxProvider<ReturnType<typeof createProviderState>>;
  repository?: InMemorySessionRepository;
  loggerEvents?: Array<Record<string, unknown>>;
}) {
  const clock = options?.clock ?? new MutableClock();
  const repository = options?.repository ?? new InMemorySessionRepository({ clock });
  const providerController: ProviderController = {
    calls: {
      createInbox: 0,
      listMessages: 0,
      getMessageDetail: 0,
    },
    signals: {},
  };
  const loggerEvents = options?.loggerEvents ?? [];
  const provider =
    options?.provider ??
    ({
      providerId: "emailnator",
      async createInbox(input) {
        providerController.calls.createInbox += 1;
        providerController.signals.createInbox = input?.signal;
        return {
          address: "shadow.panel.001@gmail.com",
          providerState: createProviderState(),
        };
      },
      async listMessages({ signal }) {
        providerController.calls.listMessages += 1;
        providerController.signals.listMessages = signal;
        const messages = [createMessage("provider-msg-001")];
        return {
          messages,
          providerState: createProviderState(),
        };
      },
      async getMessageDetail({ signal }) {
        providerController.calls.getMessageDetail += 1;
        providerController.signals.getMessageDetail = signal;
        return {
          detail: {
            contentType: "text/plain",
            bodyLength: 19,
            text: "Your code is 482731",
            textPreview: "Your code is 482731",
            markerFound: true,
          },
          providerState: createProviderState(),
        };
      },
    } satisfies InboxProvider<ReturnType<typeof createProviderState>>);

  const visitorHashService = createVisitorHashService({ key: TEST_VISITOR_HASH_KEY });
  const rateLimiter = new InMemoryFixedWindowRateLimiter({ clock });
  const operationLockManager = new InMemoryOperationLockManager({
    clock,
    randomBytesImpl: createDeterministicRandomBytes(200),
  });
  const dependencies: PublicApiDependencies = {
    config: createDefaultConfig(options?.config),
    clock,
    logger: {
      log(event) {
        loggerEvents.push(event as unknown as Record<string, unknown>);
      },
    },
    sessionService: new AnonymousSessionService({
      provider,
      repository,
      encryption: createEncryptionService({
        key: TEST_SESSION_ENCRYPTION_KEY,
        randomBytesImpl: createDeterministicRandomBytes(100),
      }),
      visitorHashService,
      sessionTtlMs: 15 * 60 * 1000,
      clock,
      randomBytesImpl: createDeterministicRandomBytes(1),
    }),
    visitorHashService,
    rateLimiter,
    activeInboxLimiter: new RepositoryBackedActiveInboxLimiter({
      repository,
      randomBytesImpl: createDeterministicRandomBytes(50),
    }),
    operationLockManager,
  };
  let requestCounter = 0;
  const handlers = createPublicApiHandlers(() => dependencies, {
    requestIdGenerator: () => `req_test${String(++requestCounter).padStart(8, "0")}`,
  });

  return {
    clock,
    repository,
    dependencies,
    handlers,
    loggerEvents,
    providerController,
    rateLimiter,
    operationLockManager,
  };
}

export async function readJson(response: Response): Promise<unknown> {
  return JSON.parse(await response.text());
}

export function createRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}
