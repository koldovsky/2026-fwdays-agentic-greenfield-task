// Tests for the COVERAGE_JUDGE feature flag (improve-tailoring-quality T5 §2.1).
// Pure env-accessor tests: DEFAULT ON (2026-07-08), explicit opt-out respected,
// fail-closed when ANTHROPIC_API_KEY is absent, non-throwing under all inputs.
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
// DEFAULT ON: unset / empty / non-opt-out values → true (when key present)
// ---------------------------------------------------------------------------

describe("isCoverageJudgeEnabled: default-ON cases (§2.1, default ON 2026-07-08)", () => {
  it("returns true when COVERAGE_JUDGE is unset and ANTHROPIC_API_KEY is present", () => {
    delete process.env.COVERAGE_JUDGE;
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE is empty string and ANTHROPIC_API_KEY is present", () => {
    process.env.COVERAGE_JUDGE = "";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE is '1' and ANTHROPIC_API_KEY is present", () => {
    process.env.COVERAGE_JUDGE = "1";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE is 'true' and ANTHROPIC_API_KEY is present", () => {
    process.env.COVERAGE_JUDGE = "true";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE is 'TRUE' (case-insensitive) and key present", () => {
    process.env.COVERAGE_JUDGE = "TRUE";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE is 'on' and ANTHROPIC_API_KEY is present", () => {
    process.env.COVERAGE_JUDGE = "on";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE is 'ON' (case-insensitive) and key present", () => {
    process.env.COVERAGE_JUDGE = "ON";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE is a typo/unrecognized value ('maybe') and key present", () => {
    process.env.COVERAGE_JUDGE = "maybe";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });

  it("returns true when COVERAGE_JUDGE is 'yes' (unrecognized) and key present", () => {
    process.env.COVERAGE_JUDGE = "yes";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// EXPLICIT OPT-OUT: 0 / false / off (case-insensitive, whitespace-trimmed) → false
// even when ANTHROPIC_API_KEY is present
// ---------------------------------------------------------------------------

describe("isCoverageJudgeEnabled: explicit opt-out cases (§2.1)", () => {
  it("returns false when COVERAGE_JUDGE is '0' even with key present", () => {
    process.env.COVERAGE_JUDGE = "0";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is 'false' even with key present", () => {
    process.env.COVERAGE_JUDGE = "false";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is 'False' (mixed case) even with key present", () => {
    process.env.COVERAGE_JUDGE = "False";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is 'off' even with key present", () => {
    process.env.COVERAGE_JUDGE = "off";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is 'OFF' (uppercase) even with key present", () => {
    process.env.COVERAGE_JUDGE = "OFF";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is ' off ' (surrounding whitespace) even with key present", () => {
    process.env.COVERAGE_JUDGE = " off ";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is ' false ' (surrounding whitespace) even with key present", () => {
    process.env.COVERAGE_JUDGE = " false ";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("returns false when COVERAGE_JUDGE is ' 0 ' (surrounding whitespace) even with key present", () => {
    process.env.COVERAGE_JUDGE = " 0 ";
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FAIL-SOFT KEY GATE: key absent or empty → false regardless of COVERAGE_JUDGE
// (NFR-OBS-01: LLM call must degrade to OFF on the hot path, never crash)
// ---------------------------------------------------------------------------

describe("isCoverageJudgeEnabled: degrades to OFF when ANTHROPIC_API_KEY absent (§2.1, NFR-OBS-01)", () => {
  it("flag unset, key unset → false (default-on blocked by missing key)", () => {
    delete process.env.COVERAGE_JUDGE;
    delete process.env.ANTHROPIC_API_KEY;
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("flag unset, key='' → false", () => {
    delete process.env.COVERAGE_JUDGE;
    process.env.ANTHROPIC_API_KEY = "";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("flag='1', key unset → false", () => {
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

  it("flag='maybe' (typo/default-on), key unset → false", () => {
    process.env.COVERAGE_JUDGE = "maybe";
    delete process.env.ANTHROPIC_API_KEY;
    expect(isCoverageJudgeEnabled()).toBe(false);
  });

  it("flag='maybe' (typo/default-on), key='' → false", () => {
    process.env.COVERAGE_JUDGE = "maybe";
    process.env.ANTHROPIC_API_KEY = "";
    expect(isCoverageJudgeEnabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NON-THROWING contract: must never throw under ANY input (NFR-OBS-01)
// ---------------------------------------------------------------------------

describe("isCoverageJudgeEnabled: non-throwing under all inputs (NFR-OBS-01)", () => {
  it("never throws regardless of env state", () => {
    const flagValues = ["1", "0", "true", "false", "on", "off", "ON", "TRUE", "", "garbage", "maybe", undefined];
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
    const flagValues = ["1", "true", "on", "0", "false", "off", "", "garbage", "maybe"];
    for (const flag of flagValues) {
      process.env.COVERAGE_JUDGE = flag;
      process.env.ANTHROPIC_API_KEY = "sk-test-key";
      const result = isCoverageJudgeEnabled();
      expect(typeof result).toBe("boolean");
    }
  });
});
