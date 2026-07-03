import { describe, expect, it } from "vitest";
import type { Subscription } from "../model/types";
import { hasPaidAccess, isFree, isSubscriptionActive } from "./subscription";

const now = "2026-07-02T12:00:00.000Z";
const pro: Subscription = {
  id: "s1",
  userId: "u1",
  plan: "pro",
  status: "active",
  currentPeriodEnd: "2026-08-02T12:00:00.000Z",
};

describe("isSubscriptionActive", () => {
  it("true for active paid plan within period", () => {
    expect(isSubscriptionActive(pro, now)).toBe(true);
  });

  it("false once the period has lapsed", () => {
    expect(isSubscriptionActive({ ...pro, currentPeriodEnd: "2026-06-01T00:00:00.000Z" }, now)).toBe(
      false,
    );
  });

  it("false when canceled even if period remains", () => {
    expect(isSubscriptionActive({ ...pro, status: "canceled" }, now)).toBe(false);
  });

  it("false for the free plan", () => {
    expect(isSubscriptionActive({ ...pro, plan: "free", currentPeriodEnd: null }, now)).toBe(false);
  });

  it("active with no period end (open-ended paid access)", () => {
    expect(isSubscriptionActive({ ...pro, currentPeriodEnd: null }, now)).toBe(true);
  });
});

describe("hasPaidAccess (FR-PAYWALL-01 gate, FR-BILLING-02 semantics)", () => {
  it("true for an active paid plan within the period", () => {
    expect(hasPaidAccess(pro, now)).toBe(true);
  });

  it("true while canceled but before period end — downgrade happens at period END", () => {
    expect(hasPaidAccess({ ...pro, status: "canceled" }, now)).toBe(true);
  });

  it("false once a canceled subscription's period lapses (FR-BILLING-02)", () => {
    expect(
      hasPaidAccess(
        { ...pro, status: "canceled", currentPeriodEnd: "2026-06-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
  });

  it("false for null (never paid), free plan, expired, or a lapsed active period", () => {
    expect(hasPaidAccess(null, now)).toBe(false);
    expect(hasPaidAccess({ ...pro, plan: "free", currentPeriodEnd: null }, now)).toBe(false);
    expect(hasPaidAccess({ ...pro, status: "expired" }, now)).toBe(false);
    expect(hasPaidAccess({ ...pro, currentPeriodEnd: "2026-06-01T00:00:00.000Z" }, now)).toBe(
      false,
    );
  });

  it("false for canceled with no period end — no defined period left to run out", () => {
    expect(hasPaidAccess({ ...pro, status: "canceled", currentPeriodEnd: null }, now)).toBe(false);
  });

  it("true for an open-ended active paid plan (no period end)", () => {
    expect(hasPaidAccess({ ...pro, currentPeriodEnd: null }, now)).toBe(true);
  });
});

describe("isFree", () => {
  it("true for free, false for paid", () => {
    expect(isFree({ ...pro, plan: "free" })).toBe(true);
    expect(isFree(pro)).toBe(false);
    expect(isFree({ ...pro, plan: "job_hunt_pass" })).toBe(false);
  });
});
