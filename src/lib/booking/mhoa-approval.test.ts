import assert from "node:assert/strict";
import test from "node:test";

import { detectMhoaApproval } from "./mhoa-approval.ts";

test("detectMhoaApproval recognizes real MHOA tennis confirmation", () => {
  const body =
    "Tennis Court Booking Confirmation. We have received your Tennis Court Booking. You will receive booking details and confirmation.";
  const result = detectMhoaApproval(body);
  assert.equal(result.mhoaApproved, true);
  assert.equal(result.mhoaRejected, false);
  assert.match(result.confirmationExcerpt, /received your Tennis Court Booking/i);
});

test("detectMhoaApproval rejects booking form nav junk (false positive guard)", () => {
  const body =
    "Skip to content About Programs Bookings Events Tennis Courts Tennis Courts & Booking Residents of Mahogany can either book a time slot using the form below";
  const result = detectMhoaApproval(body);
  assert.equal(result.mhoaApproved, false);
  assert.equal(result.mhoaRejected, false);
});

test("detectMhoaApproval detects household limit exceeded", () => {
  const body = "Number of allowed appointments exceeded.";
  const result = detectMhoaApproval(body);
  assert.equal(result.mhoaApproved, false);
  assert.equal(result.mhoaRejected, true);
  assert.match(result.rejectionReason ?? "", /exceeded/i);
});

test("detectMhoaApproval excerpt ignores nav chrome before approval phrase", () => {
  const body =
    "Skip to content About Programs Bookings Events Operations Safe-Water News Calendars Residents Member Login Search Search Home Tennis Court Booking Confirmation Tennis Court Booking Confirmation We have received your Tennis Court Booking.";
  const result = detectMhoaApproval(body);
  assert.equal(result.mhoaApproved, true);
  assert.match(result.confirmationExcerpt, /^We have received your Tennis Court Booking/i);
  assert.doesNotMatch(result.confirmationExcerpt, /Skip to content/i);
});
