import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, verifyPassword } from "./password.ts";

test("hashPassword and verifyPassword round-trip", () => {
  const hash = hashPassword("Alberta");
  assert.notEqual(hash, "Alberta");
  assert.equal(verifyPassword("Alberta", hash), true);
  assert.equal(verifyPassword("wrong", hash), false);
});
