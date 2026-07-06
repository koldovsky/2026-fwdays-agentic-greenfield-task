import assert from "node:assert/strict";
import test from "node:test";

import { z } from "zod";

import { createEncryptionService } from "../../server/session/encryption.server.ts";
import { DomainError } from "../../server/session/errors.server.ts";
import {
  createAnonymousSessionState,
  createDeterministicRandomBytes,
  TEST_SESSION_ENCRYPTION_KEY,
} from "./test-helpers.ts";

test("session-state encryption round-trips through the reusable production service", () => {
  const encryption = createEncryptionService({
    key: TEST_SESSION_ENCRYPTION_KEY,
    randomBytesImpl: createDeterministicRandomBytes(),
  });
  const state = createAnonymousSessionState();
  const ciphertext = encryption.encrypt(state);
  const restored = encryption.decrypt(ciphertext, z.any());

  assert.deepEqual(restored, state);
});

test("session-state encryption uses fresh ciphertext for identical plaintext", () => {
  const encryption = createEncryptionService({
    key: TEST_SESSION_ENCRYPTION_KEY,
    randomBytesImpl: createDeterministicRandomBytes(),
  });
  const state = createAnonymousSessionState();

  const first = encryption.encrypt(state);
  const second = encryption.encrypt(state);

  assert.notEqual(first, second);
  assert.doesNotMatch(first, /shadow\.panel\.001@gmail\.com/u);
});

test("session-state encryption rejects tampered ciphertext, wrong keys, and unsupported versions", () => {
  const encryption = createEncryptionService({
    key: TEST_SESSION_ENCRYPTION_KEY,
    randomBytesImpl: createDeterministicRandomBytes(),
  });
  const otherEncryption = createEncryptionService({
    key: Buffer.alloc(32, 99).toString("base64url"),
    randomBytesImpl: createDeterministicRandomBytes(90),
  });
  const ciphertext = encryption.encrypt(createAnonymousSessionState());
  const [version, ivPart, cipherPart, tagPart] = ciphertext.split(".");
  const tag = Buffer.from(tagPart, "base64url");
  tag[0] = tag[0] ^ 0x01;
  const tampered = [version, ivPart, cipherPart, tag.toString("base64url")].join(".");
  const wrongVersion = ["es9", ivPart, cipherPart, tagPart].join(".");

  for (const candidate of [tampered, wrongVersion]) {
    assert.throws(
      () => encryption.decrypt(candidate, z.any()),
      (error: unknown) => error instanceof DomainError && error.code === "ENCRYPTION_FAILURE",
    );
  }

  assert.throws(
    () => otherEncryption.decrypt(ciphertext, z.any()),
    (error: unknown) => error instanceof DomainError && error.code === "ENCRYPTION_FAILURE",
  );
});
