// Client call to the binary export routes (FR-EXPORT-02/03). POSTs the
// ExportDocument and returns the rendered file as a Blob; a non-ok response
// throws so the caller can surface a calm failure (NFR-OBS-01). The download
// mechanics (object URL + anchor) live in the widget, not here.
import type { ExportDocument } from "@/entities/export-document";

export type ExportFormat = "pdf" | "docx";

/**
 * @param tailoringId Optional persisted-tailoring id (server-side-export-gate,
 * T5 #8). When known (streamed as a `persisted` event during generation), it is
 * sent in the body so the route can enforce the server-side bullet-membership
 * honesty gate against the persisted bullets (BC-HONESTY-02). When absent the
 * route falls back to shape-only validation — additive, non-breaking.
 */
export async function requestExport(
  doc: ExportDocument,
  format: ExportFormat,
  tailoringId?: string,
): Promise<Blob> {
  const response = await fetch(`/api/export/${format}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      document: doc,
      ...(tailoringId !== undefined ? { tailoringId } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`export_failed:${format}`);
  }
  return response.blob();
}
