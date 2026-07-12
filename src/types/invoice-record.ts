export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

export const INVOICE_STATUSES: readonly InvoiceStatus[] = [
  "draft",
  "sent",
  "paid",
  "cancelled",
];

/**
 * A snapshot of every field printed on the invoice document, captured at issue
 * time. Structural on purpose (FR-REG-03): the register stores a frozen value,
 * not a live reference into the supplier/client directories.
 */
export type InvoiceSnapshot = {
  supplier: Record<string, string>;
  customer: Record<string, string>;
  serviceRows: ReadonlyArray<Record<string, string | number>>;
  totals: Record<string, number>;
  termsText: { en: string; ua: string };
};

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDateIso: string;
  paymentDeadlineIso: string;
  snapshot: InvoiceSnapshot;
  createdAt: string;
  updatedAt: string;
};

/** Fields a caller supplies when issuing an invoice; the store assigns id/timestamps. */
export type InvoiceRecordInput = {
  id?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDateIso: string;
  paymentDeadlineIso: string;
  snapshot: InvoiceSnapshot;
};
