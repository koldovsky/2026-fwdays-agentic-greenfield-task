import assert from "node:assert/strict";
import test from "node:test";

import {
  friendlyAvailabilityError,
  friendlyAvailabilityErrorFromUnknown,
} from "./availability-errors.ts";

test("friendlyAvailabilityError maps calendar timeout", () => {
  const raw =
    "locator.waitFor: Timeout 45000ms exceeded. waiting for getByRole('link', { name: '4', exact: true })";
  assert.match(friendlyAvailabilityError(raw), /MHOA's calendar did not respond/i);
  assert.doesNotMatch(friendlyAvailabilityError(raw), /locator\.waitFor/);
});

test("friendlyAvailabilityError maps server budget timeout", () => {
  assert.match(
    friendlyAvailabilityError("MHOA availability request timed out after 90s"),
    /too long on our server/i,
  );
});

test("friendlyAvailabilityErrorFromUnknown wraps Error", () => {
  assert.match(
    friendlyAvailabilityErrorFromUnknown(new Error("net::ERR_CONNECTION_RESET")),
    /Could not reach mahoganyhoa/i,
  );
});
