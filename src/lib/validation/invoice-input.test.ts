import { describe, expect, it } from "vitest";

import {
  invoiceFormSchema,
  mergeShortFormatIntoForm,
  parseShortFormat,
  emptyInvoiceFormValues,
} from "./invoice-input";

// @trace FR-INPUT-04
describe("invoiceFormSchema", () => {
  const valid = emptyInvoiceFormValues();
  valid.customerName = "Acme Studio";
  valid.customerAddress = "10 Market St";
  valid.customerEmail = "billing@acme.example";
  valid.customerPhone = "+1 415 555 0100";
  valid.serviceText = "logo design";
  valid.naceEntryId = "graphic-design";
  valid.unitPriceInput = "650";

  it("accepts valid form values", () => {
    const result = invoiceFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects malformed email with example wording", () => {
    const result = invoiceFormSchema.safeParse({
      ...valid,
      customerEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(" ");
      expect(message).toContain("billing@client.example");
    }
  });

  it("rejects invalid phone", () => {
    const result = invoiceFormSchema.safeParse({
      ...valid,
      customerPhone: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported currency", () => {
    const result = invoiceFormSchema.safeParse({
      ...valid,
      currency: "UAH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid amount", () => {
    const result = invoiceFormSchema.safeParse({
      ...valid,
      unitPriceInput: "not-money",
    });
    expect(result.success).toBe(false);
  });

  it("rejects prepayment outside 0–100", () => {
    const result = invoiceFormSchema.safeParse({
      ...valid,
      prepaymentPercent: "150",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive quantity", () => {
    const result = invoiceFormSchema.safeParse({
      ...valid,
      quantity: "0",
    });
    expect(result.success).toBe(false);
  });
});

// @trace FR-INPUT-02
describe("parseShortFormat", () => {
  it("maps recognized keys to form fields", () => {
    const parsed = parseShortFormat(`client: Acme
addr: Market St
email: a@b.example
phone: +380 44 111 2222
web: acme.example
curr: EUR
service: video editing
qty: 3
amount: 1200
prepay: 50%
pay_days: 5
exec_days: 7`);

    expect(parsed.customerName).toBe("Acme");
    expect(parsed.customerAddress).toBe("Market St");
    expect(parsed.customerEmail).toBe("a@b.example");
    expect(parsed.currency).toBe("EUR");
    expect(parsed.prepaymentPercent).toBe("50");
    expect(parsed.executionDays).toBe("7");
  });

  it("ignores unknown keys", () => {
    const parsed = parseShortFormat(`unknown_key: value
client: Acme`);
    expect(parsed.customerName).toBe("Acme");
    expect(Object.keys(parsed)).toEqual(["customerName"]);
  });

  it("merges into existing form and clears client linkage on customer override", () => {
    const current = emptyInvoiceFormValues();
    current.clientId = "client-1";
    current.naceEntryId = "graphic-design";

    const merged = mergeShortFormatIntoForm(current, {
      customerName: "New Client",
      serviceText: "3d visualization",
    });

    expect(merged.clientId).toBe("");
    expect(merged.customerName).toBe("New Client");
    expect(merged.naceEntryId).toBe("");
    expect(merged.serviceText).toBe("3d visualization");
  });
});
