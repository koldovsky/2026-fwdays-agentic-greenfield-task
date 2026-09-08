import assert from "node:assert/strict";
import test from "node:test";

import { handleEmailnatorProbeRequest } from "../../server/providers/emailnator/probe.server.ts";

function createRequest(method: string, body: unknown, token?: string): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return new Request("https://example.test/api/_probe/emailnator", {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
}

test("probe rejects unsupported methods, disabled state, missing token, invalid token, and production", async () => {
  const methodResponse = await handleEmailnatorProbeRequest(createRequest("GET", null));
  assert.equal(methodResponse.status, 405);

  const disabledResponse = await handleEmailnatorProbeRequest(
    createRequest("POST", { action: "generate" }, "good"),
    {
      env: {
        VERCEL_ENV: "preview",
        EMAILNATOR_PROBE_ENABLED: "false",
        PHASE0_PROBE_TOKEN: "good",
        PHASE0_SESSION_KEY: "secret",
      },
    },
  );
  assert.equal(disabledResponse.status, 403);

  const missingTokenResponse = await handleEmailnatorProbeRequest(
    createRequest("POST", { action: "generate" }),
    {
      env: {
        VERCEL_ENV: "preview",
        EMAILNATOR_PROBE_ENABLED: "true",
        PHASE0_PROBE_TOKEN: "good",
        PHASE0_SESSION_KEY: "secret",
      },
    },
  );
  assert.equal(missingTokenResponse.status, 401);

  const invalidTokenResponse = await handleEmailnatorProbeRequest(
    createRequest("POST", { action: "generate" }, "bad"),
    {
      env: {
        VERCEL_ENV: "preview",
        EMAILNATOR_PROBE_ENABLED: "true",
        PHASE0_PROBE_TOKEN: "good",
        PHASE0_SESSION_KEY: "secret",
      },
    },
  );
  assert.equal(invalidTokenResponse.status, 401);

  const productionResponse = await handleEmailnatorProbeRequest(
    createRequest("POST", { action: "generate" }, "good"),
    {
      env: {
        VERCEL_ENV: "production",
        EMAILNATOR_PROBE_ENABLED: "true",
        PHASE0_PROBE_TOKEN: "good",
        PHASE0_SESSION_KEY: "secret",
      },
    },
  );
  assert.equal(productionResponse.status, 403);
});

test("probe rejects malformed bodies and invalid actions", async () => {
  const env = {
    VERCEL_ENV: "preview",
    EMAILNATOR_PROBE_ENABLED: "true",
    PHASE0_PROBE_TOKEN: "good",
    PHASE0_SESSION_KEY: "secret",
  };

  const malformedJsonResponse = await handleEmailnatorProbeRequest(
    new Request("https://example.test/api/_probe/emailnator", {
      method: "POST",
      headers: { authorization: "Bearer good", "content-type": "application/json" },
      body: "not-json",
    }),
    { env },
  );
  assert.equal(malformedJsonResponse.status, 400);

  const invalidActionResponse = await handleEmailnatorProbeRequest(
    createRequest("POST", { action: "deleteEverything" }, "good"),
    { env },
  );
  assert.equal(invalidActionResponse.status, 400);
});

test("probe returns mocked success and strips local detail text from Preview responses", async () => {
  const env = {
    VERCEL_ENV: "preview",
    EMAILNATOR_PROBE_ENABLED: "true",
    PHASE0_PROBE_TOKEN: "good",
    PHASE0_SESSION_KEY: "secret",
  };

  const response = await handleEmailnatorProbeRequest(
    createRequest(
      "POST",
      { action: "detail", capsule: "capsule-token-value-1234567890", messageId: "msg-001" },
      "good",
    ),
    {
      env,
      actions: {
        detail: async (_capsule, _messageId) => ({
          action: "detail",
          capsule: "next-capsule",
          capsuleExpiresAt: "2026-07-05T12:15:00.000Z",
          diagnostics: {
            cookieCount: 2,
            cookieNames: ["XSRF-TOKEN", "gmailnator_session"],
            xsrfPresent: true,
            addressDomain: "gmail.com",
            addressHash: "abc123",
          },
          detail: {
            contentType: "text/html",
            bodyLength: 128,
            textPreview: "Your verification code is 482731",
            markerFound: true,
          },
          localText: "This should never leave the server boundary.",
        }),
      },
    },
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.ok, true);
  assert.equal("localText" in body, false);
  assert.equal((body.detail as Record<string, unknown>).markerFound, true);
});
