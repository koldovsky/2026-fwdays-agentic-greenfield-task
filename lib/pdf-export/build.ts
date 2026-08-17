import type { DocumentSession } from "../document-session/types";
import {
  docTypeAllowsPreview,
  fillActHtml,
  fillInvoiceHtml,
  type PreviewType,
} from "../template-fill";
import { renderHtmlToPdf } from "./render";

export class PdfTypeNotAllowedError extends Error {
  constructor(docType: string, type: PreviewType) {
    super(`Document type ${docType} does not include ${type}`);
    this.name = "PdfTypeNotAllowedError";
  }
}

/**
 * Fill template HTML for the session + type, then render to A4 PDF.
 * Rejects when `doc-type` does not include the requested document.
 */
export async function buildPdf(
  session: DocumentSession,
  type: PreviewType,
): Promise<Buffer> {
  if (!docTypeAllowsPreview(session["doc-type"], type)) {
    throw new PdfTypeNotAllowedError(session["doc-type"], type);
  }

  const html =
    type === "invoice"
      ? await fillInvoiceHtml(session)
      : await fillActHtml(session);

  return renderHtmlToPdf(html);
}

export async function buildInvoicePdf(
  session: DocumentSession,
): Promise<Buffer> {
  return buildPdf(session, "invoice");
}

export async function buildActPdf(session: DocumentSession): Promise<Buffer> {
  return buildPdf(session, "act");
}
