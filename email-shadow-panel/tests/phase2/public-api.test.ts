import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../../server/session/errors.server.ts";
import {
  publicCreateInboxResponseSchema,
  publicHealthResponseSchema,
  publicListMessagesResponseSchema,
  publicMessageDetailResponseSchema,
  publicErrorEnvelopeSchema,
} from "../../server/api/contracts.server.ts";
import { createPublicApiHandlers } from "../../server/api/handlers.server.ts";
import { createEmptyProviderState } from "../../server/providers/emailnator/provider.server.ts";
import { emailnatorProviderStateSchema } from "../../server/providers/emailnator/schemas.server.ts";
import { InMemorySessionRepository } from "../../server/session/in-memory-session-repository.server.ts";
import { createApiHarness, createDefaultConfig, createRequest, readJson } from "./test-helpers.ts";
import { MutableClock } from "../phase1/test-helpers.ts";

function extractCookieValue(setCookieHeader: string): string {
  const match = /^[^=]+=([^;]+)/u.exec(setCookieHeader);
  assert.ok(match);
  return match[1];
}

function createAuthHeader(token: string): Headers {
  return new Headers({ authorization: `Bearer ${token}` });
}

function syntheticProviderState(address = "shadow.panel.001@gmail.com") {
  return emailnatorProviderStateSchema.parse({
    ...createEmptyProviderState(),
    address,
  });
}
function createDeferred<TValue>() {
  let resolve!: (value: TValue) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("create inbox returns the capability only once with stable headers and a secure visitor cookie contract", async () => {
  const { handlers, repository } = createApiHarness();
  const response = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.10" },
    }),
  );
  const body = publicCreateInboxResponseSchema.parse(await readJson(response));
  const setCookie = response.headers.get("set-cookie");

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.ok(setCookie);
  assert.match(setCookie, /HttpOnly/u);
  assert.match(setCookie, /SameSite=Lax/u);
  assert.match(setCookie, /Path=\//u);
  assert.equal(body.data.inbox.address, "shadow.panel.001@gmail.com");
  assert.equal(repository.debugSnapshot().sessions.length, 1);
});

test("list and detail return provider-neutral schemas without echoing the capability", async () => {
  const { handlers, loggerEvents } = createApiHarness();
  const createdResponse = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.11" },
    }),
  );
  const created = publicCreateInboxResponseSchema.parse(await readJson(createdResponse));

  const listResponse = await handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", {
      method: "GET",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
  );
  const listBody = publicListMessagesResponseSchema.parse(await readJson(listResponse));
  const reference = listBody.data.messages[0]?.reference;
  assert.ok(reference);
  assert.doesNotMatch(JSON.stringify(listBody), new RegExp(created.data.capabilityToken, "u"));

  const detailResponse = await handlers.handleMessageDetailRoute(
    createRequest(`https://esp.example/api/inboxes/messages/${reference}`, {
      method: "GET",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
    { messageReference: reference },
  );
  const detailBody = publicMessageDetailResponseSchema.parse(await readJson(detailResponse));

  assert.equal(listResponse.status, 200);
  assert.equal(detailResponse.status, 200);
  assert.equal(detailBody.data.message.reference, reference);
  assert.doesNotMatch(JSON.stringify(detailBody), /provider-msg-001/u);
  assert.doesNotMatch(JSON.stringify(loggerEvents), new RegExp(created.data.capabilityToken, "u"));
});

test("delete is successful and idempotent for missing or expired sessions", async () => {
  const { handlers } = createApiHarness();
  const createdResponse = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.12" },
    }),
  );
  const created = publicCreateInboxResponseSchema.parse(await readJson(createdResponse));

  const firstDelete = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "DELETE",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
  );
  const secondDelete = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "DELETE",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
  );

  assert.equal(firstDelete.status, 204);
  assert.equal(secondDelete.status, 204);
});

