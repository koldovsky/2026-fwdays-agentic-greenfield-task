import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("verifies a correct password", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(verifyPassword("Trodor!", hash)).toBe(false);
  });

  it("uses a fresh salt, so the same password hashes differently", () => {
    expect(hashPassword("same")).not.toEqual(hashPassword("same"));
  });

  it("returns false for a malformed hash instead of throwing", () => {
    expect(verifyPassword("anything", "not-a-hash")).toBe(false);
    expect(verifyPassword("anything", "scrypt$bad")).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });

  it("produces the documented scrypt$N$r$p$salt$hash shape", () => {
    const parts = hashPassword("x").split("$");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("scrypt");
  });
});
