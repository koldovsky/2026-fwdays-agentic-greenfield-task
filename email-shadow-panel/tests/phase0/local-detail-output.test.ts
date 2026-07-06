import assert from "node:assert/strict";
import test from "node:test";

import {
  applyResponseCookies,
  createEmptyCookieJar,
  serializeCookieJar,
} from "../../server/providers/emailnator/cookies.server.ts";
import { createEmptyProviderState } from "../../server/providers/emailnator/provider.server.ts";
import {
  restoreStateFromCapsule,
  runLocalDetailAction,
} from "../../server/providers/emailnator/phase0.server.ts";
import { PHASE0_CAPSULE_TTL_MS } from "../../server/providers/emailnator/schemas.server.ts";
import { sealSessionCapsule } from "../../server/providers/emailnator/capsule.server.ts";
import { formatLocalDetailEvidenceLines } from "../../scripts/emailnator-probe.ts";
import { readFixture, responseFromFixture } from "./test-helpers.ts";

const ENV = {
  PHASE0_SESSION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
};

async function createCapsule(address = "shadow.panel.001@gmail.com"): Promise<string> {
  const jar = createEmptyCookieJar();
  const headers = new Headers();
  headers.append("set-cookie", "XSRF-TOKEN=redacted-xsrf-value; Path=/");
  headers.append("set-cookie", "gmailnator_session=redacted-session-value; Path=/; HttpOnly");
  await applyResponseCookies(jar, headers, "https://www.emailnator.com/");

  const state = {
    ...createEmptyProviderState(),
    address,
    cookieJar: serializeCookieJar(jar),
    observedCookieNames: ["XSRF-TOKEN", "gmailnator_session"],
    lastUsedAt: "2026-07-05T12:00:00.000Z",
  };

  return sealSessionCapsule(state, ENV.PHASE0_SESSION_KEY, {
    now: new Date("2026-07-05T12:00:00.000Z"),
    ttlMs: PHASE0_CAPSULE_TTL_MS,
  });
}

test("runLocalDetailAction returns structural evidence only and reseals state", async () => {
  const originalCapsule = await createCapsule();
  const now = new Date("2026-07-05T12:10:00.000Z");

  const result = await runLocalDetailAction(originalCapsule, "msg-001", ENV, {
    now: () => now,
    fetchImpl: async () =>
      responseFromFixture({
        body: readFixture("message-detail.synthetic.html"),
        headers: { "content-type": "text/html; charset=UTF-8" },
      }),
  });

  assert.deepEqual(Object.keys(result.detail).sort(), ["bodyLength", "contentType", "markerFound"]);
  assert.equal(result.detail.contentType, "text/html; charset=UTF-8");
  assert.equal(result.detail.markerFound, true);
  assert.equal(typeof result.detail.bodyLength, "number");

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /482731/);
  assert.doesNotMatch(serialized, /Your verification code is/i);
  assert.doesNotMatch(serialized, /Use this harmless synthetic fixture/i);
  assert.doesNotMatch(serialized, /Shadow Panel Phase 0/i);
  assert.doesNotMatch(serialized, /<strong>/i);
  assert.doesNotMatch(serialized, /textPreview/i);
  assert.doesNotMatch(serialized, /localText/i);
  assert.doesNotMatch(serialized, /XSRF-TOKEN/i);
  assert.doesNotMatch(serialized, /gmailnator_session/i);
  assert.doesNotMatch(serialized, /shadow\.panel\.001@gmail\.com/i);

  assert.notEqual(result.capsule, originalCapsule);
  const restored = restoreStateFromCapsule(result.capsule, ENV, { now: () => now });
  assert.equal(restored.address, "shadow.panel.001@gmail.com");
  assert.equal(restored.lastUsedAt, now.toISOString());
});

test("formatLocalDetailEvidenceLines prints only allowlisted structural lines", () => {
  const lines = formatLocalDetailEvidenceLines({
    contentType: "text/html; charset=UTF-8",
    bodyLength: 128,
    markerFound: true,
  });

  assert.deepEqual(lines, [
    "Content-Type: text/html; charset=UTF-8",
    "Body length: 128",
    "Known marker found: true",
  ]);

  const rendered = lines.join("\n");
  assert.doesNotMatch(rendered, /482731/);
  assert.doesNotMatch(rendered, /Your verification code is/i);
  assert.doesNotMatch(rendered, /Use this harmless synthetic fixture/i);
  assert.doesNotMatch(rendered, /<strong>/i);
  assert.doesNotMatch(rendered, /textPreview/i);
  assert.doesNotMatch(rendered, /localText/i);
  assert.doesNotMatch(rendered, /XSRF-TOKEN/i);
  assert.doesNotMatch(rendered, /gmailnator_session/i);
  assert.doesNotMatch(rendered, /shadow\.panel\.001@gmail\.com/i);
});