test("health reports ok or degraded without exposing internal details", async () => {
  const okHarness = createApiHarness();
  const degradedHarness = createApiHarness({
    config: { providerEnabled: false },
  });

  const okResponse = await okHarness.handlers.handleHealthRoute(
    createRequest("https://esp.example/api/health", { method: "GET" }),
  );
  const degradedResponse = await degradedHarness.handlers.handleHealthRoute(
    createRequest("https://esp.example/api/health", { method: "GET" }),
  );

  assert.deepEqual(publicHealthResponseSchema.parse(await readJson(okResponse)), {
    data: { status: "ok" },
  });
  assert.deepEqual(publicHealthResponseSchema.parse(await readJson(degradedResponse)), {
    data: { status: "degraded" },
  });
});

test("unsupported methods return 405 with Allow", async () => {
  const { handlers } = createApiHarness();
  const response = await handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", { method: "POST" }),
  );
  const body = publicErrorEnvelopeSchema.parse(await readJson(response));

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
  assert.equal(body.error.code, "METHOD_NOT_ALLOWED");
});

test("malformed bodies, query strings, path parameters, and cross-origin state changes are rejected safely", async () => {
  const { handlers } = createApiHarness();

  const bodyResponse = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.13" },
      body: "{}",
    }),
  );
  const queryResponse = await handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages?capability=abc", {
      method: "GET",
      headers: createAuthHeader("AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA"),
    }),
  );
  const originResponse = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        host: "esp.example",
        "x-forwarded-proto": "https",
        "x-forwarded-for": "198.51.100.13",
      },
    }),
  );
  const pathResponse = await handlers.handleMessageDetailRoute(
    createRequest("https://esp.example/api/inboxes/messages/not-valid", {
      method: "GET",
      headers: createAuthHeader("AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA"),
    }),
    { messageReference: "not-valid" },
  );

  assert.equal(bodyResponse.status, 400);
  assert.equal(queryResponse.status, 400);
  assert.equal(originResponse.status, 403);
  assert.equal(pathResponse.status, 400);
});

test("capabilities are accepted only through Authorization Bearer and malformed variants are rejected", async () => {
  const { handlers } = createApiHarness();
  const missingResponse = await handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", { method: "GET" }),
  );
  const malformedResponse = await handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", {
      method: "GET",
      headers: { authorization: "Basic abc" },
    }),
  );
  const oversizedResponse = await handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", {
      method: "GET",
      headers: { authorization: `Bearer ${"a".repeat(600)}` },
    }),
  );
  const duplicateHeaders = new Headers();
  duplicateHeaders.append("authorization", "Bearer first");
  duplicateHeaders.append("authorization", "Bearer second");
  const duplicateResponse = await handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", {
      method: "GET",
      headers: duplicateHeaders,
    }),
  );

  assert.equal(missingResponse.status, 401);
  assert.equal(malformedResponse.status, 401);
  assert.equal(oversizedResponse.status, 401);
  assert.equal(duplicateResponse.status, 401);
});

test("visitor cookies are reused when valid, rotated when malformed, and never persisted raw", async () => {
  const { handlers, repository, loggerEvents } = createApiHarness();
  const firstResponse = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.14" },
    }),
  );
  const firstSetCookie = firstResponse.headers.get("set-cookie");
  assert.ok(firstSetCookie);
  const rawCookieValue = extractCookieValue(firstSetCookie);

  const secondResponse = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: {
        cookie: `esp_anon_v1=${rawCookieValue}`,
        "x-forwarded-for": "198.51.100.14",
      },
    }),
  );
  assert.equal(secondResponse.headers.get("set-cookie"), null);

  const rotatedResponse = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: {
        cookie: "esp_anon_v1=not valid !",
        "x-forwarded-for": "198.51.100.14",
      },
    }),
  );
  const rotatedCookie = rotatedResponse.headers.get("set-cookie");
  assert.ok(rotatedCookie);
  assert.notEqual(extractCookieValue(rotatedCookie), "not valid !");

  assert.doesNotMatch(JSON.stringify(repository.debugSnapshot()), new RegExp(rawCookieValue, "u"));
  assert.doesNotMatch(JSON.stringify(loggerEvents), new RegExp(rawCookieValue, "u"));
});

