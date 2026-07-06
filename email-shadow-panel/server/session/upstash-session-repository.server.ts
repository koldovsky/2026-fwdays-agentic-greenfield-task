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
import type { UpstashRedisClient, UpstashRedisCommand } from "./upstash-redis-client.server.ts";

type UpdateScriptResult =
  | { status: "updated"; session: PersistedAnonymousSession }
  | { status: "stale"; currentVersion: number }
  | { status: "missing" }
  | { status: "expired" };

const CREATE_SESSION_SCRIPT = `
if redis.call("EXISTS", KEYS[1]) == 1 then
  return cjson.encode({ status = "exists" })
end
redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2], "NX")
redis.call("ZADD", KEYS[2], ARGV[3], ARGV[4])
redis.call("PEXPIRE", KEYS[2], ARGV[2])
return cjson.encode({ status = "created" })
`.trim();

const UPDATE_SESSION_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
if not raw then
  return cjson.encode({ status = "missing" })
end
local ttl = redis.call("PTTL", KEYS[1])
if ttl <= 0 then
  return cjson.encode({ status = "expired" })
end
local session = cjson.decode(raw)
if tonumber(session.providerStateVersion) ~= tonumber(ARGV[1]) then
  return cjson.encode({ status = "stale", currentVersion = session.providerStateVersion })
end
session.encryptedSessionState = ARGV[2]
session.providerStateVersion = tonumber(session.providerStateVersion) + 1
session.updatedAt = ARGV[3]
local encoded = cjson.encode(session)
redis.call("SET", KEYS[1], encoded, "PX", ttl)
return encoded
`.trim();

const DELETE_SESSION_SCRIPT = `
local deleted = redis.call("DEL", KEYS[1])
redis.call("ZREM", KEYS[2], ARGV[1])
if redis.call("ZCARD", KEYS[2]) == 0 then
  redis.call("DEL", KEYS[2])
end
return deleted
`.trim();

function parseSession(value: string): PersistedAnonymousSession {
  try {
    return persistedAnonymousSessionSchema.parse(JSON.parse(value));
  } catch (error) {
    throw new DomainError("PERSISTENCE_UNAVAILABLE", "Stored session data could not be parsed.", {
      cause: error,
      safeMessage: "Temporary session storage is unavailable.",
    });
  }
}

function parseJsonResult<TValue>(value: unknown): TValue {
  if (typeof value !== "string") {
    throw new DomainError("PERSISTENCE_UNAVAILABLE", "Redis script result was not a JSON string.", {
      safeMessage: "Temporary session storage is unavailable.",
    });
  }

  try {
    return JSON.parse(value) as TValue;
  } catch (error) {
    throw new DomainError("PERSISTENCE_UNAVAILABLE", "Redis script result could not be parsed.", {
      cause: error,
      safeMessage: "Temporary session storage is unavailable.",
    });
  }
}

export function buildUpstashSessionKey(namespace: string, capabilityTokenHash: string): string {
  return `${namespace}:sessions:${capabilityTokenHash}`;
}

export function buildUpstashVisitorKey(namespace: string, anonymousVisitorHash: string): string {
  return `${namespace}:visitors:${anonymousVisitorHash}`;
}

export class UpstashSessionRepository implements SessionRepository {
  private readonly client: UpstashRedisClient;
  private readonly namespace: string;
  private readonly clock: Clock;

  constructor(options: { client: UpstashRedisClient; namespace: string; clock?: Clock }) {
    this.client = options.client;
    this.namespace = options.namespace;
    this.clock = options.clock ?? systemClock;
  }

  async create(session: PersistedAnonymousSession, ttlMs: number): Promise<void> {
    const parsed = persistedAnonymousSessionSchema.parse(session);
    const sessionKey = buildUpstashSessionKey(this.namespace, parsed.capabilityTokenHash);
    const visitorKey = buildUpstashVisitorKey(this.namespace, parsed.anonymousVisitorHash);
    const command: UpstashRedisCommand = [
      "EVAL",
      CREATE_SESSION_SCRIPT,
      "2",
      sessionKey,
      visitorKey,
      JSON.stringify(parsed),
      String(ttlMs),
      String(new Date(parsed.expiresAt).getTime()),
      parsed.capabilityTokenHash,
    ];
    const result = parseJsonResult<{ status: "created" | "exists" }>(
      await this.client.command(command),
    );

    if (result.status === "exists") {
      throw new DomainError(
        "PERSISTENCE_UNAVAILABLE",
        "Redis refused to create a duplicate session key.",
        {
          safeMessage: "Session state could not be saved.",
        },
      );
    }
  }

  async findByCapabilityTokenHash(capabilityTokenHash: string): Promise<SessionLookupResult> {
    const parsedHash = capabilityTokenHashSchema.parse(capabilityTokenHash);
    const raw = await this.client.command<string | null>([
      "GET",
      buildUpstashSessionKey(this.namespace, parsedHash),
    ]);

    if (raw === null) {
      return { status: "missing" };
    }

    const session = parseSession(raw);
    if (new Date(session.expiresAt).getTime() <= this.clock.now().getTime()) {
      await this.deleteByCapabilityTokenHash(parsedHash);
      return { status: "expired" };
    }

    return {
      status: "active",
      session,
    };
  }

  async updateEncryptedState(input: {
    capabilityTokenHash: string;
    expectedVersion: number;
    encryptedSessionState: string;
    updatedAt: string;
  }): Promise<SessionStateUpdateResult> {
    const parsedHash = capabilityTokenHashSchema.parse(input.capabilityTokenHash);
    const result = parseJsonResult<UpdateScriptResult>(
      await this.client.command([
        "EVAL",
        UPDATE_SESSION_SCRIPT,
        "1",
        buildUpstashSessionKey(this.namespace, parsedHash),
        String(input.expectedVersion),
        input.encryptedSessionState,
        input.updatedAt,
      ]),
    );

    if (result.status === "updated") {
      return {
        status: "updated",
        session: persistedAnonymousSessionSchema.parse(result.session),
      };
    }

    if (result.status === "stale") {
      return {
        status: "stale",
        currentVersion: Number(result.currentVersion),
      };
    }

    return result;
  }

  async deleteByCapabilityTokenHash(capabilityTokenHash: string): Promise<boolean> {
    const lookup = await this.findByCapabilityTokenHash(capabilityTokenHash);
    if (lookup.status !== "active") {
      return false;
    }

    const deleted = await this.client.command<number>([
      "EVAL",
      DELETE_SESSION_SCRIPT,
      "2",
      buildUpstashSessionKey(this.namespace, lookup.session.capabilityTokenHash),
      buildUpstashVisitorKey(this.namespace, lookup.session.anonymousVisitorHash),
      lookup.session.capabilityTokenHash,
    ]);

    return Number(deleted) > 0;
  }

  async countActiveSessionsByVisitorHash(anonymousVisitorHash: string): Promise<number> {
    const parsedHash = anonymousVisitorHashSchema.parse(anonymousVisitorHash);
    const visitorKey = buildUpstashVisitorKey(this.namespace, parsedHash);
    const now = String(this.clock.now().getTime());
    const results = await this.client.pipeline<number>([
      ["ZREMRANGEBYSCORE", visitorKey, "-inf", now],
      ["ZCOUNT", visitorKey, now, "+inf"],
    ]);

    return Number(results[1] ?? 0);
  }
}

export const __testables = {
  CREATE_SESSION_SCRIPT,
  UPDATE_SESSION_SCRIPT,
  DELETE_SESSION_SCRIPT,
};
