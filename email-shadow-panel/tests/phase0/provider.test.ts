import assert from "node:assert/strict";
import test from "node:test";

import {
  applyResponseCookies,
  createEmptyCookieJar,
  serializeCookieJar,
} from "../../server/providers/emailnator/cookies.server.ts";
import { EmailnatorError } from "../../server/providers/emailnator/errors.server.ts";
import {
  __testables,
  createEmptyProviderState,
  generateInboxAddress,
  getMessageDetail,
  listInboxMessages,
} from "../../server/providers/emailnator/provider.server.ts";
import type { EmailnatorProviderState } from "../../server/providers/emailnator/schemas.server.ts";
import { jsonFixture, readFixture, responseFromFixture } from "./test-helpers.ts";

const OPAQUE_ID_ONE = "provider:id/001?part=alpha+beta";
const OPAQUE_ID_TWO = "provider.id/002=mailbox%2Fview";
const OVERLONG_ID = "x".repeat(201);
const CONTROL_CHARACTER_ID = `bad${String.fromCharCode(0x1f)}id`;
const NULL_BYTE_ID = `bad${String.fromCharCode(0)}id`;

function createStateWithAddress(address = "shadow.panel.001@gmail.com"): EmailnatorProviderState {
  return {
    ...createEmptyProviderState(),
    address,
  };
}

async function createStateWithCookies(address = "shadow.panel.001@gmail.com") {
  const jar = createEmptyCookieJar();
  const headers = new Headers();
  headers.append("set-cookie", "XSRF-TOKEN=redacted-xsrf-value; Path=/");
  headers.append("set-cookie", "gmailnator_session=redacted-session-value; Path=/; HttpOnly");
  await applyResponseCookies(jar, headers, "https://www.emailnator.com/");
  return {
    ...createStateWithAddress(address),
    cookieJar: serializeCookieJar(jar),
    observedCookieNames: ["XSRF-TOKEN", "gmailnator_session"],
  };
}

function loadBootstrapFixture() {
  return jsonFixture<{
    headers: Record<string, string | string[]>;
    bodyFile: string;
  }>("bootstrap.public-reference.json");
}

test("generateInboxAddress requests dotGmail by default and accepts gmail.com", async () => {
  const bootstrapFixture = loadBootstrapFixture();
  const generateFixture = jsonFixture<{ email: string[] }>(
    "generate.public-reference-derived.json",
  );
  const requests: Array<{ url: string; init: RequestInit | undefined }> = [];

  const result = await generateInboxAddress({
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      if (requests.length === 1) {
        return responseFromFixture({
          body: readFixture(bootstrapFixture.bodyFile),
          headers: bootstrapFixture.headers,
        });
      }

      return responseFromFixture({
        body: JSON.stringify(generateFixture),
        headers: { "content-type": "application/json" },
      });
    },
  });

  assert.equal(result.address, generateFixture.email[0]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.url, "https://www.emailnator.com/");
  assert.equal(requests[0]?.init?.method, "GET");
  assert.equal(requests[1]?.url, "https://www.emailnator.com/generate-email");
  assert.equal(requests[1]?.init?.method, "POST");

  const headers = new Headers(requests[1]?.init?.headers);
  assert.equal(headers.get("X-Requested-With"), "XMLHttpRequest");
  assert.equal(headers.get("X-XSRF-TOKEN"), "redacted-xsrf-value");
  assert.match(headers.get("Cookie") ?? "", /gmailnator_session=/);
  assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), {
    email: ["dotGmail"],
  });
  assert.doesNotMatch(String(requests[1]?.init?.body), /domain/);
});

