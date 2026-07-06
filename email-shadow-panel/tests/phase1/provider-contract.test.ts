import assert from "node:assert/strict";
import test from "node:test";

import {
  applyResponseCookies,
  createEmptyCookieJar,
  serializeCookieJar,
} from "../../server/providers/emailnator/cookies.server.ts";
import { createEmailnatorInboxProvider } from "../../server/providers/emailnator/inbox-provider.server.ts";
import { createEmptyProviderState } from "../../server/providers/emailnator/provider.server.ts";
import type { EmailnatorProviderState } from "../../server/providers/emailnator/schemas.server.ts";
import { DomainError } from "../../server/session/errors.server.ts";
import { jsonFixture, readFixture, responseFromFixture } from "../phase0/test-helpers.ts";

const OPAQUE_ID_ONE = "provider:id/001?part=alpha+beta";

function loadBootstrapFixture() {
  return jsonFixture<{
    headers: Record<string, string | string[]>;
    bodyFile: string;
  }>("bootstrap.public-reference.json");
}

async function createStateWithCookies(
  address = "shadow.panel.001@gmail.com",
): Promise<EmailnatorProviderState> {
  const jar = createEmptyCookieJar();
  const headers = new Headers();
  headers.append("set-cookie", "XSRF-TOKEN=redacted-xsrf-value; Path=/");
  headers.append("set-cookie", "gmailnator_session=redacted-session-value; Path=/; HttpOnly");
  await applyResponseCookies(jar, headers, "https://www.emailnator.com/");
  return {
    ...createEmptyProviderState(),
    address,
    cookieJar: serializeCookieJar(jar),
    observedCookieNames: ["XSRF-TOKEN", "gmailnator_session"],
  };
}

test("Emailnator provider creates inboxes through the formal provider contract", async () => {
  const bootstrapFixture = loadBootstrapFixture();
  const generateFixture = jsonFixture<{ email: string[] }>(
    "generate.public-reference-derived.json",
  );
  const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
  const provider = createEmailnatorInboxProvider({
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      if ((init?.method ?? "GET") === "GET") {
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

  const created = await provider.createInbox();

  assert.equal(provider.providerId, "emailnator");
  assert.equal(created.address, "shadow.panel.001@gmail.com");
  assert.equal(created.providerState.address, "shadow.panel.001@gmail.com");
  assert.equal(requests.length, 2);
  assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), {
    email: ["dotGmail"],
  });
});

test("Emailnator provider keeps the bounded googleMail fallback and rejects custom domains", async () => {
  const bootstrapFixture = loadBootstrapFixture();
  let callCount = 0;
  const provider = createEmailnatorInboxProvider({
    fetchImpl: async (_url, init) => {
      callCount += 1;
      if ((init?.method ?? "GET") === "GET") {
        return responseFromFixture({
          body: readFixture(bootstrapFixture.bodyFile),
          headers: bootstrapFixture.headers,
        });
      }

      const body =
        callCount === 2
          ? { email: ["shadow.panel.001@mydefipet.live"] }
          : { email: ["shadow.panel.001@example.test"] };
      return responseFromFixture({
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      });
    },
  });

  await assert.rejects(
    () => provider.createInbox(),
    (error: unknown) =>
      error instanceof DomainError && error.code === "PROVIDER_RESPONSE_INCOMPATIBLE",
  );
  assert.equal(callCount, 3);
});

test("Emailnator provider preserves opaque provider message ids internally and refreshes state", async () => {
  const providerState = await createStateWithCookies();
  const provider = createEmailnatorInboxProvider({
    fetchImpl: async () =>
      responseFromFixture({
        body: JSON.stringify({
          messageData: [
            {
              from: "Verification Robot",
              subject: "Shadow Panel Phase 1",
              time: "2026-07-06 12:00",
              messageID: OPAQUE_ID_ONE,
            },
          ],
        }),
        headers: { "content-type": "application/json" },
      }),
  });

  const listed = await provider.listMessages({ providerState });

  assert.equal(listed.messages.length, 1);
  assert.equal(listed.messages[0]?.providerMessageId, OPAQUE_ID_ONE);
  assert.deepEqual(listed.providerState.lastListedMessageIds, [OPAQUE_ID_ONE]);
});

test("Emailnator provider returns provider-neutral detail data and refreshed state", async () => {
  const providerState = await createStateWithCookies();
  const provider = createEmailnatorInboxProvider({
    fetchImpl: async () =>
      responseFromFixture({
        body: readFixture("message-detail.synthetic.html"),
        headers: { "content-type": "text/html; charset=UTF-8" },
      }),
  });

  const detail = await provider.getMessageDetail({
    providerState,
    providerMessageId: OPAQUE_ID_ONE,
  });

  assert.equal(detail.detail.contentType, "text/html; charset=UTF-8");
  assert.equal(detail.detail.markerFound, true);
  assert.equal(detail.providerState.address, providerState.address);
});
