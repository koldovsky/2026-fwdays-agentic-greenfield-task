import assert from "node:assert/strict";
import test from "node:test";

import { InboxApiClientError, createBrowserInboxApiClient } from "../../src/lib/inboxApiClient.ts";

const capabilityToken = "AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA";

test("browser api client uses exact routes, same-origin credentials, and bearer authorization only", async () => {
  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  const client = createBrowserInboxApiClient({
    fetchImpl: async (input, init) => {
      calls.push({ input, init });
      const path = String(input);
      if (path === "/api/inboxes" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            data: {
              capabilityToken,
              inbox: {
                address: "shadow.panel.001@gmail.com",
                createdAt: "2026-07-06T12:00:00.000Z",
                updatedAt: "2026-07-06T12:00:00.000Z",
                expiresAt: "2026-07-06T13:00:00.000Z",
              },
            },
          }),
        );
      }
      if (path === "/api/inboxes/messages") {
        return new Response(
          JSON.stringify({
            data: {
              inbox: {
                address: "shadow.panel.001@gmail.com",
                createdAt: "2026-07-06T12:00:00.000Z",
                updatedAt: "2026-07-06T12:01:00.000Z",
                expiresAt: "2026-07-06T13:00:00.000Z",
              },
              messages: [
                {
                  reference: "msg_validvalid1",
                  from: "Verification Robot",
                  subject: "Code",
                  time: "2026-07-06 12:01",
                },
              ],
            },
          }),
        );
      }
      if (path === "/api/inboxes/messages/msg_validvalid1") {
        return new Response(
          JSON.stringify({
            data: {
              inbox: {
                address: "shadow.panel.001@gmail.com",
                createdAt: "2026-07-06T12:00:00.000Z",
                updatedAt: "2026-07-06T12:01:00.000Z",
                expiresAt: "2026-07-06T13:00:00.000Z",
              },
              message: {
                reference: "msg_validvalid1",
                contentType: "text/plain",
                bodyLength: 19,
                text: "Your code is 482731",
                textPreview: "Your code is 482731",
                markerFound: true,
              },
            },
          }),
        );
      }
      return new Response(null, { status: 204 });
    },
  });

  await client.createInbox();
  await client.listMessages(capabilityToken);
  await client.getMessageDetail(capabilityToken, "msg_validvalid1");
  await client.deleteInbox(capabilityToken);

  assert.deepEqual(
    calls.map((call) => [String(call.input), call.init?.method]),
    [
      ["/api/inboxes", "POST"],
      ["/api/inboxes/messages", "GET"],
      ["/api/inboxes/messages/msg_validvalid1", "GET"],
      ["/api/inboxes", "DELETE"],
    ],
  );

  for (const call of calls) {
    assert.equal(call.init?.credentials, "same-origin");
    assert.doesNotMatch(String(call.input), new RegExp(capabilityToken, "u"));
  }

  const authHeaders = calls
    .slice(1)
    .map((call) => new Headers(call.init?.headers).get("authorization"));
  assert.deepEqual(authHeaders, [
    `Bearer ${capabilityToken}`,
    `Bearer ${capabilityToken}`,
    `Bearer ${capabilityToken}`,
  ]);
});

test("browser api client parses retry-after, forwards abort signals, and keeps token values out of thrown errors", async () => {
  const abortController = new AbortController();
  let capturedSignal: AbortSignal | null | undefined;
  const client = createBrowserInboxApiClient({
    fetchImpl: async (_input, init) => {
      capturedSignal = init?.signal;
      return new Response(
        JSON.stringify({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests were sent.",
            requestId: "req_test00000001",
            retryable: true,
          },
        }),
        {
          status: 429,
          headers: { "Retry-After": "17" },
        },
      );
    },
  });

  await assert.rejects(
    () => client.listMessages(capabilityToken, { signal: abortController.signal }),
    (error: unknown) => {
      assert.ok(error instanceof InboxApiClientError);
      assert.equal(error.kind, "rateLimited");
      assert.equal(error.retryAfterSeconds, 17);
      assert.doesNotMatch(error.message, new RegExp(capabilityToken, "u"));
      return true;
    },
  );

  assert.equal(capturedSignal, abortController.signal);
});

test("browser api client treats malformed success and error envelopes as malformed responses", async () => {
  const malformedSuccessClient = createBrowserInboxApiClient({
    fetchImpl: async () => new Response(JSON.stringify({ nope: true })),
  });
  await assert.rejects(
    () => malformedSuccessClient.createInbox(),
    (error: unknown) => error instanceof InboxApiClientError && error.kind === "malformedResponse",
  );

  const malformedErrorClient = createBrowserInboxApiClient({
    fetchImpl: async () => new Response(JSON.stringify({ nope: true }), { status: 503 }),
  });
  await assert.rejects(
    () => malformedErrorClient.listMessages(capabilityToken),
    (error: unknown) => error instanceof InboxApiClientError && error.kind === "malformedResponse",
  );
});

test("browser api client classifies network failures safely", async () => {
  const client = createBrowserInboxApiClient({
    fetchImpl: async () => {
      throw new TypeError("network down");
    },
  });

  await assert.rejects(
    () => client.createInbox(),
    (error: unknown) => error instanceof InboxApiClientError && error.kind === "offline",
  );
});
