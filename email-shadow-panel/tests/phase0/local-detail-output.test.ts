import assert from "node:assert/strict";
import test from "node:test";

import {
  applyResponseCookies,
  createEmptyCookieJar,
  serializeCookieJar,
} from "../../server/providers/emailnator/cookies.server.ts";
import { sealSessionCapsule } from "../../server/providers/emailnator/capsule.server.ts";
import { createEmptyProviderState } from "../../server/providers/emailnator/provider.server.ts";
import {
  restoreStateFromCapsule,
  runLocalDetailAction,
} from "../../server/providers/emailnator/phase0.server.ts";
import {
  PHASE0_CAPSULE_TTL_MS,
  phase0MessageIdSchema,
} from "../../server/providers/emailnator/schemas.server.ts";
import {
  formatListMessageLines,
  formatLocalDetailEvidenceLines,
  resolveLocalMessageSelection,
} from "../../scripts/emailnator-probe.ts";
import { readFixture, responseFromFixture } from "./test-helpers.ts";

const ENV = {
  PHASE0_SESSION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
};

const OPAQUE_ID_ONE = "provider:id/001?part=alpha+beta";
const OPAQUE_ID_TWO = "provider.id/002=mailbox%2Fview";
const OVERLONG_ID = "x".repeat(201);
const CONTROL_CHARACTER_ID = `bad${String.fromCharCode(0x1f)}id`;
const NULL_BYTE_ID = `bad${String.fromCharCode(0)}id`;

async function createCapsule(options?: {
  address?: string;
  lastListedMessageIds?: string[];
}): Promise<string> {
  const jar = createEmptyCookieJar();
  const headers = new Headers();
  headers.append("set-cookie", "XSRF-TOKEN=redacted-xsrf-value; Path=/");
  headers.append("set-cookie", "gmailnator_session=redacted-session-value; Path=/; HttpOnly");
  await applyResponseCookies(jar, headers, "https://www.emailnator.com/");

  const now = new Date();
  const state = {
    ...createEmptyProviderState(),
    address: options?.address ?? "shadow.panel.001@gmail.com",
    cookieJar: serializeCookieJar(jar),
    observedCookieNames: ["XSRF-TOKEN", "gmailnator_session"],
    lastListedMessageIds: options?.lastListedMessageIds ?? [],
    lastUsedAt: now.toISOString(),
  };

  return sealSessionCapsule(state, ENV.PHASE0_SESSION_KEY, {
    now,
    ttlMs: PHASE0_CAPSULE_TTL_MS,
  });
}

test("phase0MessageIdSchema accepts realistic opaque ids and rejects empty, overlong, and control-character values", () => {
  assert.equal(phase0MessageIdSchema.safeParse(OPAQUE_ID_ONE).success, true);
  assert.equal(phase0MessageIdSchema.safeParse(OPAQUE_ID_TWO).success, true);
  assert.equal(phase0MessageIdSchema.safeParse("").success, false);
  assert.equal(phase0MessageIdSchema.safeParse(OVERLONG_ID).success, false);
  assert.equal(phase0MessageIdSchema.safeParse(CONTROL_CHARACTER_ID).success, false);
  assert.equal(phase0MessageIdSchema.safeParse(NULL_BYTE_ID).success, false);
});

test("formatListMessageLines provides safe numeric selection without raw provider ids", () => {
  const lines = formatListMessageLines([
    {
      messageId: OPAQUE_ID_ONE,
      time: "2026-07-05 18:00",
      fromPreview: "Verification Robot",
      subjectPreview: "Shadow Panel Phase 0",
    },
    {
      messageId: OPAQUE_ID_TWO,
      time: "2026-07-05 18:05",
      fromPreview: "Example Service",
      subjectPreview: "Welcome aboard",
    },
  ]);

  assert.deepEqual(lines, [
    "[1] 2026-07-05 18:00 | Verification Robot | Shadow Panel Phase 0",
    "[2] 2026-07-05 18:05 | Example Service | Welcome aboard",
  ]);

  const rendered = lines.join("\n");
  assert.equal(rendered.includes(OPAQUE_ID_ONE), false);
  assert.equal(rendered.includes(OPAQUE_ID_TWO), false);
  assert.doesNotMatch(rendered, /482731/);
  assert.doesNotMatch(rendered, /<strong>/i);
  assert.match(rendered, /^\[1\]/m);
  assert.match(rendered, /^\[2\]/m);
});

test("resolveLocalMessageSelection preserves exact opaque ids and rejects invalid input", async () => {
  const capsule = await createCapsule({ lastListedMessageIds: [OPAQUE_ID_ONE, OPAQUE_ID_TWO] });
  const emptyCapsule = await createCapsule();

  assert.equal(resolveLocalMessageSelection(["--index=2"], capsule, ENV), OPAQUE_ID_TWO);
  assert.equal(
    resolveLocalMessageSelection([`--messageId=${OPAQUE_ID_ONE}`], capsule, ENV),
    OPAQUE_ID_ONE,
  );

  assert.throws(
    () => resolveLocalMessageSelection(["--index=0"], capsule, ENV),
    /positive integer/,
  );
  assert.throws(() => resolveLocalMessageSelection(["--index=3"], capsule, ENV), /out of range/);
  assert.throws(
    () => resolveLocalMessageSelection([`--index=1`, `--messageId=${OPAQUE_ID_ONE}`], capsule, ENV),
    /exactly one selector/,
  );
  assert.throws(
    () => resolveLocalMessageSelection(["--index=1"], emptyCapsule, ENV),
    /Run list first/,
  );
  assert.throws(
    () => resolveLocalMessageSelection(["--messageId="], capsule, ENV),
    (error: unknown) => error instanceof Error && /character/.test(error.message),
  );
  assert.throws(
    () => resolveLocalMessageSelection([`--messageId=${OVERLONG_ID}`], capsule, ENV),
    (error: unknown) => error instanceof Error && /200 character/.test(error.message),
  );
  assert.throws(
    () => resolveLocalMessageSelection([`--messageId=${CONTROL_CHARACTER_ID}`], capsule, ENV),
    /ASCII control characters/,
  );
  assert.throws(
    () => resolveLocalMessageSelection([`--messageId=${NULL_BYTE_ID}`], capsule, ENV),
    /ASCII control characters/,
  );
});

test("runLocalDetailAction returns structural evidence only and reseals state", async () => {
  const originalCapsule = await createCapsule({ lastListedMessageIds: [OPAQUE_ID_ONE] });
  const now = new Date("2026-07-05T12:10:00.000Z");

  const result = await runLocalDetailAction(originalCapsule, OPAQUE_ID_ONE, ENV, {
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

  const serialized = JSON.stringify(result.detail);
  assert.equal(serialized.includes(OPAQUE_ID_ONE), false);
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
  assert.equal(rendered.includes(OPAQUE_ID_ONE), false);
  assert.equal(rendered.includes(OPAQUE_ID_TWO), false);
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
