// Tests for the COVERAGE_JUDGE feature flag (improve-tailoring-quality T5 §2.1).
// Pure env-accessor tests: OFF by default, fail-closed, non-throwing, degrades
// gracefully when ANTHROPIC_API_KEY is absent even if flag is ON.
//
// Requirements covered: FR-CHECKLIST-01, NFR-OBS-01.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isCoverageJudgeEnabled } from "./env";

// Capture and restore original env values so each test is isolated.
let savedJudge: string | undefined;
let savedKey: string | undefined;

beforeEach(() => {
  savedJudge = process.env.COVERAGE_JUDGE;
  savedKey = process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  if (savedJudge === undefined) {
    delete process.env.COVERAGE_JUDGE;
  } else {
    process.env.COVERAGE_JUDGE = savedJudge;
  }
  if (savedKey === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = savedKey;
  }
});

// ---------------------------------------------------------------------------
// FLAG OFF (default / fail-closed)
// ---------------------------------------------------------------------------

describe("isCoverageJudgeEnabled: OFF cases (§2.1, NFR-OBS-01)", () => {
  it("returns false when COVERAGE_JUDGE is unset", () => {
    delete process.env.COVERAGE_JUDGE;
    delete process.env.ANTHROPIC_API_KEY;
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is empty string", () => {
    process.env.COVERAGE_JUDGE = "";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is '0'", () => {
    process.env.COVERAGE_JUDGE = "0";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is 'false'", () => {
    process.env.COVERAGE_JUDGE = "false";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is 'off' (case-insensitive)", () => {
    process.env.COVERAGE_JUDGE = "off";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is 'OFF'", () => {
    process.env.COVERAGE_JUDGE = "OFF";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is a typo / unrecognized string", () => {
    process.env.COVERAGE_JUDGE = "yes";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FLAG ON: requires both COVERAGE_JUDGE=on/true/1 AND ANTHROPIC_API_KEY
// ---------------------------------------------------------------------------

describe("isCoverageJudgeEnabled: ON cases (§2.1)", () => {
  it("returns true when COVERAGE_JUDGE='1' and ANTHROPIC_API_KEY is present", () => {
    process.env.COVERAGE_JUDGE = "1";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE='true' (case-insensitive) and key present", () => {
    process.env.COVERAGE_JUDGE = "true";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE='TRUE' and key present", () => {
    process.env.COVERAGE_JUDGE = "TRUE";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE='on' and key present", () => {
    process.env.COVERAGE_JUDGE = "on";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE='ON' and key present", () => {
    process.env.COVERAGE_JUDGE = "ON";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DEGRADE TO OFF when flag is on but ANTHROPIC_API_KEY absent (NFR-OBS-01)
// ---------------------------------------------------------------------------

describe("isCoverageJudgeEnabled: degrades to OFF when key absent (§2.1, NFR-OBS-01)", () => {
  it("flag='1', key unset → false (never throw)", () => {
    process.env.COVERAGE_JUDGE = "1";
    delete process.env.ANTHROPIC_API_KEY;
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("flag='true', key='' → false", () => {
    process.env.COVERAGE_JUDGE = "true";
    process.env.ANTHROPIC_API_KEY = "";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("flag='on', key unset → false", () => {
    process.env.COVERAGE_JUDGE = "on";
    delete process.env.ANTHROPIC_API_KEY;
    expect(isCoverageJudgeEnabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NON-THROWING contract: must never throw under ANY input (NFR-OBS-01)
// ---------------------------------------------------------------------------

describe("isCoverageJudgeEnabled: non-throwing under all inputs (NFR-OBS-01)", () => {
  it("never throws regardless of env state", () => {
    const flagValues = ["1", "0", "true", "false", "on", "off", "ON", "TRUE", "", "garbage", undefined];
    const keyValues = ["sk-test", "", undefined];

    for (const flag of flagValues) {
      for (const key of keyValues) {
        if (flag === undefined) {
          delete process.env.COVERAGE_JUDGE;
        } else {
          process.env.COVERAGE_JUDGE = flag;
        }
        if (key === undefined) {
          delete process.env.ANTHROPIC_API_KEY;
        } else {
          process.env.ANTHROPIC_API_KEY = key;
        }
        expect(() => isCoverageJudgeEnabled()).not.toThrow();
      }
    }
  });

  it("always returns a boolean", () => {
    const values = ["1", "true", "on", "0", "false", "off", "", "garbage"];
    for (const flag of values) {
      process.env.COVERAGE_JUDGE = flag;
      process.env.ANTHROPIC_API_KEY = "sk-test-key";
      const result = isCoverageJudgeEnabled();
      expect(typeof result).toBe("boolean");
    }
  });
});
