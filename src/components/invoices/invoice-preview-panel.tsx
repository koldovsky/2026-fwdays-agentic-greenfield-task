"use client";

import { useCallback, useRef } from "react";

import { InvoiceExportActions } from "@/components/invoices/invoice-export-actions";
import { printInvoiceFrame } from "@/lib/export/print-invoice-html";

type InvoicePreviewPanelProps = {
  html: string | null;
  invoiceNumber: string | null;
  isPending?: boolean;
  exportDisabled?: boolean;
  exportDisabledReason?: string;
};

export function InvoicePreviewPanel({
  html,
  invoiceNumber,
  isPending = false,
  exportDisabled = false,
  exportDisabledReason,
}: InvoicePreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }
    printInvoiceFrame(iframe);
  }, []);

  return (
    <section
      aria-label="Попередній перегляд рахунку"
      tabIndex={0}
      className="wf-panel flex min-h-[480px] flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-wf-text-1">Попередній перегляд</h2>
          <p className="mt-0.5 text-xs text-wf-text-2">
            Оновлюється автоматично після заповнення форми
          </p>
        </div>
        <InvoiceExportActions
          html={html}
          invoiceNumber={invoiceNumber}
          disabled={exportDisabled}
          disabledReason={exportDisabledReason}
          onPrint={handlePrint}
        />
      </div>

      <div className="relative flex-1 bg-wf-surface-2 p-2">
        {isPending ? (
          <p className="absolute inset-0 z-10 flex items-center justify-center bg-wf-surface-2/80 text-sm text-wf-text-2">
            Оновлення попереднього перегляду…
          </p>
        ) : null}

        {!html ? (
          <p className="flex h-full min-h-[420px] items-center justify-center px-4 text-center text-sm text-wf-text-2">
            Заповніть обов&apos;язкові поля та оберіть послугу, щоб побачити
            рахунок.
          </p>
        ) : (
          <iframe
            ref={iframeRef}
            title="Попередній перегляд рахунку"
            className="h-full min-h-[420px] w-full rounded-md border border-border bg-white"
            srcDoc={html}
            sandbox="allow-same-origin allow-modals"
          />
        )}
      </div>
    </section>
  );
}
