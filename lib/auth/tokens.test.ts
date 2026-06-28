import { describe, expect, it } from "vitest";
import {
  durationToMs,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "@/lib/auth/tokens";

const SECRET = "test-secret-at-least-32-characters-long!!";
const OTHER_SECRET = "another-secret-at-least-32-characters-xx!";

describe("access token", () => {
  it("signs then verifies, recovering the subject", async () => {
    const token = await signAccessToken({ sub: "user_123" }, SECRET);
    const payload = await verifyAccessToken(token, SECRET);
    expect(payload).toEqual({ sub: "user_123" });
  });

  it("rejects an expired token", async () => {
    const token = await signAccessToken({ sub: "user_123" }, SECRET, new Date(Date.now() - 10_000));
    expect(await verifyAccessToken(token, SECRET)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signAccessToken({ sub: "user_123" }, OTHER_SECRET);
    expect(await verifyAccessToken(token, SECRET)).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signAccessToken({ sub: "user_123" }, SECRET);
    const [header, payload, signature] = token.split(".");
    const flipped = (payload[0] === "a" ? "b" : "a") + payload.slice(1);
    const tampered = `${header}.${flipped}.${signature}`;
    expect(await verifyAccessToken(tampered, SECRET)).toBeNull();
  });

  it("rejects a non-token string", async () => {
    expect(await verifyAccessToken("not.a.jwt", SECRET)).toBeNull();
  });
});

describe("refresh token", () => {
  it("hashing is deterministic and differs from the token", async () => {
    const { token, tokenHash } = await generateRefreshToken();
    expect(tokenHash).not.toEqual(token);
    expect(await hashRefreshToken(token)).toEqual(tokenHash);
  });

  it("generates a fresh value each call", async () => {
    const a = await generateRefreshToken();
    const b = await generateRefreshToken();
    expect(a.token).not.toEqual(b.token);
    expect(a.tokenHash).not.toEqual(b.tokenHash);
  });
});

describe("durationToMs", () => {
  it("parses unit strings", () => {
    expect(durationToMs("15m")).toBe(900_000);
    expect(durationToMs("7d")).toBe(604_800_000);
    expect(durationToMs("30s")).toBe(30_000);
    expect(durationToMs("12h")).toBe(43_200_000);
  });

  it("treats a bare number as seconds", () => {
    expect(durationToMs("45")).toBe(45_000);
    expect(durationToMs(45)).toBe(45_000);
  });

  it("throws on a malformed duration", () => {
    expect(() => durationToMs("soon")).toThrow();
  });
});
