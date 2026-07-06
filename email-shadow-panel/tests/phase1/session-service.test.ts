import assert from "node:assert/strict";
import test from "node:test";

import type {
  InboxProvider,
  ProviderInboxMessageSummary,
} from "../../server/providers/inbox-provider.server.ts";
import { createEmptyProviderState } from "../../server/providers/emailnator/provider.server.ts";
import { emailnatorProviderStateSchema } from "../../server/providers/emailnator/schemas.server.ts";
import { AnonymousSessionService } from "../../server/session/service.server.ts";
import { anonymousSessionStateSchema } from "../../server/session/contracts.server.ts";
import { createEncryptionService } from "../../server/session/encryption.server.ts";
import { DomainError } from "../../server/session/errors.server.ts";
import { InMemorySessionRepository } from "../../server/session/in-memory-session-repository.server.ts";
import { createVisitorHashService } from "../../server/session/visitor-hash.server.ts";
import {
  createDeterministicRandomBytes,
  MutableClock,
  TEST_SESSION_ENCRYPTION_KEY,
  TEST_VISITOR_HASH_KEY,
} from "./test-helpers.ts";

function createProviderState(
  address = "shadow.panel.001@gmail.com",
  overrides?: Record<string, unknown>,
) {
  return emailnatorProviderStateSchema.parse({
    ...createEmptyProviderState(),
    address,
    ...overrides,
  });
}

function createMessage(id: string, subject = "Subject"): ProviderInboxMessageSummary {
  return {
    providerMessageId: id,
    from: "Verification Robot",
    subject,
    time: "2026-07-06 12:00",
  };
}

function createServiceHarness(options?: {
  repository?: InMemorySessionRepository;
  provider?: InboxProvider<ReturnType<typeof createProviderState>>;
  clock?: MutableClock;
  sessionTtlMs?: number;
  randomSeed?: number;
}) {
  const clock = options?.clock ?? new MutableClock();
  const repository = options?.repository ?? new InMemorySessionRepository({ clock });
  const encryption = createEncryptionService({
    key: TEST_SESSION_ENCRYPTION_KEY,
    randomBytesImpl: createDeterministicRandomBytes(50),
  });
  const provider =
    options?.provider ??
    ({
      providerId: "emailnator",
      async createInbox() {
        return {
          address: "shadow.panel.001@gmail.com",
          providerState: createProviderState(),
        };
      },
      async listMessages() {
        const messages = [createMessage("provider-id-001", "Phase 1 code")];
        return {
          messages,
          providerState: createProviderState("shadow.panel.001@gmail.com", {
            lastListedMessageIds: messages.map((message) => message.providerMessageId),
            lastUsedAt: clock.now().toISOString(),
          }),
        };
      },
      async getMessageDetail() {
        return {
          detail: {
            contentType: "text/plain",
            bodyLength: 42,
            text: "Your code is 482731",
            textPreview: "Your code is 482731",
            markerFound: true,
          },
          providerState: createProviderState("shadow.panel.001@gmail.com", {
            lastUsedAt: clock.now().toISOString(),
          }),
        };
      },
    } satisfies InboxProvider<ReturnType<typeof createProviderState>>);

  return {
    clock,
    repository,
    encryption,
    service: new AnonymousSessionService({
      provider,
      repository,
      encryption,
      visitorHashService: createVisitorHashService({ key: TEST_VISITOR_HASH_KEY }),
      sessionTtlMs: options?.sessionTtlMs ?? 15 * 60 * 1000,
      clock,
      randomBytesImpl: createDeterministicRandomBytes(options?.randomSeed ?? 1),
    }),
  };
}

test("session creation returns the capability once and persists only hashed or encrypted state", async () => {
  const { service, repository } = createServiceHarness();
  const result = await service.createSession({ visitorIdentifier: "browser-visitor-001" });
  const snapshot = JSON.stringify(repository.debugSnapshot());

  assert.match(result.capabilityToken, /^[A-Za-z0-9_-]{43}$/u);
  assert.equal(result.session.inboxAddress, "shadow.panel.001@gmail.com");
  assert.doesNotMatch(snapshot, new RegExp(result.capabilityToken, "u"));
  assert.doesNotMatch(snapshot, /browser-visitor-001/u);
});

test("listing messages decrypts state, persists refreshed state, and hides provider ids behind safe references", async () => {
  const { service, repository, encryption } = createServiceHarness();
  const created = await service.createSession({ visitorIdentifier: "browser-visitor-002" });

  const listed = await service.listMessages(created.capabilityToken);
  const reference = listed.messages[0]?.reference;
  const snapshot = repository.debugSnapshot();
  const stored = snapshot.sessions[0];
  const decrypted = encryption.decrypt(stored.encryptedSessionState, anonymousSessionStateSchema);

  assert.ok(reference);
  assert.notEqual(reference, "provider-id-001");
  assert.deepEqual(decrypted.providerState.lastListedMessageIds, ["provider-id-001"]);
  assert.equal(decrypted.messageReferenceState.entries.length, 1);
  assert.equal(decrypted.messageReferenceState.entries[0]?.providerMessageId, "provider-id-001");
  assert.doesNotMatch(JSON.stringify(listed), /provider-id-001/u);
});

