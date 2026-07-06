import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../../server/session/errors.server.ts";
import { createUpstashRedisRestClient } from "../../server/session/upstash-redis-client.server.ts";
import {
  __testables,
  buildUpstashSessionKey,
  buildUpstashVisitorKey,
  UpstashSessionRepository,
} from "../../server/session/upstash-session-repository.server.ts";
import { createPersistedSessionRecord, MutableClock, responseJson } from "./test-helpers.ts";

class FakeUpstashClient {
  commandCalls: Array<readonly [string, ...string[]]> = [];
  pipelineCalls: Array<readonly (readonly [string, ...string[]])[]> = [];
  commandResponse: unknown = JSON.stringify({ status: "created" });
  pipelineResponse: unknown[] = [0, 0];

  async command<TResult = unknown>(command: readonly [string, ...string[]]): Promise<TResult> {
    this.commandCalls.push(command);
    return this.commandResponse as TResult;
  }

  async pipeline<TResult = unknown>(
    commands: Array<readonly [string, ...string[]]>,
  ): Promise<TResult[]> {
    this.pipelineCalls.push(commands);
    return this.pipelineResponse as TResult[];
  }
}

test("Upstash repository uses namespaced Redis keys and scripts TTL-aware atomic updates", async () => {
  const client = new FakeUpstashClient();
  const clock = new MutableClock();
  const repository = new UpstashSessionRepository({
    client,
    namespace: "email-shadow-panel",
    clock,
  });
  const record = createPersistedSessionRecord({ clock });

  await repository.create(record, 900_000);
  client.commandResponse = JSON.stringify({
    status: "updated",
    session: {
      ...record,
      providerStateVersion: 2,
      updatedAt: clock.now().toISOString(),
    },
  });
  await repository.updateEncryptedState({
    capabilityTokenHash: record.capabilityTokenHash,
    expectedVersion: 1,
    encryptedSessionState: "es1.bmV4dA.Ym9keQ.dGFn",
    updatedAt: clock.now().toISOString(),
  });

  const createCommand = client.commandCalls[0];
  const updateCommand = client.commandCalls[1];
  assert.equal(
    buildUpstashSessionKey("email-shadow-panel", record.capabilityTokenHash),
    createCommand?.[3],
  );
  assert.equal(
    buildUpstashVisitorKey("email-shadow-panel", record.anonymousVisitorHash),
    createCommand?.[4],
  );
  assert.equal(createCommand?.[0], "EVAL");
  assert.match(createCommand?.[1] ?? "", /PEXPIRE/u);
  assert.match(updateCommand?.[1] ?? "", /PTTL/u);
  assert.match(updateCommand?.[1] ?? "", /providerStateVersion/u);
  assert.doesNotMatch(JSON.stringify(createCommand), /browser-visitor/u);
});

test("Upstash repository parses stale-version and count responses safely", async () => {
  const client = new FakeUpstashClient();
  const clock = new MutableClock();
  const repository = new UpstashSessionRepository({
    client,
    namespace: "email-shadow-panel",
    clock,
  });
  const record = createPersistedSessionRecord({ clock });

  client.commandResponse = JSON.stringify({ status: "stale", currentVersion: 4 });
  const stale = await repository.updateEncryptedState({
    capabilityTokenHash: record.capabilityTokenHash,
    expectedVersion: 3,
    encryptedSessionState: record.encryptedSessionState,
    updatedAt: clock.now().toISOString(),
  });

  client.pipelineResponse = [1, 2];
  const count = await repository.countActiveSessionsByVisitorHash(record.anonymousVisitorHash);

  assert.deepEqual(stale, {
    status: "stale",
    currentVersion: 4,
  });
  assert.equal(count, 2);
});

test("Upstash REST client uses JSON command payloads and normalizes failures", async () => {
  const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
  const client = createUpstashRedisRestClient(
    {
      url: "https://redis.example.test",
      token: "token-value",
    },
    {
      fetchImpl: async (url, init) => {
        requests.push({ url: String(url), init });
        return responseJson({ result: "OK" });
      },
    },
  );

  const result = await client.command(["PING"]);
  assert.equal(result, "OK");
  assert.equal(requests[0]?.url, "https://redis.example.test");
  assert.equal(requests[0]?.init?.method, "POST");
  assert.equal(String(requests[0]?.init?.body), JSON.stringify(["PING"]));

  const failingClient = createUpstashRedisRestClient(
    {
      url: "https://redis.example.test",
      token: "token-value",
    },
    {
      fetchImpl: async () => responseJson({ error: "boom" }),
    },
  );

  await assert.rejects(
    () => failingClient.command(["PING"]),
    (error: unknown) => error instanceof DomainError && error.code === "PERSISTENCE_UNAVAILABLE",
  );
});
