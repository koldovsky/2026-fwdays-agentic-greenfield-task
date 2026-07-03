// Webhook signature seam tests (task 1.3): accept the genuine signature,
// reject everything else — tampered payload, wrong secret, malformed or
// truncated signatures — without ever throwing.
import { describe, expect, it } from "vitest";
import { signPayload, verifySignature } from "./signature";

const SECRET = "test-webhook-secret";
const PAYLOAD = '{"id":"evt_1","type":"checkout.completed"}';

describe("signPayload / verifySignature", () => {
  it("accepts the signature produced for the exact payload and secret", () => {
    const signature = signPayload(PAYLOAD, SECRET);
    expect(verifySignature(PAYLOAD, signature, SECRET)).toBe(true);
  });

  it("is deterministic for the same payload and secret", () => {
    expect(signPayload(PAYLOAD, SECRET)).toBe(signPayload(PAYLOAD, SECRET));
  });

  it("rejects a tampered payload", () => {
    const signature = signPayload(PAYLOAD, SECRET);
    expect(verifySignature(`${PAYLOAD} `, signature, SECRET)).toBe(false);
  });

  it("rejects a signature made with a different secret", () => {
    const signature = signPayload(PAYLOAD, "other-secret");
    expect(verifySignature(PAYLOAD, signature, SECRET)).toBe(false);
  });

  it("rejects empty, malformed, and wrong-length signatures without throwing", () => {
    expect(verifySignature(PAYLOAD, "", SECRET)).toBe(false);
    expect(verifySignature(PAYLOAD, "not-hex-at-all", SECRET)).toBe(false);
    expect(verifySignature(PAYLOAD, "deadbeef", SECRET)).toBe(false);
  });

  it("rejects everything when the secret is empty", () => {
    const signature = signPayload(PAYLOAD, SECRET);
    expect(verifySignature(PAYLOAD, signature, "")).toBe(false);
  });
});
