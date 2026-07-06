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

test("generateInboxAddress uses the fixed origin and forwards cookies plus XSRF state", async () => {
  const bootstrapFixture = jsonFixture<{
    headers: Record<string, string | string[]>;
    bodyFile: string;
  }>("bootstrap.public-reference.json");
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
  assert.equal(requests[0]?.url, "https://www.emailnator.com/");
  assert.equal(requests[0]?.init?.method, "GET");
  assert.equal(requests[1]?.url, "https://www.emailnator.com/generate-email");
  assert.equal(requests[1]?.init?.method, "POST");

  const headers = new Headers(requests[1]?.init?.headers);
  assert.equal(headers.get("X-Requested-With"), "XMLHttpRequest");
  assert.equal(headers.get("X-XSRF-TOKEN"), "redacted-xsrf-value");
  assert.match(headers.get("Cookie") ?? "", /gmailnator_session=/);
  assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), {
    email: ["domain", "plusGmail", "dotGmail", "googleMail"],
  });
});

test("listInboxMessages parses empty and populated fixtures without live traffic", async () => {
  const emptyState = await createStateWithCookies();
  const empty = await listInboxMessages(emptyState, {
    fetchImpl: async () =>
      responseFromFixture({
        body: JSON.stringify(jsonFixture("message-list-empty.synthetic.json")),
        headers: { "content-type": "application/json" },
      }),
  });
  assert.deepEqual(empty.messages, []);

  const populatedState = await createStateWithCookies();
  const populated = await listInboxMessages(populatedState, {
    fetchImpl: async () =>
      responseFromFixture({
        body: JSON.stringify(jsonFixture("message-list-populated.synthetic.json")),
        headers: { "content-type": "application/json" },
      }),
  });
  assert.equal(populated.messages.length, 2);
  assert.equal(populated.messages[0]?.messageID, "msg-001");
});

test("getMessageDetail returns sanitized structural evidence only", async () => {
  const state = await createStateWithCookies();
  const result = await getMessageDetail(state, "msg-001", {
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

  const bootstrapFixture = jsonFixture<{
    headers: Record<string, string | string[]>;
    bodyFile: string;
  }>("bootstrap.public-reference.json");
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
