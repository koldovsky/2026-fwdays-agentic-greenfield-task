import { randomBytes } from "node:crypto";

import { z } from "zod";

import type { InboxProvider } from "../providers/inbox-provider.server.ts";
import { emailnatorProviderStateSchema } from "../providers/emailnator/schemas.server.ts";
import type { Clock } from "./clock.server.ts";
import { systemClock } from "./clock.server.ts";
import {
  EMAIL_PROVIDER_ID,
  SESSION_ID_BYTES,
  anonymousSessionStateSchema,
  createAnonymousSessionInputSchema,
  createAnonymousSessionResultSchema,
  getSessionMessageDetailResultSchema,
  listSessionMessagesResultSchema,
  persistedAnonymousSessionSchema,
  sessionIdSchema,
  type AnonymousSessionState,
  type CreateAnonymousSessionResult,
  type GetSessionMessageDetailResult,
  type ListSessionMessagesResult,
  type PersistedAnonymousSession,
} from "./contracts.server.ts";
import type { EncryptionService } from "./encryption.server.ts";
import { ensureDomainError, DomainError } from "./errors.server.ts";
import {
  generateCapabilityToken,
  validateAndHashCapabilityToken,
} from "./capability-token.server.ts";
import {
  createEmptyMessageReferenceState,
  reconcileMessageReferences,
  resolveMessageReference,
} from "./message-references.server.ts";
import type { SessionRepository } from "./repository.server.ts";
import type { VisitorHashService } from "./visitor-hash.server.ts";

type RandomBytesFn = (size: number) => Uint8Array;

function createSessionId(randomBytesImpl: RandomBytesFn): string {
  return sessionIdSchema.parse(
    `sess_${Buffer.from(randomBytesImpl(SESSION_ID_BYTES)).toString("base64url")}`,
  );
}

function buildSessionSummary(session: PersistedAnonymousSession) {
  return {
    inboxAddress: session.inboxAddress,
    providerId: session.providerId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    expiresAt: session.expiresAt,
  };
}

function createEmptyAnonymousSessionState(providerState: AnonymousSessionState["providerState"]) {
  return anonymousSessionStateSchema.parse({
    version: 1,
    providerId: EMAIL_PROVIDER_ID,
    providerState,
    messageReferenceState: createEmptyMessageReferenceState(),
  });
}

function mapLookupError(status: "missing" | "expired"): DomainError {
  if (status === "expired") {
    return new DomainError("SESSION_EXPIRED", "The session has expired.", {
      safeMessage: "The session has expired.",
    });
  }

  return new DomainError("SESSION_NOT_FOUND", "The session does not exist.", {
    safeMessage: "The session was not found.",
  });
}

export class AnonymousSessionService {
  private readonly provider: InboxProvider<AnonymousSessionState["providerState"]>;
  private readonly repository: SessionRepository;
  private readonly encryption: EncryptionService;
  private readonly visitorHashService: VisitorHashService;
  private readonly clock: Clock;
  private readonly sessionTtlMs: number;
  private readonly randomBytesImpl: RandomBytesFn;
  private readonly stateSchema: typeof anonymousSessionStateSchema;

  constructor(options: {
    provider: InboxProvider<AnonymousSessionState["providerState"]>;
    repository: SessionRepository;
    encryption: EncryptionService;
    visitorHashService: VisitorHashService;
    sessionTtlMs: number;
    clock?: Clock;
    randomBytesImpl?: RandomBytesFn;
    stateSchema?: typeof anonymousSessionStateSchema;
  }) {
    this.provider = options.provider;
    this.repository = options.repository;
    this.encryption = options.encryption;
    this.visitorHashService = options.visitorHashService;
    this.sessionTtlMs = options.sessionTtlMs;
    this.clock = options.clock ?? systemClock;
    this.randomBytesImpl = options.randomBytesImpl ?? randomBytes;
    this.stateSchema = options.stateSchema ?? anonymousSessionStateSchema;
  }