test("generateInboxAddress accepts googlemail.com only as a bounded fallback result", async () => {
  const bootstrapFixture = loadBootstrapFixture();
  const requests: Array<{ url: string; init: RequestInit | undefined }> = [];

  const result = await generateInboxAddress({
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      if (requests.length === 1) {
        return responseFromFixture({
          body: readFixture(bootstrapFixture.bodyFile),
          headers: bootstrapFixture.headers,
        });
      }

      return responseFromFixture({
        body: JSON.stringify({ email: ["shadow.panel.001@googlemail.com"] }),
        headers: { "content-type": "application/json" },
      });
    },
  });

  assert.equal(result.address, "shadow.panel.001@googlemail.com");
  assert.equal(requests.length, 3);
  assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), {
    email: ["dotGmail"],
  });
  assert.deepEqual(JSON.parse(String(requests[2]?.init?.body)), {
    email: ["googleMail"],
  });
});

test("generateInboxAddress rejects custom-domain responses after one fallback without looping", async () => {
  const bootstrapFixture = loadBootstrapFixture();
  const requests: Array<{ url: string; init: RequestInit | undefined }> = [];

  await assert.rejects(
    () =>
      generateInboxAddress({
        fetchImpl: async (url, init) => {
          requests.push({ url: String(url), init });
          if (requests.length === 1) {
            return responseFromFixture({
              body: readFixture(bootstrapFixture.bodyFile),
              headers: bootstrapFixture.headers,
            });
          }

          const address =
            requests.length === 2
              ? "shadow.panel.001@mydefipet.live"
              : "shadow.panel.001@example.test";
          return responseFromFixture({
            body: JSON.stringify({ email: [address] }),
            headers: { "content-type": "application/json" },
          });
        },
      }),
    (error: unknown) =>
      error instanceof EmailnatorError &&
      error.code === "PROVIDER_RESPONSE_INVALID" &&
      /Gmail-style inbox address compatible with the MVP/i.test(error.message),
  );

  assert.equal(requests.length, 3);
  assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), {
    email: ["dotGmail"],
  });
  assert.deepEqual(JSON.parse(String(requests[2]?.init?.body)), {
    email: ["googleMail"],
  });
});

test("listInboxMessages accepts realistic opaque ids and preserves them exactly", async () => {
  const populatedState = await createStateWithCookies();
  const populated = await listInboxMessages(populatedState, {
    fetchImpl: async () =>
      responseFromFixture({
        body: JSON.stringify({
          messageData: [
            {
              from: "Verification Robot",
              subject: "Shadow Panel Phase 0",
              time: "2026-07-05 18:00",
              messageID: OPAQUE_ID_ONE,
            },
            {
              from: "Example Service",
              subject: "Welcome aboard",
              time: "2026-07-05 18:05",
              messageID: OPAQUE_ID_TWO,
            },
          ],
        }),
        headers: { "content-type": "application/json" },
      }),
  });

  assert.equal(populated.messages.length, 2);
  assert.equal(populated.messages[0]?.messageID, OPAQUE_ID_ONE);
  assert.equal(populated.messages[1]?.messageID, OPAQUE_ID_TWO);
  assert.deepEqual(populated.state.lastListedMessageIds, [OPAQUE_ID_ONE, OPAQUE_ID_TWO]);
});

test("listInboxMessages rejects empty, overlong, null-byte, and control-character ids", async () => {
  const invalidIds = ["", OVERLONG_ID, NULL_BYTE_ID, CONTROL_CHARACTER_ID];

  for (const invalidId of invalidIds) {
    const state = await createStateWithCookies();
    await assert.rejects(
      () =>
        listInboxMessages(state, {
          fetchImpl: async () =>
            responseFromFixture({
              body: JSON.stringify({
                messageData: [
                  {
                    from: "Verification Robot",
                    subject: "Shadow Panel Phase 0",
                    time: "2026-07-05 18:00",
                    messageID: invalidId,
                  },
                ],
              }),
              headers: { "content-type": "application/json" },
            }),
        }),
      (error: unknown) =>
        error instanceof EmailnatorError && error.code === "PROVIDER_RESPONSE_INVALID",
    );
  }
});

