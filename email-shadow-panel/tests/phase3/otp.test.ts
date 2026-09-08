import assert from "node:assert/strict";
import test from "node:test";

import { detectCode } from "../../src/lib/codeDetection.ts";

test("otp detection finds common numeric and alphanumeric verification codes deterministically", () => {
  assert.equal(detectCode("Your verification code is 482731."), "482731");
  assert.equal(detectCode("Use code 4827 to continue."), "4827");
  assert.equal(detectCode("Security code: 48273155"), "48273155");
  assert.equal(detectCode("Verification code ABC123 is ready."), "ABC123");
  assert.equal(detectCode("Your one-time code is 481-902."), "481-902");
});

test("otp detection avoids dates, times, phone-like values, long ids, and no-code content", () => {
  assert.equal(detectCode("Meeting starts at 12:30 on 2026-07-06."), null);
  assert.equal(detectCode("Call us on +15551234567 for support."), null);
  assert.equal(detectCode("Order id 998877665544332211 should be tracked."), null);
  assert.equal(detectCode("Welcome aboard. No verification code is required."), null);
});
