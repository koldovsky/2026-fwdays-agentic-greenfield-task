import assert from "node:assert/strict";
import test from "node:test";

import { createVisitorHashService } from "../../server/session/visitor-hash.server.ts";
import { DomainError } from "../../server/session/errors.server.ts";
import { TEST_VISITOR_HASH_KEY } from "./test-helpers.ts";

test("visitor hashing is stable for the same input and key", () => {
  const hasher = createVisitorHashService({ key: TEST_VISITOR_HASH_KEY });
  const first = hasher.hashVisitorIdentifier("opaque-visitor-id");
  const second = hasher.hashVisitorIdentifier("opaque-visitor-id");

  assert.equal(first, second);
  assert.match(first, /^[A-Za-z0-9_-]{43}$/u);
});

test("visitor hashing distinguishes different inputs", () => {
  const hasher = createVisitorHashService({ key: TEST_VISITOR_HASH_KEY });
  assert.notEqual(
    hasher.hashVisitorIdentifier("visitor-one"),
    hasher.hashVisitorIdentifier("visitor-two"),
  );
});

test("visitor hashing fails safely on invalid configuration", () => {
  assert.throws(
    () => createVisitorHashService({ key: "not-a-32-byte-secret" }),
    (error: unknown) => error instanceof DomainError && error.code === "CONFIGURATION_INVALID",
  );
});
