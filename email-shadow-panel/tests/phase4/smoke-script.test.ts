import assert from "node:assert/strict";
import test from "node:test";

import {
  PHASE4_LIST_ATTEMPTS,
  PHASE4_LIST_WAIT_MS,
  PHASE4_MANUAL_CONFIRMATION,
  PHASE4_REQUEST_TIMEOUT_MS,
  normalizeSmokeBaseUrl,
  __testables as smokeTestables,
} from "../../scripts/phase4-smoke.ts";

const SENSITIVE_VALUES = {
  capabilityToken: "cap_abcdefghijklmnopqrstuvwxyz0123456789ABCDE",
  cookieValue: "esp_anon_v1=abcdefghijklmnopqrstuvwxyz0123456789ABCDE",
  authorizationHeader: "Bearer abcdefghijklmnopqrstuvwxyz0123456789ABCDE",
  providerMessageId: "provider-msg-001",
};

test("smoke base-url validation rejects unsafe inputs and accepts local or HTTPS roots only", () => {
  assert.equal(PHASE4_MANUAL_CONFIRMATION, "SEND");
  assert.equal(PHASE4_REQUEST_TIMEOUT_MS, 12_000);
  assert.equal(PHASE4_LIST_ATTEMPTS, 4);
  assert.deepEqual(PHASE4_LIST_WAIT_MS, [0, 2_000, 5_000, 10_000]);

  assert.equal(
    normalizeSmokeBaseUrl("https://preview.example.com/").href,
    "https://preview.example.com/",
  );
  assert.equal(normalizeSmokeBaseUrl("http://localhost:3000/").href, "http://localhost:3000/");
  assert.equal(normalizeSmokeBaseUrl("http://127.0.0.1:3000/").href, "http://127.0.0.1:3000/");

  assert.throws(
    () => normalizeSmokeBaseUrl("http://preview.example.com/"),
    /HTTPS outside localhost/u,
  );
  assert.throws(
    () => normalizeSmokeBaseUrl("https://user:pass@example.com/"),
    /must not include credentials/u,
  );
  assert.throws(
    () => normalizeSmokeBaseUrl("https://preview.example.com/path"),
    /application root/u,
  );
  assert.throws(() => normalizeSmokeBaseUrl("not-a-url"), /Base URL is invalid/u);
});

test("smoke summary output stays sanitized and omits capability, cookie, header, and provider identifiers", () => {
  const lines = smokeTestables.formatSummary({
    baseUrl: "https://preview.example.com",
    healthStatus: "ok",
    messageCount: 1,
    detailContentType: "text/plain",
    detailBodyLength: 128,
    detailMarkerFound: true,
    deleteStatus: 204,
    postDeleteCode: "SESSION_NOT_FOUND",
    ...SENSITIVE_VALUES,
  } as never);

  const joined = lines.join("\n");
  assert.match(joined, /PHASE 4 SMOKE: PASS/u);
  assert.doesNotMatch(joined, /cap_[A-Za-z0-9]+/u);
  assert.doesNotMatch(joined, /esp_anon_v1=[A-Za-z0-9]+/u);
  assert.doesNotMatch(joined, /Bearer\s+[A-Za-z0-9]+/u);
  assert.doesNotMatch(joined, /provider-msg-001/u);
});

test("smoke failure output is short and does not include raw responses", () => {
  const lines = smokeTestables.formatFailure(new Error("unexpected raw-response body"));
  assert.equal(lines[0], "PHASE 4 SMOKE: FAIL");
  assert.match(lines[1], /unexpected raw-response body/u);
  assert.ok(lines.length <= 2);
});
