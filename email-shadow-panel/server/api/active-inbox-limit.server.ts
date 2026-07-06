import { randomBytes } from "node:crypto";

import type { SessionRepository } from "../session/repository.server.ts";

type RandomBytesFn = (size: number) => Uint8Array;

export interface ActiveInboxReservation {
  status: "reserved" | "limit_reached";
  reservationId?: string;
}

export interface ActiveInboxLimiter {
  reserve(input: {
    anonymousVisitorHash: string;
    limit: number;
    ttlMs: number;
  }): Promise<ActiveInboxReservation>;
  release(input: { anonymousVisitorHash: string; reservationId: string }): Promise<void>;
}

function createReservationId(randomBytesImpl: RandomBytesFn): string {
  return `rsv_${Buffer.from(randomBytesImpl(12)).toString("base64url")}`;
}

export class RepositoryBackedActiveInboxLimiter implements ActiveInboxLimiter {
  private readonly repository: SessionRepository;
  private readonly randomBytesImpl: RandomBytesFn;

  constructor(options: { repository: SessionRepository; randomBytesImpl?: RandomBytesFn }) {
    this.repository = options.repository;
    this.randomBytesImpl = options.randomBytesImpl ?? randomBytes;
  }

  async reserve(input: {
    anonymousVisitorHash: string;
    limit: number;
    ttlMs: number;
  }): Promise<ActiveInboxReservation> {
    const reservationId = createReservationId(this.randomBytesImpl);
    const result = await this.repository.reserveActiveSessionSlot({
      anonymousVisitorHash: input.anonymousVisitorHash,
      limit: input.limit,
      reservationId,
      ttlMs: input.ttlMs,
    });

    if (result.status === "limit_reached") {
      return { status: "limit_reached" };
    }

    return {
      status: "reserved",
      reservationId,
    };
  }

  async release(input: { anonymousVisitorHash: string; reservationId: string }): Promise<void> {
    await this.repository.releaseActiveSessionSlotReservation(input);
  }
}
