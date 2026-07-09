// Client call to the binary export routes (FR-EXPORT-02/03). POSTs the
// ExportDocument and returns the rendered file as a Blob; a non-ok response
// throws so the caller can surface a calm failure (NFR-OBS-01). The download
// mechanics (object URL + anchor) live in the widget, not here.
import type { ExportDocument } from "@/entities/export-document";

export type ExportFormat = "pdf" | "docx";

export async function requestExport(doc: ExportDocument, format: ExportFormat): Promise<Blob> {
  const response = await fetch(`/api/export/${format}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ document: doc }),
  });
  if (!response.ok) {
    throw new Error(`export_failed:${format}`);
  }
  return response.blob();
}
