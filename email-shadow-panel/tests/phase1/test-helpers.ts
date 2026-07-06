import {
  applyResponseCookies,
  createEmptyCookieJar,
  serializeCookieJar,
} from "../../server/providers/emailnator/cookies.server.ts";
import { createEmptyProviderState } from "../../server/providers/emailnator/provider.server.ts";
import { emailnatorProviderStateSchema } from "../../server/providers/emailnator/schemas.server.ts";
import {
  anonymousSessionStateSchema,
  persistedAnonymousSessionSchema,
  type AnonymousSessionState,
  type PersistedAnonymousSession,
} from "../../server/session/contracts.server.ts";
import type { Clock } from "../../server/session/clock.server.ts";
import { createEncryptionService } from "../../server/session/encryption.server.ts";
import { createVisitorHashService } from "../../server/session/visitor-hash.server.ts";

export const TEST_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64url");
export const TEST_VISITOR_HASH_KEY = Buffer.alloc(32, 11).toString("base64url");

export class MutableClock implements Clock {
  private currentMs: number;

  constructor(initialIso = "2026-07-06T12:00:00.000Z") {
    this.currentMs = new Date(initialIso).getTime();
  }

  now(): Date {
    return new Date(this.currentMs);
  }

  advanceMs(ms: number): void {
    this.currentMs += ms;
  }

  set(iso: string): void {
    this.currentMs = new Date(iso).getTime();
  }
}

export function createDeterministicRandomBytes(seed = 1): (size: number) => Uint8Array {
  let counter = seed;
  return (size) => {
    const bytes = Buffer.alloc(size);
    for (let index = 0; index < size; index += 1) {
      bytes[index] = counter % 256;
      counter += 1;
    }
    return bytes;
  };
}

export function createTestEncryptionService(randomBytesImpl = createDeterministicRandomBytes()) {
  return createEncryptionService({
    key: TEST_SESSION_ENCRYPTION_KEY,
    randomBytesImpl,
  });
}

export function createTestVisitorHashService() {
  return createVisitorHashService({
    key: TEST_VISITOR_HASH_KEY,
  });
}

export function createProviderState(address = "shadow.panel.001@gmail.com") {
  return emailnatorProviderStateSchema.parse({
    ...createEmptyProviderState(),
    address,
  });
}

export async function createProviderStateWithCookies(address = "shadow.panel.001@gmail.com") {
  const jar = createEmptyCookieJar();
  const headers = new Headers();
  headers.append("set-cookie", "XSRF-TOKEN=redacted-xsrf-value; Path=/");
  headers.append("set-cookie", "gmailnator_session=redacted-session-value; Path=/; HttpOnly");
  await applyResponseCookies(jar, headers, "https://www.emailnator.com/");
  return emailnatorProviderStateSchema.parse({
    ...createProviderState(address),
    cookieJar: serializeCookieJar(jar),
    observedCookieNames: ["XSRF-TOKEN", "gmailnator_session"],
  });
}

export function createAnonymousSessionState(
  overrides?: Partial<AnonymousSessionState>,
): AnonymousSessionState {
  return anonymousSessionStateSchema.parse({
    version: 1,
    providerId: "emailnator",
    providerState: createProviderState(),
    messageReferenceState: {
      version: 1,
      maxEntries: 200,
      entries: [],
    },
    ...overrides,
  });
}

export function createPersistedSessionRecord(options?: {
  clock?: MutableClock;
  sessionTtlMs?: number;
  capabilityTokenHash?: string;
  anonymousVisitorHash?: string;
  inboxAddress?: string;
  encryptedSessionState?: string;
  providerStateVersion?: number;
}): PersistedAnonymousSession {
  const clock = options?.clock ?? new MutableClock();
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + (options?.sessionTtlMs ?? 15 * 60 * 1000));
  return persistedAnonymousSessionSchema.parse({
    schemaVersion: 1,
    sessionId: "sess_test_session_001",
    capabilityTokenHash:
      options?.capabilityTokenHash ?? "B5P0xQ6Mby2dLzj9l3pRk5NCL4Qx3dYzVnNBy4vtKqk",
    anonymousVisitorHash:
      options?.anonymousVisitorHash ?? "n7E2zZbfb8xl7TVi7qn2Yl3tMcwMl7v9hD7w9_ha9v8",
    inboxAddress: options?.inboxAddress ?? "shadow.panel.001@gmail.com",
    encryptedSessionState:
      options?.encryptedSessionState ??
      createTestEncryptionService().encrypt(createAnonymousSessionState()),
    providerStateVersion: options?.providerStateVersion ?? 1,
    providerId: "emailnator",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
}

export function responseJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
