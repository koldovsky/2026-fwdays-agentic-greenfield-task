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

  it("prices the Job-hunt Pass at its one-time amount", () => {
    const [invoice] = deriveInvoices({
      plan: "job_hunt_pass",
      status: "active",
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    });
    expect(invoice.plan).toBe("job_hunt_pass");
    expect(invoice.amountUsd).toBe(19);
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