test("production cookie mode adds Secure", async () => {
  const { handlers } = createApiHarness({
    config: { secureVisitorCookie: true },
  });
  const response = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.15" },
    }),
  );

  assert.match(response.headers.get("set-cookie") ?? "", /Secure/u);
});

test("client IP extraction uses trusted forwarded values, local fallback, and rejects malformed input without persisting raw values", async () => {
  const forwardedHarness = createApiHarness();
  const localHarness = createApiHarness();
  const badHarness = createApiHarness();

  const forwardedResponse = await forwardedHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.25, 70.41.3.18" },
    }),
  );
  const localResponse = await localHarness.handlers.handleInboxesRoute(
    createRequest("http://localhost:3000/api/inboxes", {
      method: "POST",
    }),
  );
  const badResponse = await badHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "not-an-ip" },
    }),
  );

  assert.equal(forwardedResponse.status, 201);
  assert.equal(localResponse.status, 201);
  assert.equal(badResponse.status, 400);
  assert.doesNotMatch(
    JSON.stringify(forwardedHarness.rateLimiter.debugSnapshot()),
    /203\.0\.113\.25/u,
  );
  assert.doesNotMatch(JSON.stringify(forwardedHarness.loggerEvents), /203\.0\.113\.25/u);
});

test("visitor and IP creation limits return 429 with Retry-After and reset after the fixed window", async () => {
  const visitorHarness = createApiHarness({
    config: {
      createLimitPerVisitor: 1,
      createLimitPerIp: 10,
      createWindowMs: 1_000,
    },
  });
  const firstResponse = await visitorHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.16" },
    }),
  );
  const visitorCookie = firstResponse.headers.get("set-cookie");
  assert.ok(visitorCookie);
  const secondResponse = await visitorHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: {
        cookie: `esp_anon_v1=${extractCookieValue(visitorCookie)}`,
        "x-forwarded-for": "198.51.100.16",
      },
    }),
  );
  assert.equal(secondResponse.status, 429);
  assert.ok(secondResponse.headers.get("retry-after"));
  visitorHarness.clock.advanceMs(1_001);
  const thirdResponse = await visitorHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: {
        cookie: `esp_anon_v1=${extractCookieValue(visitorCookie)}`,
        "x-forwarded-for": "198.51.100.16",
      },
    }),
  );
  assert.equal(thirdResponse.status, 201);

  const ipHarness = createApiHarness({
    config: {
      createLimitPerVisitor: 10,
      createLimitPerIp: 1,
      createWindowMs: 60_000,
    },
  });
  const ipFirst = await ipHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.17" },
    }),
  );
  const ipSecond = await ipHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.17" },
    }),
  );
  assert.equal(ipFirst.status, 201);
  assert.equal(ipSecond.status, 429);
});

test("capability read limits use the hashed capability and return 429 safely", async () => {
  const { handlers } = createApiHarness({
    config: {
      readLimitPerCapability: 1,
      readWindowMs: 60_000,
    },
  });
  const createdResponse = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.18" },
    }),
  );
  const created = publicCreateInboxResponseSchema.parse(await readJson(createdResponse));

  const firstList = await handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", {
      method: "GET",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
  );
  const secondList = await handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", {
      method: "GET",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
  );

  assert.equal(firstList.status, 200);
  assert.equal(secondList.status, 429);
});

