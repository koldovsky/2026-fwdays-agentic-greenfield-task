import assert from "node:assert/strict";
import test from "node:test";

import {
  openSessionCapsule,
  sealSessionCapsule,
} from "../../server/providers/emailnator/capsule.server.ts";
import { createEmptyProviderState } from "../../server/providers/emailnator/provider.server.ts";

test("sealed capsules decrypt and round-trip state", () => {
  const state = { ...createEmptyProviderState(), address: "shadow.panel.001@gmail.com" };
  const secret = "phase0-test-secret";
  const capsule = sealSessionCapsule(state, secret, { now: new Date("2026-07-05T12:00:00.000Z") });

  const restored = openSessionCapsule(capsule, secret, {
    now: new Date("2026-07-05T12:05:00.000Z"),
  });

  assert.equal(restored.address, state.address);
  assert.deepEqual(restored.observedCookieNames, state.observedCookieNames);
});

test("sealed capsules use a unique nonce for each encryption", () => {
  const state = createEmptyProviderState();
  const secret = "phase0-test-secret";

  const first = sealSessionCapsule(state, secret, { now: new Date("2026-07-05T12:00:00.000Z") });
  const second = sealSessionCapsule(state, secret, { now: new Date("2026-07-05T12:00:00.000Z") });

  assert.notEqual(first, second);
});

test("tampered capsules are rejected", () => {
  const state = createEmptyProviderState();
  const secret = "phase0-test-secret";
  const capsule = sealSessionCapsule(state, secret);
  const tampered = `${capsule.slice(0, -1)}${capsule.endsWith("A") ? "B" : "A"}`;

  assert.throws(() => openSessionCapsule(tampered, secret), /Invalid session capsule/);
});

test("expired and malformed capsules are rejected", () => {
  const state = createEmptyProviderState();
  const secret = "phase0-test-secret";
  const capsule = sealSessionCapsule(state, secret, {
    now: new Date("2026-07-05T12:00:00.000Z"),
    ttlMs: 1000,
  });

  assert.throws(
    () => openSessionCapsule(capsule, secret, { now: new Date("2026-07-05T12:00:02.000Z") }),
    /expired/,
  );
  assert.throws(() => openSessionCapsule("bad.capsule", secret), /Malformed session capsule/);
});
