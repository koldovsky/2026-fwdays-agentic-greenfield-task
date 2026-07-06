// Synthetic invoice derivation (task 3.1, FR-BILLING-01): deterministic, and
// history survives cancellation/lapse (FR-BILLING-02 — downgrade never erases
// what was paid).
import { describe, expect, it } from "vitest";
import { deriveInvoices } from "./invoices";

describe("deriveInvoices", () => {
  it("derives one paid invoice per granted period for Pro", () => {
    expect(
      deriveInvoices({
        plan: "pro",
        status: "active",
        currentPeriodEnd: "2026-08-01T12:00:00.000Z",
      }),
    ).toEqual([
      {
        id: "inv-0001",
        issuedAt: "2026-07-02T12:00:00.000Z",
        plan: "pro",
        amountUsd: 12,
      },
    ]);
  });

  it("prices the Job-hunt Pass at its one-time amount ($20, corrected from 19)", () => {
    const [invoice] = deriveInvoices({
      plan: "job_hunt_pass",
      status: "active",
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    });
    expect(invoice.plan).toBe("job_hunt_pass");
    // Task 3.3: corrected from 19 to 20 (rework-subscription-plans).
    expect(invoice.amountUsd).toBe(20);
  });

  // Task 3.3 — ultra invoice amount + per-plan issuedAt (FR-BILLING-01)
  it("prices Ultra at $30 and computes issuedAt 30 days before currentPeriodEnd", () => {
    const result = deriveInvoices({
      plan: "ultra",
      status: "active",
      currentPeriodEnd: "2026-08-01T12:00:00.000Z",
    });

    expect(result).toHaveLength(1);
    expect(result[0].plan).toBe("ultra");
    expect(result[0].amountUsd).toBe(30);
    // issuedAt = 2026-08-01T12:00:00.000Z minus 30 days = 2026-07-02T12:00:00.000Z
    expect(result[0].issuedAt).toBe("2026-07-02T12:00:00.000Z");
  });

  it("prices Job-hunt Pass at $20 (corrected from 19) and computes issuedAt 14 days before currentPeriodEnd", () => {
    const result = deriveInvoices({
      plan: "job_hunt_pass",
      status: "active",
      currentPeriodEnd: "2026-07-17T00:00:00.000Z",
    });

    expect(result).toHaveLength(1);
    expect(result[0].plan).toBe("job_hunt_pass");
    expect(result[0].amountUsd).toBe(20);
    // issuedAt = 2026-07-17 minus 14 days = 2026-07-03T00:00:00.000Z
    expect(result[0].issuedAt).toBe("2026-07-03T00:00:00.000Z");
  });

  it("ultra invoice remains visible after cancellation (FR-BILLING-02)", () => {
    const result = deriveInvoices({
      plan: "ultra",
      status: "canceled",
      currentPeriodEnd: "2026-06-01T00:00:00.000Z",
    });
    expect(result).toHaveLength(1);
    expect(result[0].amountUsd).toBe(30);
  });

  it("keeps the invoice visible after cancellation or lapse (FR-BILLING-02)", () => {
    expect(
      deriveInvoices({
        plan: "pro",
        status: "canceled",
        currentPeriodEnd: "2020-01-31T00:00:00.000Z",
      }),
    ).toHaveLength(1);
  });

  it("returns nothing for Free, null, or a row without a period", () => {
    expect(deriveInvoices(null)).toEqual([]);
    expect(deriveInvoices({ plan: "free", status: "active", currentPeriodEnd: null })).toEqual([]);
    expect(deriveInvoices({ plan: "pro", status: "active", currentPeriodEnd: null })).toEqual([]);
    expect(
      deriveInvoices({ plan: "pro", status: "active", currentPeriodEnd: "not-a-date" }),
    ).toEqual([]);
  });
});
