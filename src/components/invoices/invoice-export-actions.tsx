"use client";

import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { downloadInvoiceHtml } from "@/lib/export/download-invoice-html";

type InvoiceExportActionsProps = {
  html: string | null;
  invoiceNumber: string | null;
  disabled?: boolean;
  disabledReason?: string;
  onPrint?: () => void;
};

export function InvoiceExportActions({
  html,
  invoiceNumber,
  disabled = false,
  disabledReason,
  onPrint,
}: InvoiceExportActionsProps) {
  const isDisabled = disabled || !html || !invoiceNumber;
  const title = isDisabled ? disabledReason : undefined;

  const handleDownload = () => {
    if (!html || !invoiceNumber) {
      return;
    }
    downloadInvoiceHtml(html, invoiceNumber);
  };

  const handlePrint = () => {
    if (!html || !onPrint) {
      return;
    }
    onPrint();
  };

  return (
    <div className="flex flex-wrap items-center gap-2" title={title}>
      <Button
        type="button"
        variant="outline"
        disabled={isDisabled}
        onClick={handleDownload}
      >
        <Download data-icon="inline-start" />
        Завантажити HTML
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isDisabled}
        onClick={handlePrint}
      >
        <Printer data-icon="inline-start" />
        Друкувати
      </Button>
    </div>
  );
}
