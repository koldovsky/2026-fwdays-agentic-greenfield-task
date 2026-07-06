import { describe, expect, it } from "vitest";

import { dictionaries, en, parseLocale, t, ua } from "./index";

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/u;

/** Flatten nested string values into path->string pairs for structural comparison. */
function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([k, v]) => flattenKeys(v, prefix ? `${prefix}.${k}` : k))
    .sort();
}

function flattenValues(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (obj === null || typeof obj !== "object") return [];
  return Object.values(obj as Record<string, unknown>).flatMap(flattenValues);
}

describe("i18n (NFR-I18N-01, BC-BRAND-01)", () => {
  it("ua and en have identical key sets (structural parity)", () => {
    expect(flattenKeys(ua)).toEqual(flattenKeys(en));
  });

  it("ua values contain no emoji and no exclamation points (BC-BRAND-01)", () => {
    for (const value of flattenValues(ua)) {
      expect(value).not.toMatch(EMOJI);
      expect(value).not.toContain("!");
    }
  });

  it("t() returns ua as the default fallback", () => {
    expect(t("ua")).toBe(ua);
    expect(t("en")).toBe(en);
    expect(dictionaries.ua).toBe(ua);
  });

  it("parseLocale coerces cookie values Ukrainian-first (add-language-toggle)", () => {
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("ua")).toBe("ua");
    // Anything unrecognized falls back to Ukrainian (default), never throws.
    expect(parseLocale(undefined)).toBe("ua");
    expect(parseLocale(null)).toBe("ua");
    expect(parseLocale("")).toBe("ua");
    expect(parseLocale("fr")).toBe("ua");
    expect(parseLocale("EN")).toBe("ua");
  });
});

// Task 4.4 — upgrade.planFeature + billing.planBenefits parity + brand audit
// (NFR-I18N-01, BC-BRAND-01, BC-HONESTY-01, TC-PURE-01)
const EM_DASH = /—/;
const EXCLAMATION = /!/;

const PAID_PLANS = ["pro", "ultra", "job_hunt_pass"] as const;
type PaidPlan = (typeof PAID_PLANS)[number];

// Expected benefit counts per plan, per spec (task 4.4).
const EXPECTED_PLAN_FEATURE_LENGTHS: Record<PaidPlan, number> = {
  pro: 5,
  ultra: 6,
  job_hunt_pass: 3,
};

const EXPECTED_PLAN_BENEFITS_LENGTHS: Record<PaidPlan, number> = {
  pro: 5,
  ultra: 6,
  job_hunt_pass: 3,
};

describe("upgrade.planFeature parity (task 4.4, NFR-I18N-01)", () => {
  it("ua and en have identical plan keys for upgrade.planFeature", () => {
    expect(Object.keys(ua.upgrade.planFeature).sort()).toEqual(
      Object.keys(en.upgrade.planFeature).sort(),
    );
  });

  for (const plan of PAID_PLANS) {
    it(`upgrade.planFeature[${plan}] array lengths match between ua and en`, () => {
      expect(ua.upgrade.planFeature[plan]).toHaveLength(en.upgrade.planFeature[plan].length);
    });

    it(`upgrade.planFeature[${plan}] has the expected length (${String(EXPECTED_PLAN_FEATURE_LENGTHS[plan])})`, () => {
      expect(en.upgrade.planFeature[plan]).toHaveLength(EXPECTED_PLAN_FEATURE_LENGTHS[plan]);
      expect(ua.upgrade.planFeature[plan]).toHaveLength(EXPECTED_PLAN_FEATURE_LENGTHS[plan]);
    });
  }
});

describe("billing.planBenefits parity (task 4.4, NFR-I18N-01)", () => {
  it("ua and en have identical plan keys for billing.planBenefits", () => {
    expect(Object.keys(ua.billing.planBenefits).sort()).toEqual(
      Object.keys(en.billing.planBenefits).sort(),
    );
  });

  for (const plan of PAID_PLANS) {
    it(`billing.planBenefits[${plan}] array lengths match between ua and en`, () => {
      expect(ua.billing.planBenefits[plan]).toHaveLength(en.billing.planBenefits[plan].length);
    });

    it(`billing.planBenefits[${plan}] has the expected length (${String(EXPECTED_PLAN_BENEFITS_LENGTHS[plan])})`, () => {
      expect(en.billing.planBenefits[plan]).toHaveLength(EXPECTED_PLAN_BENEFITS_LENGTHS[plan]);
      expect(ua.billing.planBenefits[plan]).toHaveLength(EXPECTED_PLAN_BENEFITS_LENGTHS[plan]);
    });
  }
});

describe("checkout.planName and checkout.planPrice contain 'ultra' (task 4.4)", () => {
  it("checkout.planName has an 'ultra' key in en", () => {
    expect("ultra" in en.checkout.planName).toBe(true);
    expect(typeof en.checkout.planName.ultra).toBe("string");
  });

  it("checkout.planName has an 'ultra' key in ua", () => {
    expect("ultra" in ua.checkout.planName).toBe(true);
    expect(typeof ua.checkout.planName.ultra).toBe("string");
  });

  it("checkout.planPrice has an 'ultra' key in en", () => {
    expect("ultra" in en.checkout.planPrice).toBe(true);
    expect(typeof en.checkout.planPrice.ultra).toBe("string");
  });

  it("checkout.planPrice has an 'ultra' key in ua", () => {
    expect("ultra" in ua.checkout.planPrice).toBe(true);
    expect(typeof ua.checkout.planPrice.ultra).toBe("string");
  });
});

describe("benefit strings — brand audit (task 4.4, BC-BRAND-01)", () => {
  function allBenefitStrings(locale: typeof en): string[] {
    return [
      ...Object.values(locale.upgrade.planFeature).flat(),
      ...Object.values(locale.billing.planBenefits).flat(),
    ];
  }

  it("en benefit strings contain no emoji (BC-BRAND-01)", () => {
    for (const s of allBenefitStrings(en)) {
      expect(s).not.toMatch(EMOJI);
    }
  });

  it("ua benefit strings contain no emoji (BC-BRAND-01)", () => {
    for (const s of allBenefitStrings(ua)) {
      expect(s).not.toMatch(EMOJI);
    }
  });

  it("en benefit strings contain no exclamation points (BC-BRAND-01)", () => {
    for (const s of allBenefitStrings(en)) {
      expect(s).not.toMatch(EXCLAMATION);
    }
  });

  it("ua benefit strings contain no exclamation points (BC-BRAND-01)", () => {
    for (const s of allBenefitStrings(ua)) {
      expect(s).not.toMatch(EXCLAMATION);
    }
  });

  it("en benefit strings contain no em-dashes (BC-BRAND-01)", () => {
    for (const s of allBenefitStrings(en)) {
      expect(s).not.toMatch(EM_DASH);
    }
  });

  it("ua benefit strings contain no em-dashes (BC-BRAND-01)", () => {
    for (const s of allBenefitStrings(ua)) {
      expect(s).not.toMatch(EM_DASH);
    }
  });

  it("ultra unbuilt features carry a coming-soon label in en", () => {
    const ultraFeatures = en.upgrade.planFeature.ultra;
    const comingSoon = ultraFeatures.filter((f) => f.includes("coming soon"));
    expect(comingSoon.length).toBeGreaterThanOrEqual(1);
  });

  it("ultra unbuilt features carry a coming-soon label in ua", () => {
    const ultraFeatures = ua.upgrade.planFeature.ultra;
    const comingSoon = ultraFeatures.filter((f) => f.includes("незабаром"));
    expect(comingSoon.length).toBeGreaterThanOrEqual(1);
  });
});