  async createSession(input: { visitorIdentifier: string }): Promise<CreateAnonymousSessionResult> {
    const parsed = createAnonymousSessionInputSchema.parse(input);
    const now = this.clock.now();
    const visitorHash = this.visitorHashService.hashVisitorIdentifier(parsed.visitorIdentifier);
    const capabilityToken = generateCapabilityToken(this.randomBytesImpl);
    const capabilityTokenHash = validateAndHashCapabilityToken(capabilityToken);

    try {
      const createdInbox = await this.provider.createInbox();
      const state = createEmptyAnonymousSessionState(
        emailnatorProviderStateSchema.parse(createdInbox.providerState),
      );
      const encryptedSessionState = this.encryption.encrypt(state);
      const persistedSession = persistedAnonymousSessionSchema.parse({
        schemaVersion: 1,
        sessionId: createSessionId(this.randomBytesImpl),
        capabilityTokenHash,
        anonymousVisitorHash: visitorHash,
        inboxAddress: createdInbox.address,
        encryptedSessionState,
        providerStateVersion: 1,
        providerId: this.provider.providerId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + this.sessionTtlMs).toISOString(),
      });

      await this.repository.create(persistedSession, this.sessionTtlMs);
      return createAnonymousSessionResultSchema.parse({
        capabilityToken,
        session: buildSessionSummary(persistedSession),
      });
    } catch (error) {
      throw ensureDomainError(error, {
        code: "PERSISTENCE_UNAVAILABLE",
        message: "Creating the anonymous session failed.",
        safeMessage: "The session could not be created.",
      });
    }
  }

  async listMessages(capabilityToken: string): Promise<ListSessionMessagesResult> {
    const capabilityTokenHash = validateAndHashCapabilityToken(capabilityToken);
    const lookup = await this.repository.findByCapabilityTokenHash(capabilityTokenHash);
    if (lookup.status !== "active") {
      throw mapLookupError(lookup.status);
    }

    const decryptedState = anonymousSessionStateSchema.parse(
      this.encryption.decrypt(lookup.session.encryptedSessionState, this.stateSchema),
    );

    const listed = await this.provider.listMessages({
      providerState: decryptedState.providerState,
    });
    const reconciled = reconcileMessageReferences(
      decryptedState.messageReferenceState,
      listed.messages,
      this.clock.now(),
      this.randomBytesImpl,
    );
    const nextState = this.stateSchema.parse({
      ...decryptedState,
      providerState: emailnatorProviderStateSchema.parse(listed.providerState),
      messageReferenceState: reconciled.messageReferenceState,
    });

    const updateResult = await this.repository.updateEncryptedState({
      capabilityTokenHash,
      expectedVersion: lookup.session.providerStateVersion,
      encryptedSessionState: this.encryption.encrypt(nextState),
      updatedAt: this.clock.now().toISOString(),
    });

    if (updateResult.status === "stale") {
      throw new DomainError(
        "STALE_SESSION_VERSION",
        "Session state update lost a compare-and-set race.",
        {
          safeMessage: "The session changed while it was being refreshed. Please retry.",
        },
      );
    }

    if (updateResult.status === "expired" || updateResult.status === "missing") {
      throw mapLookupError(updateResult.status);
    }

    return listSessionMessagesResultSchema.parse({
      session: buildSessionSummary(updateResult.session),
      messages: reconciled.messages,
    });
  }

  async getMessageDetail(
    capabilityToken: string,
    messageReference: string,
  ): Promise<GetSessionMessageDetailResult> {
    const capabilityTokenHash = validateAndHashCapabilityToken(capabilityToken);
    const lookup = await this.repository.findByCapabilityTokenHash(capabilityTokenHash);
    if (lookup.status !== "active") {
      throw mapLookupError(lookup.status);
    }

    const decryptedState = anonymousSessionStateSchema.parse(
      this.encryption.decrypt(lookup.session.encryptedSessionState, this.stateSchema),
    );
    const providerMessageId = resolveMessageReference(
      decryptedState.messageReferenceState,
      messageReference,
    );
    const detail = await this.provider.getMessageDetail({
      providerState: decryptedState.providerState,
      providerMessageId,
    });
    const nextState = this.stateSchema.parse({
      ...decryptedState,
      providerState: emailnatorProviderStateSchema.parse(detail.providerState),
    });

    const updateResult = await this.repository.updateEncryptedState({
      capabilityTokenHash,
      expectedVersion: lookup.session.providerStateVersion,
      encryptedSessionState: this.encryption.encrypt(nextState),
      updatedAt: this.clock.now().toISOString(),
    });

    if (updateResult.status === "stale") {
      throw new DomainError(
        "STALE_SESSION_VERSION",
        "Session detail update lost a compare-and-set race.",
        {
          safeMessage: "The session changed while the message was being loaded. Please retry.",
        },
      );
    }

    if (updateResult.status === "expired" || updateResult.status === "missing") {
      throw mapLookupError(updateResult.status);
    }

    return getSessionMessageDetailResultSchema.parse({
      session: buildSessionSummary(updateResult.session),
      detail: detail.detail,
    });
  }

  async deleteSession(capabilityToken: string): Promise<void> {
    const capabilityTokenHash = validateAndHashCapabilityToken(capabilityToken);
    const deleted = await this.repository.deleteByCapabilityTokenHash(capabilityTokenHash);
    if (!deleted) {
      throw new DomainError(
        "SESSION_NOT_FOUND",
        "The session could not be deleted because it was not found.",
        {
          safeMessage: "The session was not found.",
        },
      );
    }
  }
}