test("active inbox limits reject over-limit creates, exclude expired sessions, and stay safe under concurrency", async () => {
  const harness = createApiHarness({
    config: { maxActiveInboxesPerVisitor: 1 },
  });
  const first = await harness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.19" },
    }),
  );
  const visitorCookie = first.headers.get("set-cookie");
  assert.ok(visitorCookie);

  const second = await harness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: {
        cookie: `esp_anon_v1=${extractCookieValue(visitorCookie)}`,
        "x-forwarded-for": "198.51.100.19",
      },
    }),
  );
  assert.equal(second.status, 429);

  harness.clock.advanceMs(15 * 60 * 1000 + 1);
  const third = await harness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: {
        cookie: `esp_anon_v1=${extractCookieValue(visitorCookie)}`,
        "x-forwarded-for": "198.51.100.19",
      },
    }),
  );
  assert.equal(third.status, 201);

  const gate = createDeferred<void>();
  const concurrentHarness = createApiHarness({
    config: { maxActiveInboxesPerVisitor: 1 },
    provider: {
      providerId: "emailnator",
      async createInbox() {
        await gate.promise;
        return {
          address: "shadow.panel.001@gmail.com",
          providerState: syntheticProviderState(),
        };
      },
      async listMessages() {
        throw new Error("unused");
      },
      async getMessageDetail() {
        throw new Error("unused");
      },
    },
  });
  const cookie = "esp_anon_v1=stablevisitorcookievalue_stablevisitorcookievalueA";
  const pending = concurrentHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { cookie, "x-forwarded-for": "198.51.100.20" },
    }),
  );
  const blocked = await concurrentHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { cookie, "x-forwarded-for": "198.51.100.20" },
    }),
  );
  gate.resolve();
  const completed = await pending;

  assert.equal(blocked.status, 429);
  assert.equal(completed.status, 201);
});

test("failed creates release active-slot reservations", async () => {
  let fail = true;
  const { handlers } = createApiHarness({
    provider: {
      providerId: "emailnator",
      async createInbox() {
        if (fail) {
          fail = false;
          throw new DomainError("PROVIDER_UNAVAILABLE", "Synthetic failure.", {
            safeMessage: "Synthetic failure.",
          });
        }

        return {
          address: "shadow.panel.001@gmail.com",
          providerState: syntheticProviderState(),
        };
      },
      async listMessages() {
        throw new Error("unused");
      },
      async getMessageDetail() {
        throw new Error("unused");
      },
    },
  });

  const first = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.21" },
    }),
  );
  const second = await handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.21" },
    }),
  );

  assert.equal(first.status, 503);
  assert.equal(second.status, 201);
});

test("per-session locks reject concurrent stateful reads and release after completion", async () => {
  const createdHarness = createApiHarness();
  const createdResponse = await createdHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.22" },
    }),
  );
  const created = publicCreateInboxResponseSchema.parse(await readJson(createdResponse));

  const gate = createDeferred<void>();
  const lockedHarness = createApiHarness({
    repository: createdHarness.repository,
    provider: {
      providerId: "emailnator",
      async createInbox() {
        throw new Error("unused");
      },
      async listMessages() {
        await gate.promise;
        return {
          messages: [
            {
              providerMessageId: "provider-msg-001",
              from: "Verification Robot",
              subject: "Subject",
              time: "2026-07-06 12:00",
            },
          ],
          providerState: syntheticProviderState(),
        };
      },
      async getMessageDetail() {
        throw new Error("unused");
      },
    },
  });

  const pending = lockedHarness.handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", {
      method: "GET",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
  );
  const conflicted = await lockedHarness.handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", {
      method: "GET",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
  );
  gate.resolve();
  const completed = await pending;

  assert.equal(conflicted.status, 409);
  assert.equal(completed.status, 200);
  assert.equal(lockedHarness.operationLockManager.debugSnapshot().length, 0);
});

