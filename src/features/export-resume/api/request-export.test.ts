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

  // server-side-export-gate (T5 #8, BC-HONESTY-02): the optional tailoringId is
  // forwarded to the route so it can enforce the bullet-membership honesty gate.
  it("includes `tailoringId` in the body when supplied (server-side-export-gate, T5 #8)", async () => {
    const blob = new Blob(["pdf-bytes"]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(blob, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestExport(doc, "pdf", "t-1");

    expect(fetchMock).toHaveBeenCalledWith("/api/export/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ document: doc, tailoringId: "t-1" }),
    });
  });

  it("omits `tailoringId` from the body when NOT supplied (non-breaking fallback)", async () => {
    const blob = new Blob(["pdf-bytes"]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(blob, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestExport(doc, "docx");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sentBody).not.toHaveProperty("tailoringId");
    expect(sentBody).toEqual({ document: doc });
  });
});
