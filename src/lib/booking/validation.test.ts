import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateBookingRequest,
  validateEmail,
  validateFullName,
  validatePhone,
} from "./validation";

describe("validateEmail", () => {
  it("accepts valid email", () => {
    assert.equal(validateEmail("user@example.com"), undefined);
  });

  it("rejects malformed email", () => {
    assert.equal(validateEmail("not-an-email"), "Enter a valid email address.");
  });
});

describe("validatePhone", () => {
  it("accepts formatted North American number", () => {
    assert.equal(validatePhone("(403) 555-1234", "picnic"), undefined);
  });

  it("rejects too few digits", () => {
    assert.equal(validatePhone("12345", "tennis"), "Use a 10-digit North American phone number.");
  });
});

describe("validateFullName", () => {
  it("requires at least two characters", () => {
    assert.equal(validateFullName("A"), "Enter your first and last name.");
  });
});

describe("validateBookingRequest", () => {
  it("requires minimum length", () => {
    assert.equal(
      validateBookingRequest("short"),
      "Add a bit more detail (at least 10 characters).",
    );
  });

  it("accepts descriptive request", () => {
    assert.equal(
      validateBookingRequest("Friday 11 AM to 1 PM, any 45-min tennis slot"),
      undefined,
    );
  });
});
