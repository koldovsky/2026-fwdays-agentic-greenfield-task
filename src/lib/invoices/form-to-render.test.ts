import { describe, expect, it } from "vitest";

import { MissingIbanError } from "@/lib/banking/supplier-block";
import { formToRenderInput } from "@/lib/invoices/form-to-render";
import { naceCatalog } from "@/lib/nace/catalog";
import { renderInvoice } from "@/lib/render/render-invoice";
import { parseInvoiceFormValues } from "@/lib/validation/invoice-input";
import type { Client } from "@/types/client";
import type { SupplierProfile } from "@/types/supplier";

const PLACEHOLDER_PATTERN = /\{\{[A-Z0-9_]+\}\}/g;

const SUPPLIER: SupplierProfile = {
  id: "profile-1",
  label: "Основний",
  nameEn: "Taras Shevchenko, Private Entrepreneur",
  nameUa: "ФОП Шевченко Тарас Григорович",
  addressEn: "1 Khreshchatyk St, Kyiv, 01001, Ukraine",
  addressUa: "вул. Хрещатик, 1, Київ, 01001, Україна",
  taxId: "1234567890",
  bankName: "JSC Universal Bank",
  swift: "UNJSUAUKXXX",
  ibanUsd: "UA003996220000000000000000001",
  ibanEur: "UA003996220000000000000000002",
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:00:00.000Z",
};

const CLIENT: Client = {
  id: "client-1",
  name: "Acme Studio",
  address: "10 Market St, San Francisco, CA 94103, USA",
  email: "billing@acme.example",
  phone: "+1 415 555 0100",
  website: "acme.example",
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:00:00.000Z",
};

function parsedFormValues() {
  const parsed = parseInvoiceFormValues({
    clientId: CLIENT.id,
    customerName: CLIENT.name,
    customerAddress: CLIENT.address,
    customerEmail: CLIENT.email,
    customerPhone: CLIENT.phone,
    customerWebsite: CLIENT.website,
    currency: "USD",
    serviceText: "logo design",
    naceEntryId: naceCatalog[0]?.id ?? "",
    quantity: "2",
    unitPriceInput: "5525",
    prepaymentPercent: "50",
    paymentDays: "3",
    executionDays: "14",
    projectName: "",
    issueDate: "2026-05-03",
  });

  if (parsed instanceof Error) {
    throw parsed;
  }
  return parsed;
}

describe("formToRenderInput", () => {
  // Deliberately untraced. This asserts only that no {{TOKEN}} survives — a
  // template-completeness property, not FR-INPUT-01. It would still pass if a
  // required input field were dropped or hardcoded. See docs/qa/trace-gaps.md.
  it("renders HTML without surviving placeholders", () => {
    const naceEntry = naceCatalog.find((entry) => entry.id === "graphic-design");
    expect(naceEntry).toBeDefined();
    if (!naceEntry) {
      return;
    }

    const input = formToRenderInput(parsedFormValues(), {
      supplier: SUPPLIER,
      naceEntry,
    });
    const html = renderInvoice(input);
    expect(html.match(PLACEHOLDER_PATTERN)).toBeNull();
  });

  it("propagates MissingIbanError for missing currency IBAN", () => {
    const naceEntry = naceCatalog[0];
    expect(naceEntry).toBeDefined();
    if (!naceEntry) {
      return;
    }

    const supplierWithoutEur: SupplierProfile = {
      ...SUPPLIER,
      ibanEur: "",
    };
    const values = parsedFormValues();
    values.currency = "EUR";

    const input = formToRenderInput(values, {
      supplier: supplierWithoutEur,
      naceEntry,
    });

    expect(() => renderInvoice(input)).toThrow(MissingIbanError);
  });
});
