// Tests for the PAYMENTS_EMULATOR_IN_PROD feature flag (prod-hotfix batch).
// Fail-safe by default: unset/empty/0/false/off keeps the payments emulator
// hard-disabled in production (unchanged regression guard); only an explicit
// 1/true/on (case-insensitive) opens it for a demo/beta/pitch environment
// (TC-STACK-06). Outside production the flag has no effect either way.
//
// Env is stubbed with vi.stubEnv (type-safe, auto-restored) rather than mutated
// directly — matches factory.test.ts and keeps `yarn typecheck` clean
// (NODE_ENV is a read-only property under the project's tsconfig). Passing
// `undefined` unstubs a var for the "unset" cases.
//
// Requirements covered: TC-STACK-06, NFR-SEC-04 (fail-safe default).

import { afterEach, describe, expect, it, vi } from "vitest";

import { getPaymentsProviderName, isPaymentsEmulatorEnabled } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// getPaymentsProviderName(): the hard prod guard, and the flag's escape hatch
// ---------------------------------------------------------------------------

describe("getPaymentsProviderName: production guard (regression, unchanged default)", () => {
  it("still throws in production when the flag is unset (default OFF)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", undefined);
    vi.stubEnv("PAYMENTS_PROVIDER", undefined);
    expect(() => getPaymentsProviderName()).toThrow(/production/);
  });

  it("still throws in production when the flag is explicitly '0'", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "0");
    expect(() => getPaymentsProviderName()).toThrow(/production/);
  });

  it("still throws in production when the flag is 'false'", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "false");
    expect(() => getPaymentsProviderName()).toThrow(/production/);
  });

  it("still throws in production when the flag is 'off'", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "off");
    expect(() => getPaymentsProviderName()).toThrow(/production/);
  });

  it("still throws in production when the flag is a rejected value ('yes')", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "yes");
    expect(() => getPaymentsProviderName()).toThrow(/production/);
  });
});

describe("getPaymentsProviderName: explicit opt-in unlocks the emulator in production", () => {
  it("returns 'emulator' when the flag is '1'", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "1");
    expect(getPaymentsProviderName()).toBe("emulator");
  });

  it("returns 'emulator' when the flag is 'true'", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "true");
    expect(getPaymentsProviderName()).toBe("emulator");
  });

  it("returns 'emulator' when the flag is 'TRUE' (case-insensitive)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "TRUE");
    expect(getPaymentsProviderName()).toBe("emulator");
  });

  it("returns 'emulator' when the flag is 'on'", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "on");
    expect(getPaymentsProviderName()).toBe("emulator");
  });

  it("returns 'emulator' when the flag is 'ON' (case-insensitive) with surrounding whitespace", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", " ON ");
    expect(getPaymentsProviderName()).toBe("emulator");
  });

  it("still throws in production when PAYMENTS_PROVIDER names an unknown adapter, even with the flag on", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "1");
    vi.stubEnv("PAYMENTS_PROVIDER", "paddle");
    expect(() => getPaymentsProviderName()).toThrow(/PAYMENTS_PROVIDER/);
  });
});

describe("getPaymentsProviderName: outside production the flag is irrelevant", () => {
  it("returns 'emulator' outside production regardless of the flag", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", undefined);
    expect(getPaymentsProviderName()).toBe("emulator");
  });

  it("returns 'emulator' in development even when the flag is explicitly off", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "0");
    expect(getPaymentsProviderName()).toBe("emulator");
  });

  it("returns 'emulator' in test env even when the flag is unset", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", undefined);
    expect(getPaymentsProviderName()).toBe("emulator");
  });
});

// ---------------------------------------------------------------------------
// isPaymentsEmulatorEnabled(): the surface gate (checkout page / complete route)
// ---------------------------------------------------------------------------

describe("isPaymentsEmulatorEnabled: production, flag OFF (default) → false", () => {
  it("returns false when the flag is unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", undefined);
    expect(isPaymentsEmulatorEnabled()).toBe(false);
  });

  it("returns false when the flag is empty string", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "");
    expect(isPaymentsEmulatorEnabled()).toBe(false);
  });

  it("returns false when the flag is '0'", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "0");
    expect(isPaymentsEmulatorEnabled()).toBe(false);
  });

  it("returns false when the flag is 'false'", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "false");
    expect(isPaymentsEmulatorEnabled()).toBe(false);
  });

  it("returns false when the flag is 'off'", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "off");
    expect(isPaymentsEmulatorEnabled()).toBe(false);
  });

  it("returns false when the flag is a rejected value ('yes')", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "yes");
    expect(isPaymentsEmulatorEnabled()).toBe(false);
  });
});

describe("isPaymentsEmulatorEnabled: production, flag ON → true", () => {
  it("returns true when the flag is '1'", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "1");
    expect(isPaymentsEmulatorEnabled()).toBe(true);
  });

  it("returns true when the flag is 'true'", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "true");
    expect(isPaymentsEmulatorEnabled()).toBe(true);
  });

  it("returns true when the flag is 'On' (mixed case)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "On");
    expect(isPaymentsEmulatorEnabled()).toBe(true);
  });

  it("still requires PAYMENTS_PROVIDER to be unset/empty/'emulator' even with the flag on", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "1");
    vi.stubEnv("PAYMENTS_PROVIDER", "paddle");
    expect(isPaymentsEmulatorEnabled()).toBe(false);
  });
});

describe("isPaymentsEmulatorEnabled: outside production, unaffected by the flag", () => {
  it("returns true outside production regardless of the flag", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", undefined);
    expect(isPaymentsEmulatorEnabled()).toBe(true);
  });

  it("returns true in development even when the flag is explicitly off", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PAYMENTS_EMULATOR_IN_PROD", "0");
    expect(isPaymentsEmulatorEnabled()).toBe(true);
  });
});
