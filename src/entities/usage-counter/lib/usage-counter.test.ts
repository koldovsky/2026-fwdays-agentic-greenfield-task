import { describe, expect, it } from "vitest";
import type { UsageCounter } from "../model/types";
import {
  ANON_TAILORING_LIMIT,
  FREE_TAILORING_LIMIT,
  canTailor,
  remainingTailorings,
  tailoringLimit,
} from "./usage-counter";

const counter = (tailoringsUsed: number): UsageCounter => ({ userId: "u1", tailoringsUsed });

describe("tailoringLimit", () => {
  // FREE_TAILORING_LIMIT === 1 (user decision 2026-07-09, revises FR-ONBOARD-01).
  // Previously 2; the revised spec gives free accounts exactly one lifetime run.
  it("free limit is exactly 1 (revised FR-ONBOARD-01)", () => {
    expect(FREE_TAILORING_LIMIT).toBe(1);
  });

  it("anon limit is 1, free limit is 1, paid is unlimited", () => {
    expect(tailoringLimit("anonymous")).toBe(ANON_TAILORING_LIMIT);
    expect(tailoringLimit("free")).toBe(FREE_TAILORING_LIMIT);
    expect(tailoringLimit("paid")).toBeNull();
  });
});

describe("remainingTailorings", () => {
  // Revised contract: free gets 1, not 2.
  it("counts down from 1 and floors at zero for free", () => {
    expect(remainingTailorings(counter(0), "free")).toBe(1);
    expect(remainingTailorings(counter(1), "free")).toBe(0);
    expect(remainingTailorings(counter(5), "free")).toBe(0);
  });

  it("unlimited for paid", () => {
    expect(remainingTailorings(counter(99), "paid")).toBeNull();
  });
});

describe("canTailor", () => {
  it("anonymous gets exactly one run", () => {
    expect(canTailor(counter(0), "anonymous")).toBe(true);
    expect(canTailor(counter(1), "anonymous")).toBe(false);
  });

  // Revised: free now gets 1, not 2. tailoringsUsed=0 → true; tailoringsUsed=1 → false.
  it("free gets exactly one run, then paywall (revised FR-ONBOARD-01)", () => {
    expect(canTailor(counter(0), "free")).toBe(true);
    expect(canTailor(counter(1), "free")).toBe(false);
  });

  it("free with tailoringsUsed > 1 stays false (floor at zero, never negative remaining)", () => {
    expect(canTailor(counter(2), "free")).toBe(false);
    expect(canTailor(counter(100), "free")).toBe(false);
  });

  it("paid is never gated regardless of usage", () => {
    expect(canTailor(counter(0), "paid")).toBe(true);
    expect(canTailor(counter(1000), "paid")).toBe(true);
  });
});
