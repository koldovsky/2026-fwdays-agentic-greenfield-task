// AES-256-GCM crypto core (NFR-SEC-01): round-trip, IV randomness, tamper +
// wrong-key rejection, key parsing, and env-key resolution.
import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  CryptoError,
  decryptString,
  encryptString,
  getCvEncryptionKey,
  normalizeKey,
  resetCvEncryptionKeyCache,
} from "./index";

const key = randomBytes(32);
const other = randomBytes(32);
const sample = "Senior React Native engineer — 7 років досвіду"; // unicode round-trip

describe("encrypt/decrypt round-trip", () => {
  it("recovers the original plaintext", () => {
    expect(decryptString(encryptString(sample, key), key)).toBe(sample);
  });

  it("handles empty strings", () => {
    expect(decryptString(encryptString("", key), key)).toBe("");
  });

  it("produces a versioned envelope", () => {
    expect(encryptString(sample, key)).toMatch(/^v1:/);
  });

  it("uses a fresh IV each call (distinct ciphertext for same input)", () => {
    expect(encryptString(sample, key)).not.toBe(encryptString(sample, key));
  });

  it("never emits the plaintext in the envelope", () => {
    expect(encryptString(sample, key)).not.toContain("React");
  });
});

describe("integrity + confidentiality", () => {
  it("rejects the wrong key", () => {
    const env = encryptString(sample, key);
    expect(() => decryptString(env, other)).toThrow(CryptoError);
  });

  it("rejects a tampered ciphertext", () => {
    const env = encryptString(sample, key);
    const raw = Buffer.from(env.slice(3), "base64");
    raw[raw.length - 1] ^= 0xff; // flip a bit in the ciphertext
    const tampered = `v1:${raw.toString("base64")}`;
    expect(() => decryptString(tampered, key)).toThrow(CryptoError);
  });

  it("rejects an unknown version prefix", () => {
    const env = encryptString(sample, key);
    expect(() => decryptString(env.replace(/^v1:/, "v2:"), key)).toThrow(/version/);
  });

  it("rejects a malformed envelope", () => {
    expect(() => decryptString("not-base64-no-prefix", key)).toThrow(CryptoError);
  });

  it("rejects a wrong-size key", () => {
    expect(() => encryptString(sample, randomBytes(16))).toThrow(/32 bytes/);
  });
});

describe("normalizeKey", () => {
  it("accepts 64 hex chars", () => {
    expect(normalizeKey("a".repeat(64))).toHaveLength(32);
  });

  it("accepts base64 that decodes to 32 bytes", () => {
    expect(normalizeKey(randomBytes(32).toString("base64"))).toHaveLength(32);
  });

  it("rejects a key of the wrong length", () => {
    expect(() => normalizeKey("deadbeef")).toThrow(CryptoError);
  });
});

describe("getCvEncryptionKey", () => {
  afterEach(() => {
    delete process.env.CV_ENCRYPTION_KEY;
    resetCvEncryptionKeyCache();
  });

  it("resolves and caches the env key", () => {
    process.env.CV_ENCRYPTION_KEY = "b".repeat(64);
    expect(getCvEncryptionKey()).toHaveLength(32);
    // Round-trips against the cached key.
    const k = getCvEncryptionKey();
    expect(decryptString(encryptString(sample, k), k)).toBe(sample);
  });

  it("throws when unset", () => {
    resetCvEncryptionKeyCache();
    expect(() => getCvEncryptionKey()).toThrow(/CV_ENCRYPTION_KEY/);
  });
});
