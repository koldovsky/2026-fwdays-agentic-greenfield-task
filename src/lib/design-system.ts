import type { InvoiceDisplayStatus } from "@/types/invoice";

/** WEG3D Fin design system — shared constants and mappings */

export const INVOICE_STATUS_LABELS: Record<InvoiceDisplayStatus, string> = {
  draft: "Чернетка",
  sent: "Надіслано",
  paid: "Оплачено",
  overdue: "Прострочено",
  cancelled: "Скасовано",
};

export const INVOICE_STATUS_BADGE_VARIANT: Record<
  InvoiceDisplayStatus,
  "draft" | "sent" | "paid" | "overdue" | "destructive"
> = {
  draft: "draft",
  sent: "sent",
  paid: "paid",
  overdue: "overdue",
  cancelled: "destructive",
};

export const INVOICE_STATUS_DOT_COLOR: Record<InvoiceDisplayStatus, string> = {
  draft: "bg-wf-text-3",
  sent: "bg-wf-accent",
  paid: "bg-wf-success",
  overdue: "bg-wf-danger",
  cancelled: "bg-wf-danger",
};