test("getMessageDetail preserves opaque message ids exactly inside the fixed JSON request body", async () => {
  const state = await createStateWithCookies();
  const requests: Array<{ url: string; init: RequestInit | undefined }> = [];

  await getMessageDetail(state, OPAQUE_ID_ONE, {
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      return responseFromFixture({
        body: readFixture("message-detail.synthetic.html"),
        headers: { "content-type": "text/html; charset=UTF-8" },
      });
    },
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.url, "https://www.emailnator.com/message-list");
  assert.equal(requests[0]?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), {
    email: "shadow.panel.001@gmail.com",
    messageID: OPAQUE_ID_ONE,
  });
});

test("getMessageDetail returns sanitized structural evidence only", async () => {
  const state = await createStateWithCookies();
  const result = await getMessageDetail(state, OPAQUE_ID_ONE, {
    fetchImpl: async () =>
      responseFromFixture({
        body: readFixture("message-detail.synthetic.html"),
        headers: { "content-type": "text/html; charset=UTF-8" },
      }),
  });

  assert.equal(result.detail.contentType, "text/html; charset=UTF-8");
  assert.equal(result.detail.markerFound, true);
  assert.match(result.detail.textPreview, /482731/);
  assert.doesNotMatch(result.detail.textPreview, /<strong>/);
});

test("transport enforces response limits and normalizes timeouts", async () => {
  const state = createEmptyProviderState();

  await assert.rejects(
    () =>
      __testables.performRequest(
        state,
        "/",
        { accept: "text/html", maxBytes: 8 },
        {
          fetchImpl: async () =>
            responseFromFixture({ body: "0123456789", headers: { "content-type": "text/html" } }),
        },
      ),
    (error: unknown) => error instanceof EmailnatorError && error.code === "REQUEST_TOO_LARGE",
  );

  await assert.rejects(
    () =>
      __testables.performRequest(
        state,
        "/",
        { accept: "text/html", timeoutMs: 5 },
        {
          fetchImpl: async (_url, init) =>
            new Promise<Response>((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () =>
                reject(new DOMException("Aborted", "AbortError")),
              );
            }),
        },
      ),
    (error: unknown) => error instanceof EmailnatorError && error.code === "REQUEST_TIMEOUT",
  );
});

test("transport classifies provider errors, challenge blocks, and malformed responses", async () => {
  const state = createEmptyProviderState();

  await assert.rejects(
    () =>
      __testables.performRequest(
        state,
        "/message-list",
        { accept: "application/json" },
        {
          fetchImpl: async () =>
            responseFromFixture({
              status: 500,
              body: JSON.stringify(jsonFixture("provider-error.synthetic.json")),
              headers: { "content-type": "application/json" },
            }),
        },
      ),
    (error: unknown) => error instanceof EmailnatorError && error.code === "PROVIDER_HTTP",
  );

  await assert.rejects(
    () =>
      __testables.performRequest(
        state,
        "/message-list",
        { accept: "text/html" },
        {
          fetchImpl: async () =>
            responseFromFixture({
              status: 403,
              body: readFixture("provider-challenge.synthetic.html"),
              headers: { "content-type": "text/html" },
            }),
        },
      ),
    (error: unknown) => error instanceof EmailnatorError && error.code === "PROVIDER_BLOCKED",
  );

  const bootstrapFixture = loadBootstrapFixture();
  await assert.rejects(
    () =>
      generateInboxAddress({
        fetchImpl: async (_url, init) => {
          if ((init?.method ?? "GET") === "GET") {
            return responseFromFixture({
              body: readFixture(bootstrapFixture.bodyFile),
              headers: bootstrapFixture.headers,
            });
          }

          return responseFromFixture({
            body: "{}",
            headers: { "content-type": "application/json" },
          });
        },
      }),
    (error: unknown) =>
      error instanceof EmailnatorError && error.code === "PROVIDER_RESPONSE_INVALID",
  );
});
