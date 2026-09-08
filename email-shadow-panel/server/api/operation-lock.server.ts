import { randomBytes } from "node:crypto";

import type { Clock } from "../session/clock.server.ts";
import { systemClock } from "../session/clock.server.ts";
import type { UpstashRedisClient } from "../session/upstash-redis-client.server.ts";

type RandomBytesFn = (size: number) => Uint8Array;

type LockState = {
  token: string;
  expiresAtMs: number;
};

export interface LockAcquireResult {
  status: "acquired" | "busy";
  token?: string;
  retryAfterSeconds?: number;
}

export interface OperationLockManager {
  acquire(input: { key: string; ttlMs: number }): Promise<LockAcquireResult>;
  release(input: { key: string; token: string }): Promise<boolean>;
}

export function buildOperationLockKey(namespace: string, key: string): string {
  return `${namespace}:locks:${key}`;
}

function createLockToken(randomBytesImpl: RandomBytesFn): string {
  return Buffer.from(randomBytesImpl(12)).toString("base64url");
}

function toRetryAfterSeconds(ms: number): number | undefined {
  if (ms <= 0) {
    return undefined;
  }

  return Math.max(1, Math.ceil(ms / 1000));
}

export class InMemoryOperationLockManager implements OperationLockManager {
  private readonly clock: Clock;
  private readonly randomBytesImpl: RandomBytesFn;
  private readonly locks = new Map<string, LockState>();

  constructor(options?: { clock?: Clock; randomBytesImpl?: RandomBytesFn }) {
    this.clock = options?.clock ?? systemClock;
    this.randomBytesImpl = options?.randomBytesImpl ?? randomBytes;
  }

  async acquire(input: { key: string; ttlMs: number }): Promise<LockAcquireResult> {
    const nowMs = this.clock.now().getTime();
    const existing = this.locks.get(input.key);
    if (existing && existing.expiresAtMs > nowMs) {
      return {
        status: "busy",
        retryAfterSeconds: toRetryAfterSeconds(existing.expiresAtMs - nowMs),
      };
    }

    this.locks.set(input.key, {
      token: createLockToken(this.randomBytesImpl),
      expiresAtMs: nowMs + input.ttlMs,
    });

    return {
      status: "acquired",
      token: this.locks.get(input.key)?.token,
    };
  }

  async release(input: { key: string; token: string }): Promise<boolean> {
    const existing = this.locks.get(input.key);
    if (!existing || existing.token !== input.token) {
      return false;
    }

    this.locks.delete(input.key);
    return true;
  }

  debugSnapshot(): Array<{ key: string; token: string; expiresAtMs: number }> {
    return [...this.locks.entries()].map(([key, state]) => ({ key, ...state }));
  }
}

export class UpstashOperationLockManager implements OperationLockManager {
  private readonly client: UpstashRedisClient;
  private readonly namespace: string;
  private readonly randomBytesImpl: RandomBytesFn;

  constructor(options: {
    client: UpstashRedisClient;
    namespace: string;
    randomBytesImpl?: RandomBytesFn;
  }) {
    this.client = options.client;
    this.namespace = options.namespace;
    this.randomBytesImpl = options.randomBytesImpl ?? randomBytes;
  }

  async acquire(input: { key: string; ttlMs: number }): Promise<LockAcquireResult> {
    const token = createLockToken(this.randomBytesImpl);
    const result = await this.client.command<string | null>([
      "SET",
      buildOperationLockKey(this.namespace, input.key),
      token,
      "NX",
      "PX",
      String(input.ttlMs),
    ]);

    if (result !== "OK") {
      return {
        status: "busy",
        retryAfterSeconds: toRetryAfterSeconds(input.ttlMs),
      };
    }

    return {
      status: "acquired",
      token,
    };
  }

  async release(input: { key: string; token: string }): Promise<boolean> {
    const result = await this.client.command<number>([
      "EVAL",
      [
        'if redis.call("GET", KEYS[1]) == ARGV[1] then',
        '  return redis.call("DEL", KEYS[1])',
        "end",
        "return 0",
      ].join("\n"),
      "1",
      buildOperationLockKey(this.namespace, input.key),
      input.token,
    ]);

    return Number(result) > 0;
  }
}
