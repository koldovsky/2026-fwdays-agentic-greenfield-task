import type { PersistedAnonymousSession } from "./contracts.server.ts";

export type SessionLookupResult =
  | { status: "active"; session: PersistedAnonymousSession }
  | { status: "expired" }
  | { status: "missing" };

export type SessionStateUpdateResult =
  | { status: "updated"; session: PersistedAnonymousSession }
  | { status: "stale"; currentVersion: number }
  | { status: "expired" }
  | { status: "missing" };

export type ActiveSessionReservationResult = { status: "reserved" } | { status: "limit_reached" };

export interface SessionRepository {
  create(session: PersistedAnonymousSession, ttlMs: number): Promise<void>;
  findByCapabilityTokenHash(capabilityTokenHash: string): Promise<SessionLookupResult>;
  updateEncryptedState(input: {
    capabilityTokenHash: string;
    expectedVersion: number;
    encryptedSessionState: string;
    updatedAt: string;
  }): Promise<SessionStateUpdateResult>;
  deleteByCapabilityTokenHash(capabilityTokenHash: string): Promise<boolean>;
  countActiveSessionsByVisitorHash(anonymousVisitorHash: string): Promise<number>;
  reserveActiveSessionSlot(input: {
    anonymousVisitorHash: string;
    limit: number;
    reservationId: string;
    ttlMs: number;
  }): Promise<ActiveSessionReservationResult>;
  releaseActiveSessionSlotReservation(input: {
    anonymousVisitorHash: string;
    reservationId: string;
  }): Promise<void>;
}
