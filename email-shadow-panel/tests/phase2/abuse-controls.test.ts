import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryFixedWindowRateLimiter,
  UpstashFixedWindowRateLimiter,
  buildRateLimitKey,
} from "../../server/api/rate-limit.server.ts";
import {
  InMemoryOperationLockManager,
  UpstashOperationLockManager,
  buildOperationLockKey,
} from "../../server/api/operation-lock.server.ts";
import {
  buildUpstashVisitorReservationKey,
  __testables as repositoryTestables,
} from "../../server/session/upstash-session-repository.server.ts";
import { DomainError } from "../../server/session/errors.server.ts";
import { MutableClock, createDeterministicRandomBytes } from "../phase1/test-helpers.ts";

class FakeRedisClient {
  commands: string[][] = [];
  result: unknown = null;

  async command<TResult = unknown>(command: string[]): Promise<TResult> {
    this.commands.push(command);
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result as TResult;
  }
}

test("in-memory fixed-window rate limiting is deterministic across clock advances", async () => {
  const clock = new MutableClock();
  const limiter = new InMemoryFixedWindowRateLimiter({ clock });

  const first = await limiter.consume({
    scope: "create-visitor",
    key: "visitor-hash",
    limit: 1,
    windowMs: 1_000,
  });
  const second = await limiter.consume({
    scope: "create-visitor",
    key: "visitor-hash",
    limit: 1,
    windowMs: 1_000,
  });

  assert.equal(first.status, "allowed");
  assert.equal(second.status, "limited");
  clock.advanceMs(1_001);

  const third = await limiter.consume({
    scope: "create-visitor",
    key: "visitor-hash",
    limit: 1,
    windowMs: 1_000,
  });
  assert.equal(third.status, "allowed");
});

test("Upstash fixed-window rate limiting uses namespaced keys and preserves Retry-After", async () => {
  const client = new FakeRedisClient();
  client.result = JSON.stringify({ status: "limited", retryAfterMs: 12_000 });
  const limiter = new UpstashFixedWindowRateLimiter({
    client: client as never,
    namespace: "email-shadow-panel",
  });

  const result = await limiter.consume({
    scope: "read-capability",
    key: "cap-hash",
    limit: 60,
    windowMs: 60_000,
  });

  assert.equal(result.status, "limited");
  assert.equal(result.retryAfterSeconds, 12);
  assert.equal(
    client.commands[0]?.[3],
    buildRateLimitKey("email-shadow-panel", "read-capability", "cap-hash"),
  );
});

test("in-memory operation locks enforce ownership, conflicts, and expiry", async () => {
  const clock = new MutableClock();
  const locks = new InMemoryOperationLockManager({
    clock,
    randomBytesImpl: createDeterministicRandomBytes(1),
  });

  const first = await locks.acquire({ key: "cap-hash", ttlMs: 1_000 });
  const second = await locks.acquire({ key: "cap-hash", ttlMs: 1_000 });
  assert.equal(first.status, "acquired");
  assert.equal(second.status, "busy");
  assert.equal(await locks.release({ key: "cap-hash", token: "wrong-owner" }), false);
  assert.equal(await locks.release({ key: "cap-hash", token: first.token ?? "" }), true);

  const third = await locks.acquire({ key: "cap-hash", ttlMs: 1_000 });
  assert.equal(third.status, "acquired");
  clock.advanceMs(1_001);
  const fourth = await locks.acquire({ key: "cap-hash", ttlMs: 1_000 });
  assert.equal(fourth.status, "acquired");
});

test("Upstash operation lock release stays ownership-safe", async () => {
  const client = new FakeRedisClient();
  client.result = 1;
  const locks = new UpstashOperationLockManager({
    client: client as never,
    namespace: "email-shadow-panel",
    randomBytesImpl: createDeterministicRandomBytes(10),
  });

  const acquired = await locks.acquire({ key: "cap-hash", ttlMs: 15_000 });
  await locks.release({ key: "cap-hash", token: acquired.token ?? "" });

  assert.equal(client.commands[0]?.[0], "SET");
  assert.equal(client.commands[0]?.[1], buildOperationLockKey("email-shadow-panel", "cap-hash"));
  assert.match(client.commands[1]?.[1] ?? "", /redis\.call\("GET"/u);
  assert.match(client.commands[1]?.[1] ?? "", /redis\.call\("DEL"/u);
});

test("Upstash active-slot reservation scripts remain namespaced and separate from session keys", () => {
  assert.equal(
    buildUpstashVisitorReservationKey("email-shadow-panel", "visitor-hash"),
    "email-shadow-panel:visitor-reservations:visitor-hash",
  );
  assert.match(repositoryTestables.RESERVE_ACTIVE_SESSION_SLOT_SCRIPT, /ZCOUNT/u);
  assert.match(repositoryTestables.RELEASE_ACTIVE_SESSION_SLOT_SCRIPT, /ZREM/u);
});

test("persistence failures from Upstash-backed abuse controls normalize safely", async () => {
  const client = new FakeRedisClient();
  client.result = "not-json";
  const limiter = new UpstashFixedWindowRateLimiter({
    client: client as never,
    namespace: "email-shadow-panel",
  });

  await assert.rejects(
    () => limiter.consume({ scope: "scope", key: "key", limit: 1, windowMs: 1_000 }),
    (error: unknown) => error instanceof DomainError && error.code === "PERSISTENCE_UNAVAILABLE",
  );
});
