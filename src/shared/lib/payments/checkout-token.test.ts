// Checkout-token tests: signed round-trip, tamper rejection, and the
// open-redirect guard on returnTo (FR-PAYWALL-03 return-to-screen carrier).
import { describe, expect, it } from "vitest";
import {
  createCheckoutToken,
  isSafeReturnTo,
  verifyCheckoutToken,
  type CheckoutTokenPayload,
} from "./checkout-token";

const SECRET = "test-webhook-secret";
const PAYLOAD: CheckoutTokenPayload = {
  userId: "u1",
  plan: "pro",
  returnTo: "/tailor",
  issuedAt: "2026-07-03T12:00:00.000Z",
};

describe("createCheckoutToken / verifyCheckoutToken", () => {
  it("round-trips a signed payload", () => {
    const token = createCheckoutToken(PAYLOAD, SECRET);
    expect(verifyCheckoutToken(token, SECRET)).toEqual(PAYLOAD);
  });

  it("rejects a tampered body — the plan cannot be upgraded in transit", () => {
    const token = createCheckoutToken(PAYLOAD, SECRET);
    const [body, signature] = token.split(".");
    const upgraded = Buffer.from(
      JSON.stringify({ ...PAYLOAD, plan: "job_hunt_pass" }),
      "utf8",
    ).toString("base64url");
    expect(verifyCheckoutToken(`${upgraded}.${signature}`, SECRET)).toBeNull();
    expect(body).not.toBe(upgraded);
  });

  it("rejects a token signed with a different secret", () => {
    const token = createCheckoutToken(PAYLOAD, "other-secret");
    expect(verifyCheckoutToken(token, SECRET)).toBeNull();
  });

  it("rejects malformed tokens without throwing", () => {
    expect(verifyCheckoutToken("", SECRET)).toBeNull();
    expect(verifyCheckoutToken("no-dot", SECRET)).toBeNull();
    expect(verifyCheckoutToken(".only-signature", SECRET)).toBeNull();
  });

  it("refuses to create a token with an off-site returnTo", () => {
    expect(() =>
      createCheckoutToken({ ...PAYLOAD, returnTo: "https://evil.example" }, SECRET),
    ).toThrow(/site-relative/);
    expect(() => createCheckoutToken({ ...PAYLOAD, returnTo: "//evil.example" }, SECRET)).toThrow(
      /site-relative/,
    );
  });
});

describe("isSafeReturnTo", () => {
  it("accepts site-relative paths and rejects absolute or protocol-relative urls", () => {
    expect(isSafeReturnTo("/tailor")).toBe(true);
    expect(isSafeReturnTo("/tailor?run=1#result")).toBe(true);
    expect(isSafeReturnTo("https://evil.example")).toBe(false);
    expect(isSafeReturnTo("//evil.example")).toBe(false);
    expect(isSafeReturnTo("/\\evil.example")).toBe(false);
    expect(isSafeReturnTo("")).toBe(false);
  });
});