test("provider kill switch blocks create, list, and detail without affecting delete or health", async () => {
  const activeHarness = createApiHarness();
  const createdResponse = await activeHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.23" },
    }),
  );
  const created = publicCreateInboxResponseSchema.parse(await readJson(createdResponse));

  const disabledHarness = createApiHarness({
    repository: activeHarness.repository,
    config: { providerEnabled: false },
  });

  const createResponse = await disabledHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.23" },
    }),
  );
  const listResponse = await disabledHarness.handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", {
      method: "GET",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
  );
  const detailResponse = await disabledHarness.handlers.handleMessageDetailRoute(
    createRequest("https://esp.example/api/inboxes/messages/msg_validvalid", {
      method: "GET",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
    { messageReference: "msg_validvalid" },
  );
  const deleteResponse = await disabledHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "DELETE",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
  );
  const healthResponse = await disabledHarness.handlers.handleHealthRoute(
    createRequest("https://esp.example/api/health", { method: "GET" }),
  );

  assert.equal(createResponse.status, 503);
  assert.equal(listResponse.status, 503);
  assert.equal(detailResponse.status, 503);
  assert.equal(deleteResponse.status, 204);
  assert.deepEqual(publicHealthResponseSchema.parse(await readJson(healthResponse)), {
    data: { status: "degraded" },
  });
});

test("timeouts propagate abort signals, release locks, and avoid late state writes", async () => {
  const clock = new MutableClock();
  const createdHarness = createApiHarness({ clock });
  const createdResponse = await createdHarness.handlers.handleInboxesRoute(
    createRequest("https://esp.example/api/inboxes", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.24" },
    }),
  );
  const created = publicCreateInboxResponseSchema.parse(await readJson(createdResponse));
  const beforeVersion = createdHarness.repository.debugSnapshot().sessions[0]?.providerStateVersion;

  const lateCompletionHarness = createApiHarness({
    clock,
    repository: createdHarness.repository,
    config: { requestTimeoutMs: 5, operationLockTtlMs: 25 },
    provider: {
      providerId: "emailnator",
      async createInbox() {
        throw new Error("unused");
      },
      async listMessages({ signal }) {
        await new Promise((resolve) => setTimeout(resolve, 15));
        assert.ok(signal?.aborted);
        return {
          messages: [
            {
              providerMessageId: "provider-msg-001",
              from: "Verification Robot",
              subject: "Subject",
              time: "2026-07-06 12:00",
            },
          ],
          providerState: syntheticProviderState(),
        };
      },
      async getMessageDetail() {
        throw new Error("unused");
      },
    },
  });

  const response = await lateCompletionHarness.handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", {
      method: "GET",
      headers: createAuthHeader(created.data.capabilityToken),
    }),
  );
  const afterVersion =
    lateCompletionHarness.repository.debugSnapshot().sessions[0]?.providerStateVersion;

  assert.equal(response.status, 504);
  assert.equal(lateCompletionHarness.operationLockManager.debugSnapshot().length, 0);
  assert.equal(beforeVersion, afterVersion);
});

test("public error mappings stay normalized and safe", async () => {
  const repository = new InMemorySessionRepository({ clock: new MutableClock() });
  const config = createDefaultConfig();
  const handlers = createPublicApiHandlers(
    () => {
      throw new DomainError("CONFIGURATION_INVALID", "Nope", {
        safeMessage: "Nope",
      });
    },
    {
      requestIdGenerator: () => "req_test99999999",
    },
  );

  const internalResponse = await handlers.handleMessagesRoute(
    createRequest("https://esp.example/api/inboxes/messages", { method: "GET" }),
  );
  const internalBody = publicErrorEnvelopeSchema.parse(await readJson(internalResponse));
  assert.equal(internalResponse.status, 500);
  assert.equal(internalBody.error.code, "INTERNAL_ERROR");
  assert.ok(internalBody.error.requestId.length <= 28);
  assert.doesNotMatch(JSON.stringify(internalBody), /stack|cause|redis|token|hash/u);
  void repository;
  void config;
});
