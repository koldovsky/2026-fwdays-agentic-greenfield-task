import { describe, expect, it } from "vitest";
import type { Subscription } from "../model/types";
import { isFree, isSubscriptionActive } from "./subscription";

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

describe("isFree", () => {
  it("true for free, false for paid", () => {
    expect(isFree({ ...pro, plan: "free" })).toBe(true);
    expect(isFree(pro)).toBe(false);
    expect(isFree({ ...pro, plan: "job_hunt_pass" })).toBe(false);
  });
});
