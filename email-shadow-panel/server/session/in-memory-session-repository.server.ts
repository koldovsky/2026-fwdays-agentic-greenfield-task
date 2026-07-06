import {
  anonymousVisitorHashSchema,
  capabilityTokenHashSchema,
  persistedAnonymousSessionSchema,
  type PersistedAnonymousSession,
} from "./contracts.server.ts";
import type { Clock } from "./clock.server.ts";
import { systemClock } from "./clock.server.ts";
import { DomainError } from "./errors.server.ts";
import type {
  SessionLookupResult,
  SessionRepository,
  SessionStateUpdateResult,
} from "./repository.server.ts";

type StoredSession = {
  session: PersistedAnonymousSession;
  expiresAtMs: number;
};

function cloneSession(session: PersistedAnonymousSession): PersistedAnonymousSession {
  return structuredClone(session);
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly clock: Clock;
  private readonly sessions = new Map<string, StoredSession>();
  private readonly visitorIndex = new Map<string, Map<string, number>>();

  constructor(options?: { clock?: Clock }) {
    this.clock = options?.clock ?? systemClock;
  }

  async create(session: PersistedAnonymousSession, _ttlMs: number): Promise<void> {
    const parsed = persistedAnonymousSessionSchema.parse(session);
    const capabilityTokenHash = capabilityTokenHashSchema.parse(parsed.capabilityTokenHash);
    const existing = this.getStoredSession(capabilityTokenHash);
    if (existing.status === "active") {
      throw new DomainError(
        "PERSISTENCE_UNAVAILABLE",
        "Session already exists in the repository.",
        {
          safeMessage: "Session state could not be saved.",
        },
      );
    }

    const expiresAtMs = new Date(parsed.expiresAt).getTime();
    this.sessions.set(capabilityTokenHash, {
      session: cloneSession(parsed),
      expiresAtMs,
    });
    this.indexVisitor(parsed.anonymousVisitorHash, capabilityTokenHash, expiresAtMs);
  }

  async findByCapabilityTokenHash(capabilityTokenHash: string): Promise<SessionLookupResult> {
    return this.getStoredSession(capabilityTokenHash);
  }

  async updateEncryptedState(input: {
    capabilityTokenHash: string;
    expectedVersion: number;
    encryptedSessionState: string;
    updatedAt: string;
  }): Promise<SessionStateUpdateResult> {
    const capabilityTokenHash = capabilityTokenHashSchema.parse(input.capabilityTokenHash);
    const lookup = this.getStoredSession(capabilityTokenHash);
    if (lookup.status !== "active") {
      return lookup;
    }
    const stored = this.sessions.get(capabilityTokenHash);
    if (!stored) {
      return { status: "missing" };
    }

    if (lookup.session.providerStateVersion !== input.expectedVersion) {
      return {
        status: "stale",
        currentVersion: lookup.session.providerStateVersion,
      };
    }

    const nextSession = persistedAnonymousSessionSchema.parse({
      ...lookup.session,
      encryptedSessionState: input.encryptedSessionState,
      providerStateVersion: lookup.session.providerStateVersion + 1,
      updatedAt: input.updatedAt,
    });
    this.sessions.set(capabilityTokenHash, {
      session: cloneSession(nextSession),
      expiresAtMs: stored.expiresAtMs,
    });
    this.indexVisitor(nextSession.anonymousVisitorHash, capabilityTokenHash, stored.expiresAtMs);

    return {
      status: "updated",
      session: cloneSession(nextSession),
    };
  }

  async deleteByCapabilityTokenHash(capabilityTokenHash: string): Promise<boolean> {
    const parsedHash = capabilityTokenHashSchema.parse(capabilityTokenHash);
    const existing = this.sessions.get(parsedHash);
    if (!existing) {
      return false;
    }

    this.sessions.delete(parsedHash);
    this.unindexVisitor(existing.session.anonymousVisitorHash, parsedHash);
    return true;
  }

  async countActiveSessionsByVisitorHash(anonymousVisitorHash: string): Promise<number> {
    const parsedHash = anonymousVisitorHashSchema.parse(anonymousVisitorHash);
    const bucket = this.visitorIndex.get(parsedHash);
    if (!bucket) {
      return 0;
    }

    const nowMs = this.clock.now().getTime();
    for (const [capabilityTokenHash, expiresAtMs] of bucket.entries()) {
      if (expiresAtMs <= nowMs) {
        this.sessions.delete(capabilityTokenHash);
        bucket.delete(capabilityTokenHash);
      }
    }

    if (bucket.size === 0) {
      this.visitorIndex.delete(parsedHash);
      return 0;
    }

    return bucket.size;
  }

  debugSnapshot(): {
    sessions: PersistedAnonymousSession[];
    visitorIndex: Array<{ anonymousVisitorHash: string; capabilityTokenHashes: string[] }>;
  } {
    return {
      sessions: [...this.sessions.values()].map(({ session }) => cloneSession(session)),
      visitorIndex: [...this.visitorIndex.entries()].map(([anonymousVisitorHash, entries]) => ({
        anonymousVisitorHash,
        capabilityTokenHashes: [...entries.keys()].sort(),
      })),
    };
  }

  private getStoredSession(capabilityTokenHash: string): SessionLookupResult {
    const parsedHash = capabilityTokenHashSchema.parse(capabilityTokenHash);
    const stored = this.sessions.get(parsedHash);
    if (!stored) {
      return { status: "missing" };
    }

    if (stored.expiresAtMs <= this.clock.now().getTime()) {
      this.sessions.delete(parsedHash);
      this.unindexVisitor(stored.session.anonymousVisitorHash, parsedHash);
      return { status: "expired" };
    }

    return {
      status: "active",
      session: cloneSession(stored.session),
    };
  }

  private indexVisitor(
    anonymousVisitorHash: string,
    capabilityTokenHash: string,
    expiresAtMs: number,
  ): void {
    const parsedVisitorHash = anonymousVisitorHashSchema.parse(anonymousVisitorHash);
    const bucket = this.visitorIndex.get(parsedVisitorHash) ?? new Map<string, number>();
    bucket.set(capabilityTokenHash, expiresAtMs);
    this.visitorIndex.set(parsedVisitorHash, bucket);
  }

  private unindexVisitor(anonymousVisitorHash: string, capabilityTokenHash: string): void {
    const bucket = this.visitorIndex.get(anonymousVisitorHash);
    if (!bucket) {
      return;
    }

    bucket.delete(capabilityTokenHash);
    if (bucket.size === 0) {
      this.visitorIndex.delete(anonymousVisitorHash);
    }
  }
}
