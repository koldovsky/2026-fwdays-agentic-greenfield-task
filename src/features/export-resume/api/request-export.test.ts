import { afterEach, describe, expect, it, vi } from "vitest";

import type { ExportDocument } from "@/entities/export-document";

import { requestExport } from "./request-export";

const doc: ExportDocument = { headline: "Tailored résumé", bullets: ["Led migration to TypeScript."] };

afterEach(() => vi.unstubAllGlobals());

describe("requestExport", () => {
  it("POSTs to /api/export/{format} with { document } as the body", async () => {
    const blob = new Blob(["pdf-bytes"]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(blob, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestExport(doc, "pdf");

    expect(fetchMock).toHaveBeenCalledWith("/api/export/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ document: doc }),
    });
  });

  it("returns response.blob() on an ok response", async () => {
    const blob = new Blob(["docx-bytes"]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(blob, { status: 200 })));

    const result = await requestExport(doc, "docx");

    expect(result).toBeInstanceOf(Blob);
    expect(await result.text()).toBe("docx-bytes");
  });

  it("throws on a non-ok response (NFR-OBS-01)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(requestExport(doc, "pdf")).rejects.toThrow("export_failed:pdf");
  });
});
