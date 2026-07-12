import { centsFromInput } from "@/lib/invoice-calc/money";
import { isValidationError } from "@/lib/invoice-calc/validation";
import type { NaceEntry } from "@/lib/nace/types";
import { buildPaymentTermsText } from "@/lib/invoices/build-payment-terms-text";
import type { RenderInvoiceInput } from "@/lib/render/render-invoice";
import type { ParsedInvoiceFormValues } from "@/lib/validation/invoice-input";
import type { Client } from "@/types/client";
import type { LineItem } from "@/types/invoice";
import type { SupplierProfile } from "@/types/supplier";

export const PREVIEW_INVOICE_NUMBER = "PREVIEW";

function derivePlace(supplier: SupplierProfile): { en: string; ua: string } {
  return {
    en: supplier.addressEn.trim(),
    ua: supplier.addressUa.trim(),
  };
}

function deriveSignatory(supplier: SupplierProfile): { en: string; ua: string } {
  const enPrimary = supplier.nameEn.split(",")[0]?.trim() ?? supplier.nameEn;
  const uaPrimary = supplier.nameUa.replace(/^ФОП\s+/iu, "").trim();
  return {
    en: enPrimary,
    ua: uaPrimary,
  };
}

function formValuesToClient(values: ParsedInvoiceFormValues): Client {
  const timestamp = new Date().toISOString();
  return {
    id: values.clientId || "preview-client",
    name: values.customerName,
    address: values.customerAddress,
    email: values.customerEmail,
    phone: values.customerPhone,
    website: values.customerWebsite,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildLineItem(
  values: ParsedInvoiceFormValues,
  naceEntry: NaceEntry
): LineItem {
  const unitPriceResult = centsFromInput(values.unitPriceInput);
  if (isValidationError(unitPriceResult)) {
    throw new Error(unitPriceResult.reason);
  }

  return {
    id: "preview-line-1",
    descriptionEn: naceEntry.lineTextEn,
    descriptionUa: naceEntry.lineTextUa,
    quantity: values.quantityNumber,
    unitPriceCents: unitPriceResult,
  };
}

export function formToRenderInput(
  values: ParsedInvoiceFormValues,
  ctx: {
    supplier: SupplierProfile;
    naceEntry: NaceEntry;
  }
): RenderInvoiceInput {
  const paymentTerms = buildPaymentTermsText({
    prepaymentPercent: values.prepaymentPercentNumber,
    paymentDays: values.paymentDaysNumber,
    executionDays: values.executionDaysNumber,
  });

  return {
    invoiceNumber: PREVIEW_INVOICE_NUMBER,
    issueDate: values.issueDate,
    currency: values.currency,
    lineItems: [buildLineItem(values, ctx.naceEntry)],
    supplier: ctx.supplier,
    client: formValuesToClient(values),
    place: derivePlace(ctx.supplier),
    signatory: deriveSignatory(ctx.supplier),
    paymentTerms,
    prepaymentPercent: values.prepaymentPercentNumber,
    projectName: values.projectName.trim() || undefined,
  };
}
