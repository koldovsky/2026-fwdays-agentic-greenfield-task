// Client call to the cover-letter export route (§4.6). POSTs the ExportDocument
// (carrying the coverLetter block) and returns the rendered PDF as a Blob; a
// non-ok response throws so the caller surfaces a calm failure (NFR-OBS-01). A
// 402 (server-side paywall, FR-PAYWALL-01) throws the same way — the widget maps
// it to the upgrade surface. Download mechanics live in the widget, not here.
import type { ExportDocument } from "@/entities/export-document";

export async function requestCoverLetter(doc: ExportDocument): Promise<Blob> {
  const response = await fetch("/api/export/cover-letter", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ document: doc }),
  });
  if (!response.ok) {
    throw new Error(`export_failed:cover-letter:${response.status}`);
  }
  return response.blob();
}
