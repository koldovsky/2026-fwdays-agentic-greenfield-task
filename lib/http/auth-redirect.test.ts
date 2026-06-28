// @trace FR-SHELL-03
import { describe, expect, it } from "vitest";
import { shouldRedirectToSignIn, signInRedirectPath } from "@/lib/http/auth-redirect";

describe("shouldRedirectToSignIn", () => {
  it("is true for 401", () => {
    expect(shouldRedirectToSignIn(401)).toBe(true);
  });

  it("is true for 403", () => {
    expect(shouldRedirectToSignIn(403)).toBe(true);
  });

  it("is false for 200", () => {
    expect(shouldRedirectToSignIn(200)).toBe(false);
  });

  it("is false for 500", () => {
    expect(shouldRedirectToSignIn(500)).toBe(false);
  });
});

describe("signInRedirectPath", () => {
  it("encodes the current path and query into the next parameter", () => {
    expect(signInRedirectPath("/cycles/abc?tab=open")).toBe(
      "/sign-in?next=" + encodeURIComponent("/cycles/abc?tab=open"),
    );
  });

  it("encodes a plain path", () => {
    expect(signInRedirectPath("/employees")).toBe("/sign-in?next=%2Femployees");
  });
});
