import type { Clock } from "../session/clock.server.ts";
import { systemClock } from "../session/clock.server.ts";
import { DomainError } from "../session/errors.server.ts";
import type { UpstashRedisClient } from "../session/upstash-redis-client.server.ts";

export interface RateLimitResult {
  status: "allowed" | "limited";
  retryAfterSeconds?: number;
}

export interface RateLimiter {
  consume(input: {
    scope: string;
    key: string;
    limit: number;
    windowMs: number;
  }): Promise<RateLimitResult>;
}

type FixedWindowState = {
  count: number;
  expiresAtMs: number;
};

export function buildRateLimitKey(namespace: string, scope: string, key: string): string {
  return `${namespace}:ratelimits:${scope}:${key}`;
}

function toRetryAfterSeconds(ms: number): number | undefined {
  if (ms <= 0) {
    return undefined;
  }

  return Math.max(1, Math.ceil(ms / 1000));
}

export class InMemoryFixedWindowRateLimiter implements RateLimiter {
  private readonly clock: Clock;
  private readonly buckets = new Map<string, FixedWindowState>();

  constructor(options?: { clock?: Clock }) {
    this.clock = options?.clock ?? systemClock;
  }

  async consume(input: {
    scope: string;
    key: string;
    limit: number;
    windowMs: number;
  }): Promise<RateLimitResult> {
    const bucketKey = `${input.scope}:${input.key}`;
    const nowMs = this.clock.now().getTime();
    const existing = this.buckets.get(bucketKey);

    if (!existing || existing.expiresAtMs <= nowMs) {
      this.buckets.set(bucketKey, {
        count: 1,
        expiresAtMs: nowMs + input.windowMs,
      });
      return { status: "allowed" };
    }

    existing.count += 1;
    if (existing.count > input.limit) {
      return {
        status: "limited",
        retryAfterSeconds: toRetryAfterSeconds(existing.expiresAtMs - nowMs),
      };
    }

    return { status: "allowed" };
  }

  debugSnapshot(): Array<{ key: string; count: number; expiresAtMs: number }> {
    return [...this.buckets.entries()].map(([key, value]) => ({ key, ...value }));
  }
}

export class UpstashFixedWindowRateLimiter implements RateLimiter {
  private readonly client: UpstashRedisClient;
  private readonly namespace: string;

  constructor(options: { client: UpstashRedisClient; namespace: string }) {
    this.client = options.client;
    this.namespace = options.namespace;
  }

  async consume(input: {
    scope: string;
    key: string;
    limit: number;
    windowMs: number;
  }): Promise<RateLimitResult> {
    const result = await this.client.command<string>([
      "EVAL",
      [
        'local current = redis.call("INCR", KEYS[1])',
        'if tonumber(current) == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end',
        'local ttl = redis.call("PTTL", KEYS[1])',
        "if tonumber(current) > tonumber(ARGV[2]) then",
        '  return cjson.encode({ status = "limited", retryAfterMs = ttl })',
        "end",
        'return cjson.encode({ status = "allowed", retryAfterMs = ttl })',
      ].join("\n"),
      "1",
      buildRateLimitKey(this.namespace, input.scope, input.key),
      String(input.windowMs),
      String(input.limit),
    ]);

    let parsed: { status: "allowed" | "limited"; retryAfterMs?: number };
    try {
      parsed = JSON.parse(result) as { status: "allowed" | "limited"; retryAfterMs?: number };
    } catch (error) {
      throw new DomainError("PERSISTENCE_UNAVAILABLE", "Rate-limit Redis result was invalid.", {
        cause: error,
        safeMessage: "Temporary rate-limit state is unavailable.",
      });
    }

    if (parsed.status === "limited") {
      return {
        status: "limited",
        retryAfterSeconds: toRetryAfterSeconds(Number(parsed.retryAfterMs ?? 0)),
      };
    }

    return { status: "allowed" };
  }
}
