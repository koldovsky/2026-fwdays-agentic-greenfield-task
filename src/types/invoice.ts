import type { Cents } from "@/lib/invoice-calc/money";

/** Invoice settlement currency (FR-BANK-01); also drives IBAN selection. */
export type Currency = "USD" | "EUR";

/** Stored in browser; user-set manually */
export type StoredInvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

/** Includes derived overdue for UI display only */
export type InvoiceDisplayStatus = StoredInvoiceStatus | "overdue";

export interface LineItem {
  id: string;
  descriptionEn: string;
  descriptionUa: string;
  quantity: number;
  /** Integer minor units; line amount = unitPriceCents × quantity (FR-CALC-03). */
  unitPriceCents: Cents;
}

export interface Invoice {
  id: string;
  clientId: string;
  /**
   * Sequential `YYYY-NNN`, assigned on issue (`draft → sent`); drafts carry
   * no number and are addressed by `id` (FR-CALC-01).
   */
  number?: string;
  status: StoredInvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  lineItems: LineItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
