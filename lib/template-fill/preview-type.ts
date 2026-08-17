import type { DocType } from "../document-session/types";

export type PreviewType = "invoice" | "act";

export function isPreviewType(value: string | null): value is PreviewType {
  return value === "invoice" || value === "act";
}

/** Whether session doc-type includes the requested preview document. */
export function docTypeAllowsPreview(
  docType: DocType,
  type: PreviewType,
): boolean {
  if (type === "invoice") {
    return docType === "invoice" || docType === "invoice_act";
  }
  return docType === "act" || docType === "invoice_act";
}
