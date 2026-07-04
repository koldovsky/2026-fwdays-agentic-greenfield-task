import assert from "node:assert/strict";
import test from "node:test";

import { expiresAtForSlot, isBookingExpired } from "./expiry.ts";

test("expiresAtForSlot ends at slot finish time", () => {
  const expires = expiresAtForSlot("2026-07-11", "9:00 AM-9:45 AM");
  assert.equal(expires.getFullYear(), 2026);
  assert.equal(expires.getMonth(), 6);
  assert.equal(expires.getDate(), 11);
  assert.equal(expires.getHours(), 9);
  assert.equal(expires.getMinutes(), 45);
});

test("isBookingExpired after slot end", () => {
  const expiresAt = expiresAtForSlot("2026-07-11", "9:00 AM-9:45 AM").toISOString();
  const after = new Date(2026, 6, 11, 10, 0, 0);
  assert.equal(isBookingExpired({ expiresAt }, after), true);
  const before = new Date(2026, 6, 11, 9, 30, 0);
  assert.equal(isBookingExpired({ expiresAt }, before), false);
});
