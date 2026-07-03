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
  it("anon 1, free 2, paid unlimited", () => {
    expect(tailoringLimit("anonymous")).toBe(ANON_TAILORING_LIMIT);
    expect(tailoringLimit("free")).toBe(FREE_TAILORING_LIMIT);
    expect(tailoringLimit("paid")).toBeNull();
  });
});

describe("remainingTailorings", () => {
  it("counts down and floors at zero", () => {
    expect(remainingTailorings(counter(0), "free")).toBe(2);
    expect(remainingTailorings(counter(2), "free")).toBe(0);
    expect(remainingTailorings(counter(5), "free")).toBe(0);
  });

  it("unlimited for paid", () => {
    expect(remainingTailorings(counter(99), "paid")).toBeNull();
  });
});

describe("canTailor", () => {
  it("anonymous gets exactly one", () => {
    expect(canTailor(counter(0), "anonymous")).toBe(true);
    expect(canTailor(counter(1), "anonymous")).toBe(false);
  });

  it("free gets two, then paywall", () => {
    expect(canTailor(counter(1), "free")).toBe(true);
    expect(canTailor(counter(2), "free")).toBe(false);
  });

  it("paid is never gated", () => {
    expect(canTailor(counter(1000), "paid")).toBe(true);
  });
});
