// Salted-scrypt password hashing (FR-AUTH-01, NFR-SEC): round-trip, salt
// uniqueness, wrong-password + malformed-envelope rejection, no plaintext leak.
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

const password = "correct horse battery staple";

describe("hashPassword", () => {
  it("produces a self-describing scrypt envelope", async () => {
    expect(await hashPassword(password)).toMatch(/^scrypt\$16384\$8\$1\$/);
  });

  it("never contains the plaintext", async () => {
    expect(await hashPassword(password)).not.toContain(password);
  });

  it("uses a fresh salt each call", async () => {
    expect(await hashPassword(password)).not.toBe(await hashPassword(password));
  });
});

describe("verifyPassword", () => {
  it("accepts the correct password", async () => {
    const stored = await hashPassword(password);
    expect(await verifyPassword(password, stored)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword(password);
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("rejects a malformed envelope without throwing", async () => {
    expect(await verifyPassword(password, "not-a-hash")).toBe(false);
    expect(await verifyPassword(password, "scrypt$16384$8$1$onlyfive")).toBe(false);
    expect(await verifyPassword(password, "bcrypt$16384$8$1$aa$bb")).toBe(false);
  });
});