test("repeated listing reuses message references and bounds mapping growth deterministically", async () => {
  let listCall = 0;
  const clock = new MutableClock();
  const repository = new InMemorySessionRepository({ clock });
  const listA = Array.from({ length: 80 }, (_, index) => createMessage(`provider-a-${index}`));
  const listB = Array.from({ length: 80 }, (_, index) => createMessage(`provider-b-${index}`));
  const listC = Array.from({ length: 80 }, (_, index) => createMessage(`provider-c-${index}`));
  const provider: InboxProvider<ReturnType<typeof createProviderState>> = {
    providerId: "emailnator",
    async createInbox() {
      return {
        address: "shadow.panel.001@gmail.com",
        providerState: createProviderState(),
      };
    },
    async listMessages() {
      const messages = [listA, listA, listB, listC][listCall] ?? listC;
      listCall += 1;
      return {
        messages,
        providerState: createProviderState("shadow.panel.001@gmail.com", {
          lastListedMessageIds: messages.map((message) => message.providerMessageId),
        }),
      };
    },
    async getMessageDetail() {
      throw new Error("not used");
    },
  };
  const { service, encryption } = createServiceHarness({
    clock,
    repository,
    provider,
  });
  const created = await service.createSession({ visitorIdentifier: "browser-visitor-003" });

  const first = await service.listMessages(created.capabilityToken);
  const second = await service.listMessages(created.capabilityToken);
  await service.listMessages(created.capabilityToken);
  await service.listMessages(created.capabilityToken);
  const snapshot = repository.debugSnapshot();
  const decrypted = encryption.decrypt(
    snapshot.sessions[0]!.encryptedSessionState,
    anonymousSessionStateSchema,
  );

  assert.equal(first.messages[0]?.reference, second.messages[0]?.reference);
  assert.equal(second.messages.length, 80);
  assert.equal(decrypted.messageReferenceState.entries.length, 200);
});

test("message detail resolves valid references and rejects unknown ones safely", async () => {
  const { service } = createServiceHarness();
  const created = await service.createSession({ visitorIdentifier: "browser-visitor-004" });
  const listed = await service.listMessages(created.capabilityToken);
  const reference = listed.messages[0]?.reference;

  assert.ok(reference);
  const detail = await service.getMessageDetail(created.capabilityToken, reference);
  assert.match(detail.detail.textPreview, /482731/u);

  await assert.rejects(
    () => service.getMessageDetail(created.capabilityToken, "msg_unknown"),
    (error: unknown) => error instanceof DomainError && error.code === "INVALID_MESSAGE_REFERENCE",
  );
});

test("expired and deleted sessions fail safely", async () => {
  const clock = new MutableClock();
  const { service } = createServiceHarness({
    clock,
    sessionTtlMs: 1_000,
  });
  const created = await service.createSession({ visitorIdentifier: "browser-visitor-005" });

  clock.advanceMs(1_001);
  await assert.rejects(
    () => service.listMessages(created.capabilityToken),
    (error: unknown) => error instanceof DomainError && error.code === "SESSION_EXPIRED",
  );

  const fresh = await service.createSession({ visitorIdentifier: "browser-visitor-006" });
  await service.deleteSession(fresh.capabilityToken);
  await assert.rejects(
    () => service.listMessages(fresh.capabilityToken),
    (error: unknown) => error instanceof DomainError && error.code === "SESSION_NOT_FOUND",
  );
});

test("stale concurrent updates do not overwrite newer encrypted state", async () => {
  const clock = new MutableClock();
  const repository = new InMemorySessionRepository({ clock });
  let injectedStaleWrite = false;
  let staleCapabilityHash: string | null = null;
  const provider: InboxProvider<ReturnType<typeof createProviderState>> = {
    providerId: "emailnator",
    async createInbox() {
      return {
        address: "shadow.panel.001@gmail.com",
        providerState: createProviderState(),
      };
    },
    async listMessages() {
      if (!injectedStaleWrite && staleCapabilityHash) {
        injectedStaleWrite = true;
        const lookup = await repository.findByCapabilityTokenHash(staleCapabilityHash);
        if (lookup.status === "active") {
          await repository.updateEncryptedState({
            capabilityTokenHash: lookup.session.capabilityTokenHash,
            expectedVersion: lookup.session.providerStateVersion,
            encryptedSessionState: lookup.session.encryptedSessionState,
            updatedAt: clock.now().toISOString(),
          });
        }
      }

      const messages = [createMessage("provider-id-010")];
      return {
        messages,
        providerState: createProviderState("shadow.panel.001@gmail.com", {
          lastListedMessageIds: ["provider-id-010"],
        }),
      };
    },
    async getMessageDetail() {
      throw new Error("not used");
    },
  };
  const { service } = createServiceHarness({
    clock,
    repository,
    provider,
  });
  const created = await service.createSession({ visitorIdentifier: "browser-visitor-007" });
  staleCapabilityHash = repository.debugSnapshot().sessions[0]?.capabilityTokenHash ?? null;

  await assert.rejects(
    () => service.listMessages(created.capabilityToken),
    (error: unknown) => error instanceof DomainError && error.code === "STALE_SESSION_VERSION",
  );
});
