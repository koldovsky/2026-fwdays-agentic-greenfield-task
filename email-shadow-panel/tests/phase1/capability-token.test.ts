import assert from "node:assert/strict";
import test from "node:test";

import {
  capabilityTokenHashMatches,
  generateCapabilityToken,
  hashCapabilityToken,
  validateCapabilityToken,
  validateAndHashCapabilityToken,
} from "../../server/session/capability-token.server.ts";
import { DomainError } from "../../server/session/errors.server.ts";
import { createDeterministicRandomBytes } from "./test-helpers.ts";

test("capability tokens are URL-safe and generated from secure random bytes", () => {
  const token = generateCapabilityToken(createDeterministicRandomBytes());
  assert.match(token, /^[A-Za-z0-9_-]+$/u);
  assert.equal(token.length, 43);
});

test("capability token hashing is stable and distinguishes different tokens", () => {
  const first = generateCapabilityToken(createDeterministicRandomBytes(10));
  const second = generateCapabilityToken(createDeterministicRandomBytes(20));

  assert.equal(hashCapabilityToken(first), validateAndHashCapabilityToken(first));
  assert.notEqual(hashCapabilityToken(first), hashCapabilityToken(second));
  assert.equal(capabilityTokenHashMatches(first, hashCapabilityToken(first)), true);
});

test("malformed capability tokens are rejected safely", () => {
  for (const candidate of ["short", "contains space", "contains/slash"]) {
    assert.throws(
      () => validateCapabilityToken(candidate),
      (error: unknown) => error instanceof DomainError && error.code === "INVALID_CAPABILITY",
    );
  }
});
