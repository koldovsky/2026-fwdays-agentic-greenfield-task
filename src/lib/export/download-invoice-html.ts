export class EmptyInvoiceHtmlError extends Error {
  constructor() {
    super("Invoice HTML is empty.");
    this.name = "EmptyInvoiceHtmlError";
  }
}

export function sanitizeInvoiceFilenameSegment(invoiceNumber: string): string {
  const sanitized = invoiceNumber
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "invoice";
}

export function buildInvoiceHtmlFilename(invoiceNumber: string): string {
  return `invoice-${sanitizeInvoiceFilenameSegment(invoiceNumber)}.html`;
}

export function downloadInvoiceHtml(html: string, invoiceNumber: string): void {
  if (html.trim().length === 0) {
    throw new EmptyInvoiceHtmlError();
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildInvoiceHtmlFilename(invoiceNumber);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
