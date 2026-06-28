import { describe, expect, it } from "vitest";
import { authEnvSchema, signInInputSchema } from "@/lib/schemas/auth";

describe("signInInputSchema", () => {
  it("accepts a valid email and password", () => {
    expect(signInInputSchema.safeParse({ email: "hr@kolo.example", password: "x" }).success).toBe(true);
  });

  it("rejects a bad email or empty password", () => {
    expect(signInInputSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(signInInputSchema.safeParse({ email: "hr@kolo.example", password: "" }).success).toBe(false);
    expect(signInInputSchema.safeParse({ password: "x" }).success).toBe(false);
  });
});

describe("authEnvSchema", () => {
  it("requires a secret of at least 32 chars", () => {
    expect(authEnvSchema.safeParse({ AUTH_JWT_SECRET: "short" }).success).toBe(false);
    expect(
      authEnvSchema.safeParse({ AUTH_JWT_SECRET: "a".repeat(32) }).success,
    ).toBe(true);
  });

  it("validates optional TTL durations", () => {
    expect(
      authEnvSchema.safeParse({ AUTH_JWT_SECRET: "a".repeat(32), AUTH_ACCESS_TTL: "15m" }).success,
    ).toBe(true);
    expect(
      authEnvSchema.safeParse({ AUTH_JWT_SECRET: "a".repeat(32), AUTH_ACCESS_TTL: "soon" }).success,
    ).toBe(false);
  });
});
