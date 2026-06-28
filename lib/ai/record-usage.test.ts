// @trace FR-USAGE-01 TC-VALID-01 NFR-SEC-01
//
// RED tests for recordUsage — written BEFORE the implementation exists.
// Every test must fail (module not found) until lib/ai/record-usage.ts is
// created. Design authority: openspec/specs/usage-accounting/spec.md.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    usageRow: {
      create: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));

import { recordUsage } from "./record-usage";

describe("recordUsage", () => {
  beforeEach(() => {
    vi.mocked(db.usageRow.create).mockReset();
  });

  // -------------------------------------------------------------------------
  // Happy path — interview call
  // -------------------------------------------------------------------------

  it("persists one usage row for a valid interview call, including the computed costUsd", async () => {
    vi.mocked(db.usageRow.create).mockResolvedValue({} as never);

    await recordUsage({
      cycleId: "cycle-1",
      purpose: "interview",
      model: "claude-sonnet-4-6",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });

    expect(db.usageRow.create).toHaveBeenCalledTimes(1);
    const call = vi.mocked(db.usageRow.create).mock.calls[0][0];
    expect(call.data).toMatchObject({
      cycleId: "cycle-1",
      purpose: "interview",
      model: "claude-sonnet-4-6",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      // cost(sonnet-4-6, 1M, 1M) = (1*3) + (1*15) = 18 USD
      costUsd: 18,
    });
  });

  it("persists one usage row for a valid summary call", async () => {
    vi.mocked(db.usageRow.create).mockResolvedValue({} as never);

    await recordUsage({
      cycleId: "cycle-2",
      purpose: "summary",
      model: "claude-opus-4-8",
      inputTokens: 500_000,
      outputTokens: 100_000,
    });

    expect(db.usageRow.create).toHaveBeenCalledTimes(1);
    const call = vi.mocked(db.usageRow.create).mock.calls[0][0];
    expect(call.data).toMatchObject({
      cycleId: "cycle-2",
      purpose: "summary",
      model: "claude-opus-4-8",
      inputTokens: 500_000,
      outputTokens: 100_000,
      // cost(opus-4-8, 500k, 100k) = (0.5*5) + (0.1*25) = 2.5 + 2.5 = 5 USD
      costUsd: 5,
    });
  });

  // -------------------------------------------------------------------------
  // cachedInputTokens — optional field
  // -------------------------------------------------------------------------

  it("stores cachedInputTokens when provided", async () => {
    vi.mocked(db.usageRow.create).mockResolvedValue({} as never);

    await recordUsage({
      cycleId: "cycle-1",
      purpose: "interview",
      model: "claude-sonnet-4-6",
      inputTokens: 2_000,
      outputTokens: 500,
      cachedInputTokens: 1_500,
    });

    const call = vi.mocked(db.usageRow.create).mock.calls[0][0];
    expect(call.data.cachedInputTokens).toBe(1_500);
  });

  it("stores cachedInputTokens as null when not provided", async () => {
    vi.mocked(db.usageRow.create).mockResolvedValue({} as never);

    await recordUsage({
      cycleId: "cycle-1",
      purpose: "interview",
      model: "claude-sonnet-4-6",
      inputTokens: 2_000,
      outputTokens: 500,
    });

    const call = vi.mocked(db.usageRow.create).mock.calls[0][0];
    expect(call.data.cachedInputTokens).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Validation failures — rejected before any DB call
  // -------------------------------------------------------------------------

  it("throws and makes no DB call when inputTokens is negative", async () => {
    await expect(
      recordUsage({
        cycleId: "cycle-1",
        purpose: "interview",
        model: "claude-sonnet-4-6",
        inputTokens: -1,
        outputTokens: 500,
      }),
    ).rejects.toThrow();

    expect(db.usageRow.create).not.toHaveBeenCalled();
  });

  it("throws and makes no DB call when outputTokens is not an integer", async () => {
    await expect(
      recordUsage({
        cycleId: "cycle-1",
        purpose: "interview",
        model: "claude-sonnet-4-6",
        inputTokens: 1_000,
        outputTokens: 1.5,
      }),
    ).rejects.toThrow();

    expect(db.usageRow.create).not.toHaveBeenCalled();
  });

  it("throws and makes no DB call when purpose is not interview or summary", async () => {
    await expect(
      recordUsage({
        cycleId: "cycle-1",
        purpose: "other",
        model: "claude-sonnet-4-6",
        inputTokens: 1_000,
        outputTokens: 500,
      }),
    ).rejects.toThrow();

    expect(db.usageRow.create).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Unknown model — cost() throws UnknownModelError, no DB write
  // -------------------------------------------------------------------------

  it("throws UnknownModelError and makes no DB call when model is not in the price table", async () => {
    await expect(
      recordUsage({
        cycleId: "cycle-1",
        purpose: "interview",
        model: "claude-unknown-model-99",
        inputTokens: 1_000,
        outputTokens: 500,
      }),
    ).rejects.toThrow("claude-unknown-model-99");

    expect(db.usageRow.create).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // DB failure surfaces — not swallowed
  // -------------------------------------------------------------------------

  it("propagates the database error when db.usageRow.create rejects", async () => {
    vi.mocked(db.usageRow.create).mockRejectedValue(new Error("DB connection lost"));

    await expect(
      recordUsage({
        cycleId: "cycle-1",
        purpose: "summary",
        model: "claude-sonnet-4-6",
        inputTokens: 1_000,
        outputTokens: 500,
      }),
    ).rejects.toThrow("DB connection lost");
  });
});
