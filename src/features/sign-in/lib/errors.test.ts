// Error-code mapping (FR-AUTH-01): server codes normalize to known auth
// errors, unknown/garbage codes fall back to the calm generic message, and
// every code resolves to distinct localized copy in both locales.
import { describe, expect, it } from "vitest";

import { en, uk } from "@/shared/lib/i18n";

import { authErrorMessage, toAuthErrorCode, type AuthErrorCode } from "./errors";

describe("toAuthErrorCode", () => {
  it("passes known server codes through", () => {
    expect(toAuthErrorCode("email_taken")).toBe("email_taken");
    expect(toAuthErrorCode("invalid_email")).toBe("invalid_email");
    expect(toAuthErrorCode("weak_password")).toBe("weak_password");
    expect(toAuthErrorCode("invalid_credentials")).toBe("invalid_credentials");
  });

  it("normalizes unknown values to generic", () => {
    expect(toAuthErrorCode("invalid_body")).toBe("generic");
    expect(toAuthErrorCode(undefined)).toBe("generic");
    expect(toAuthErrorCode(null)).toBe("generic");
    expect(toAuthErrorCode(42)).toBe("generic");
  });
});

describe("authErrorMessage", () => {
  const codes: readonly AuthErrorCode[] = [
    "invalid_credentials",
    "email_taken",
    "invalid_email",
    "weak_password",
    "generic",
  ];

  it("resolves non-empty copy for every code in both locales", () => {
    for (const dictionary of [uk, en]) {
      for (const code of codes) {
        expect(authErrorMessage(dictionary, code).length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the sign-in failure message generic (no account enumeration)", () => {
    // One message for wrong-password and unknown-email alike.
    expect(authErrorMessage(uk, "invalid_credentials")).toBe(uk.auth.error.invalidCredentials);
  });
});
